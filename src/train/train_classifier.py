# -*- coding: utf-8 -*-
import argparse, json, math, os, random, time
from datetime import datetime
from pathlib import Path
from typing import Dict, List

import torch
import torch.nn as nn
import timm
from torch.utils.data import DataLoader, Subset
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
        transforms.RandomResizedCrop(img_size, scale=(0.2, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomPerspective(distortion_scale=0.2, p=0.2),
        transforms.RandomAffine(
            degrees=15, translate=(0.1, 0.1), scale=(0.85, 1.15), shear=10
        ),
        transforms.ColorJitter(0.3, 0.3, 0.3, 0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
        transforms.RandomErasing(p=0.25, scale=(0.02, 0.2), ratio=(0.3, 3.3)),
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
                    hparams, history, best_val, ckpt_dir: Path, is_best: bool):
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
    }
    tag = ".best" if is_best else ".last"
    torch.save(payload, str((ckpt_dir / "ckpt.pt").with_suffix(".pt" + tag)))

# -----------------------------
# Main
# -----------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, help="폴더 구조: class 폴더별 이미지")
    ap.add_argument("--arch", default="efficientnet_b0")
    ap.add_argument("--img-size", type=int, default=224)
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--batch-size", type=int, default=32)
    ap.add_argument("--lr", type=float, default=3e-4)
    ap.add_argument("--weight-decay", type=float, default=5e-2)
    ap.add_argument("--val-ratio", type=float, default=0.2)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--patience", type=int, default=5)
    ap.add_argument("--num-workers", type=int, default=4)
    ap.add_argument("--no-pretrained", action="store_true")
    args = ap.parse_args()

    set_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    data_root = Path(args.data).resolve()
    task = detect_task_from_data_path(data_root)  # "species" | "disease"

    # Datasets
    train_tf, val_tf, mean, std = default_transforms(args.img_size)
    DS = _SkipZZImageFolder if task == "species" else datasets.ImageFolder
    base_ds = DS(data_root)
    class_to_idx = base_ds.class_to_idx
    train_ids, val_ids = stratified_split_by_index(base_ds.targets, args.val_ratio, seed=args.seed)

    train_ds = Subset(DS(data_root, transform=train_tf), train_ids)
    val_ds   = Subset(DS(data_root, transform=val_tf),   val_ids)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True,
                              num_workers=args.num_workers, pin_memory=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False,
                            num_workers=args.num_workers, pin_memory=True)

    # Model
    num_classes = len(class_to_idx)
    model = timm.create_model(
        args.arch, pretrained=(not args.no_pretrained), num_classes=num_classes
    ).to(device)

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
    ckpt_dir = (CKPT_DIR / task / args.arch)
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    split_path = SPLIT_DIR / f"{task}_{args.arch}.split.json"
    history_path = HISTORY_DIR / f"{task}_{args.arch}.history.json"

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
                            hparams, history, best_val, ckpt_dir, is_best=True)
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= args.patience:
                print(f"Early stopping at epoch {epoch}. Best val acc={best_val:.4f}")
                break

    # checkpoint 저장
    save_checkpoint(model, args.arch, class_to_idx, args.img_size, mean, std,
                    hparams, history, best_val, ckpt_dir, is_best=False)

    # label 저장
    map_path = save_label_map_json(class_to_idx, task=task)

    # split 저장
    with open(split_path, "w", encoding="utf-8") as f:
        json.dump({
            "seed": args.seed,
            "val_ratio": args.val_ratio,
            "train_indices": train_ids,
            "val_indices": val_ids,
            "n_classes": num_classes,
        }, f, indent=2)

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