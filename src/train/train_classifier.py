# -*- coding: utf-8 -*-
import argparse, json, math, os, random, time
from datetime import datetime
from pathlib import Path
from typing import Dict, List

import torch
import torch.nn as nn
import timm
from torch.utils.data import DataLoader, Subset, WeightedRandomSampler
from torchvision import datasets, transforms

# -----------------------------
# 경로 정책
# -----------------------------
TRAIN_DIR = Path(__file__).parent.resolve()
CKPT_DIR = TRAIN_DIR / "checkpoints"        # ckpt.best.pt, ckpt.last.pt
LABELS_DIR = TRAIN_DIR / "labels"           # species.labels.json, disease.labels.json
SPLIT_DIR = TRAIN_DIR / "splits"            # 분할 인덱스
HISTORY_DIR = TRAIN_DIR / "histories"       # 학습 이력 json

for d in [CKPT_DIR, LABELS_DIR, SPLIT_DIR, HISTORY_DIR]:
    d.mkdir(parents=True, exist_ok=True)

class _SkipZZImageFolder(datasets.ImageFolder):
    def find_classes(self, directory: str):
        classes = [
            d.name for d in os.scandir(directory)
            if d.is_dir() and not d.name.lower().startswith("zz")
        ]
        classes.sort()
        class_to_idx = {cls_name: i for i, cls_name in enumerate(classes)}
        return classes, class_to_idx

# -----------------------------
# Utils
# -----------------------------
def set_seed(seed: int = 42):
    random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.use_deterministic_algorithms(False)

def default_transforms(img_size: int):
    mean = [0.485, 0.456, 0.406]
    std  = [0.229, 0.224, 0.225]
    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(img_size, scale=(0.3, 1.0), ratio=(0.75, 1.33)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomPerspective(distortion_scale=0.15, p=0.2),
        transforms.RandomAffine(
            degrees=15, translate=(0.1, 0.1), scale=(0.9, 1.1), shear=10
        ),
        transforms.RandomApply([
            transforms.ColorJitter(0.25, 0.25, 0.25, 0.1),
        ], p=0.6),
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
        transforms.RandomErasing(p=0.2, scale=(0.02, 0.2), ratio=(0.3, 3.3)),
    ])
    val_tf = transforms.Compose([
        transforms.Resize(int(img_size * 1.1)),
        transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
    ])
    return train_tf, val_tf, mean, std

def stratified_split_by_index(targets: List[int], val_ratio: float, seed: int = 42):
    random.seed(seed)
    by_class: Dict[int, List[int]] = {}
    for idx, y in enumerate(targets):
        by_class.setdefault(int(y), []).append(idx)
    train_ids, val_ids = [], []
    for _, idxs in by_class.items():
        random.shuffle(idxs)
        n_val = max(1, int(round(len(idxs) * val_ratio)))
        val_ids.extend(idxs[:n_val])
        train_ids.extend(idxs[n_val:])
    random.shuffle(train_ids)
    random.shuffle(val_ids)
    return train_ids, val_ids

def detect_task_from_data_path(data_path: Path) -> str:
    name = data_path.name.lower()
    if "plant" in name:
        return "species"
    if "leave" in name or "disease" in name:
        return "disease"
    parent = data_path.parent.name.lower()
    if "plant" in parent:
        return "species"
    if "leave" in parent or "disease" in parent:
        return "disease"
    return "species"

def save_label_map_json(class_to_idx: Dict[str, int], task: str) -> Path:
    """labels/{task}.labels.json으로 저장"""
    idx_to_name = {int(v): k for k, v in class_to_idx.items()}
    out = LABELS_DIR / f"{task}.labels.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(idx_to_name, f, ensure_ascii=False, indent=2)
    return out

def accuracy_top1(logits: torch.Tensor, y: torch.Tensor) -> float:
    pred = logits.argmax(dim=1)
    return (pred == y).float().mean().item()

def epoch_loop(model, loader, criterion, optimizer, scaler, device, train=True):
    model.train(train)
    total_loss, total_acc, n = 0.0, 0.0, 0
    for x, y in loader:
        x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
        with torch.cuda.amp.autocast(enabled=scaler is not None):
            logits = model(x)
            loss = criterion(logits, y)
        if train:
            optimizer.zero_grad(set_to_none=True)
            if scaler is not None:
                scaler.scale(loss).backward()
                scaler.step(optimizer)
                scaler.update()
            else:
                loss.backward()
                optimizer.step()
        acc = accuracy_top1(logits, y)
        bs = x.size(0)
        total_loss += loss.item() * bs
        total_acc  += acc * bs
        n += bs
    return total_loss / n, total_acc / n

def save_checkpoint(model, arch, class_to_idx, img_size, mean, std,
                    hparams, history, best_val, ckpt_dir: Path, is_best: bool, use_morphology: bool = False):
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    payload = {
        "arch": arch,
        "state_dict": model.state_dict(),
        "num_classes": len(class_to_idx),
        "class_to_idx": class_to_idx,
        "idx_to_class": {int(v): k for k, v in class_to_idx.items()},
        "img_size": img_size,
        "normalization": {"mean": mean, "std": std},
        "hparams": hparams,
        "history": history,
        "best_val_acc": best_val,
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "is_best": is_best,
        "use_morphology": use_morphology,
    }
    tag = ".best" if is_best else ".last"
    ckpt_name = "ckpt_mp.pt" if use_morphology else "ckpt.pt"
    torch.save(payload, str((ckpt_dir / ckpt_name).with_suffix(".pt" + tag)))

# -----------------------------
# Main
# -----------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, help="폴더 구조: class 폴더별 이미지 (train)")
    ap.add_argument("--val-data", type=str, default=None, help="별도 validation 데이터 경로 (지정 안 하면 --data에서 자동 split)")
    ap.add_argument("--arch", default="efficientnet_b0")
    ap.add_argument("--img-size", type=int, default=224)
    ap.add_argument("--epochs", type=int, default=50)
    ap.add_argument("--batch-size", type=int, default=64)
    ap.add_argument("--lr", type=float, default=3e-4)
    ap.add_argument("--weight-decay", type=float, default=5e-2)
    ap.add_argument("--val-ratio", type=float, default=0.2)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--patience", type=int, default=5)
    ap.add_argument("--num-workers", type=int, default=4)
    ap.add_argument("--no-pretrained", action="store_true")
    ap.add_argument("--use-morphology", action="store_true", help="병충해 모델 학습 시 morphology 전처리 적용")
    ap.add_argument("--resume", type=str, default=None, help="체크포인트 경로 (fine-tuning용)")
    ap.add_argument("--output-suffix", type=str, default="", help="체크포인트 폴더 이름에 suffix 추가 (예: _finetuned)")
    ap.add_argument("--weighted-sampling", action="store_true", help="plants_aug 샘플에 더 높은 가중치 부여 (mixed training용)")
    ap.add_argument("--aug-weight", type=float, default=2.0, help="plants_aug 샘플 가중치 (기본: 2.0)")
    args = ap.parse_args()

    set_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    data_root = Path(args.data).resolve()
    task = detect_task_from_data_path(data_root)  # "species" | "disease"

    # Datasets
    train_tf, val_tf, mean, std = default_transforms(args.img_size)
    DS = _SkipZZImageFolder if task == "species" else datasets.ImageFolder

    if args.val_data:
        # Separate train and validation datasets
        print(f"[INFO] Using separate validation data: {args.val_data}")
        val_data_root = Path(args.val_data).resolve()

        # Train: use all data from --data
        train_ds = DS(data_root, transform=train_tf)
        class_to_idx = train_ds.class_to_idx

        # Val: use all data from --val-data
        val_ds = DS(val_data_root, transform=val_tf)

        # No split indices (using separate datasets)
        train_ids = None
        val_ids = None

        print(f"[INFO] Train: {len(train_ds)} images from {data_root.name}")
        print(f"[INFO] Val: {len(val_ds)} images from {val_data_root.name}")
    else:
        # Original behavior: auto split from --data
        base_ds = DS(data_root)
        class_to_idx = base_ds.class_to_idx
        train_ids, val_ids = stratified_split_by_index(base_ds.targets, args.val_ratio, seed=args.seed)

        train_ds = Subset(DS(data_root, transform=train_tf), train_ids)
        val_ds   = Subset(DS(data_root, transform=val_tf),   val_ids)

        print(f"[INFO] Auto split: {len(train_ids)} train, {len(val_ids)} val")

    # Weighted sampling for mixed training (plants + plants_aug)
    train_sampler = None
    shuffle = True
    if args.weighted_sampling:
        print(f"[INFO] Weighted sampling enabled: aug_weight={args.aug_weight}")
        weights = []

        # Get image paths from dataset
        if hasattr(train_ds, 'samples'):
            # Direct ImageFolder
            samples = train_ds.samples
        elif hasattr(train_ds, 'dataset') and hasattr(train_ds.dataset, 'samples'):
            # Subset of ImageFolder
            samples = [train_ds.dataset.samples[i] for i in train_ds.indices]
        else:
            raise ValueError("Cannot extract samples from train_ds for weighted sampling")

        # Assign weights based on filename prefix
        for img_path, _ in samples:
            filename = Path(img_path).name
            if filename.startswith('aug_'):
                weights.append(args.aug_weight)
            else:
                weights.append(1.0)

        # Count weighted samples
        num_aug = sum(1 for w in weights if w == args.aug_weight)
        num_plants = len(weights) - num_aug
        print(f"[INFO] Sample counts: {num_plants} plants (weight=1.0), {num_aug} aug (weight={args.aug_weight})")

        train_sampler = WeightedRandomSampler(weights, len(weights), replacement=True)
        shuffle = False  # sampler handles shuffling

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=shuffle,
                              sampler=train_sampler, num_workers=args.num_workers, pin_memory=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False,
                            num_workers=args.num_workers, pin_memory=True)

    # Model
    num_classes = len(class_to_idx)
    model = timm.create_model(
        args.arch, pretrained=(not args.no_pretrained), num_classes=num_classes
    ).to(device)

    # Load checkpoint for fine-tuning
    if args.resume:
        print(f"[INFO] Loading checkpoint from: {args.resume}")
        ckpt_path = Path(args.resume)
        if not ckpt_path.exists():
            raise FileNotFoundError(f"Checkpoint not found: {ckpt_path}")

        ckpt = torch.load(str(ckpt_path), map_location=device)

        # Check architecture match
        if ckpt["arch"] != args.arch:
            print(f"[WARNING] Architecture mismatch: ckpt={ckpt['arch']}, args={args.arch}")

        # Check num_classes match
        if ckpt["num_classes"] != num_classes:
            print(f"[WARNING] num_classes mismatch: ckpt={ckpt['num_classes']}, current={num_classes}")
            print("[INFO] Loading weights except classifier head (fine-tuning mode)")
            # Load all except classifier
            state_dict = ckpt["state_dict"]
            model_dict = model.state_dict()
            # Filter out classifier weights
            pretrained_dict = {k: v for k, v in state_dict.items()
                             if k in model_dict and v.shape == model_dict[k].shape}
            model_dict.update(pretrained_dict)
            model.load_state_dict(model_dict)
            print(f"[INFO] Loaded {len(pretrained_dict)}/{len(state_dict)} layers")
        else:
            # Load full state dict
            model.load_state_dict(ckpt["state_dict"])
            print(f"[INFO] Loaded checkpoint successfully (best_val_acc: {ckpt.get('best_val_acc', 'N/A')})")

        print("[INFO] Fine-tuning mode enabled")

    # Optim/Loss/Sched
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    total_steps = math.ceil(len(train_loader) * args.epochs)
    warmup_steps = max(1, len(train_loader))
    def lr_lambda(step):
        if step < warmup_steps:
            return float(step + 1) / warmup_steps
        progress = (step - warmup_steps) / max(1, total_steps - warmup_steps)
        return 0.5 * (1 + math.cos(math.pi * progress))
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=args.epochs
    )
    scaler = torch.cuda.amp.GradScaler() if device.type == "cuda" else None

    # output path
    arch_name = args.arch + args.output_suffix
    ckpt_dir = (CKPT_DIR / task / arch_name)
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    split_path = SPLIT_DIR / f"{task}_{arch_name}.split.json"
    history_path = HISTORY_DIR / f"{task}_{arch_name}.history.json"

    # Train
    best_val = -1.0
    epochs_no_improve = 0
    history = []
    start = time.time()

    hparams = {
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "lr": args.lr,
        "weight_decay": args.weight_decay,
        "val_ratio": args.val_ratio,
        "label_smoothing": 0.1,
        "optimizer": "AdamW",
        "scheduler": "Cosine(warmup=1epoch)",
        "seed": args.seed,
        "pretrained": not args.no_pretrained,
        "arch": args.arch,
        "task": task,
        "use_morphology": args.use_morphology,
        "weighted_sampling": args.weighted_sampling,
        "aug_weight": args.aug_weight if args.weighted_sampling else None,
    }

    for epoch in range(1, args.epochs + 1):
        tr_loss, tr_acc = epoch_loop(model, train_loader, criterion, optimizer, scaler, device, train=True)
        va_loss, va_acc = epoch_loop(model, val_loader,   criterion, optimizer, scaler, device, train=False)
        scheduler.step()

        history.append({"epoch": epoch, "train_loss": tr_loss, "train_acc": tr_acc,
                        "val_loss": va_loss, "val_acc": va_acc, "lr": scheduler.get_last_lr()[0]})
        print(f"[{epoch:02d}/{args.epochs}] "
              f"train {tr_loss:.4f}/{tr_acc:.4f} | "
              f"val {va_loss:.4f}/{va_acc:.4f} | lr {scheduler.get_last_lr()[0]:.2e}")

        if va_acc > best_val:
            best_val = va_acc
            epochs_no_improve = 0
            save_checkpoint(model, args.arch, class_to_idx, args.img_size, mean, std,
                            hparams, history, best_val, ckpt_dir, is_best=True, use_morphology=args.use_morphology)
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= args.patience:
                print(f"Early stopping at epoch {epoch}. Best val acc={best_val:.4f}")
                break

    # checkpoint 저장
    save_checkpoint(model, args.arch, class_to_idx, args.img_size, mean, std,
                    hparams, history, best_val, ckpt_dir, is_best=False, use_morphology=args.use_morphology)

    # label 저장
    map_path = save_label_map_json(class_to_idx, task=task)

    # split 저장
    with open(split_path, "w", encoding="utf-8") as f:
        split_info = {
            "seed": args.seed,
            "val_ratio": args.val_ratio,
            "n_classes": num_classes,
        }
        if train_ids is not None:
            split_info["train_indices"] = train_ids
            split_info["val_indices"] = val_ids
        else:
            split_info["note"] = "Using separate validation dataset (--val-data)"
            split_info["train_data"] = str(args.data)
            split_info["val_data"] = str(args.val_data)
        json.dump(split_info, f, indent=2)

    # history 저장
    with open(history_path, "w", encoding="utf-8") as f:
        json.dump({
            "hparams": hparams,
            "history": history,
            "best_val_acc": best_val,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        }, f, indent=2)

    print(
        f"Done in {(time.time()-start)/60:.1f} min | "
        f"best={best_val:.4f} | "
        f"ckpt_dir={ckpt_dir} | "
        f"labels={map_path} | "
        f"split={split_path} | "
        f"history={history_path}"
    )

if __name__ == "__main__":
    main()