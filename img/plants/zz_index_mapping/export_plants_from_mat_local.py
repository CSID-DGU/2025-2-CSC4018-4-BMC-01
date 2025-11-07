# export_plants_from_mat_local.py
import argparse, csv, os, shutil, json
from pathlib import Path
import numpy as np
from scipy.io import loadmat

def load_labels(mat_path: Path) -> np.ndarray:
    m = loadmat(mat_path.as_posix(), squeeze_me=True, struct_as_record=False)
    if "labels" not in m:
        raise RuntimeError(f"'labels' not found in {mat_path}")
    y = np.array(m["labels"]).astype(int).ravel()
    if y.min() < 1:
        raise RuntimeError("labels must be 1-based integers")
    return y

def load_split(mat_path: Path, n_imgs: int) -> np.ndarray:
    m = loadmat(mat_path.as_posix(), squeeze_me=True, struct_as_record=False)
    split = np.array(["unknown"] * n_imgs)
    def mark(key, tag):
        if key in m:
            idx = np.array(m[key]).astype(int).ravel() - 1
            idx = idx[(idx >= 0) & (idx < n_imgs)]
            split[idx] = tag
    for k in ("trnid","train"): mark(k, "train")
    for k in ("valid","val"):   mark(k, "val")
    for k in ("tstid","test"):  mark(k, "test")
    return split

def read_class_names(k: int, classes_path: Path | None) -> list[str]:
    if classes_path and classes_path.exists():
        names = [ln.strip() for ln in classes_path.read_text(encoding="utf-8").splitlines() if ln.strip()]
        if len(names) != k:
            raise RuntimeError(f"class names {len(names)} != K {k}")
        return names
    return [f"class_{i:03d}" for i in range(1, k + 1)]

def materialize(rows: list[dict], out_root: Path):
    out_root.mkdir(parents=True, exist_ok=True)
    can_hardlink = True
    try:
        os.link(rows[0]["abs_path"], out_root / "__probe.tmp")
        (out_root / "__probe.tmp").unlink()
    except Exception:
        can_hardlink = False
    for r in rows:
        d = out_root / r["class_name"]
        d.mkdir(parents=True, exist_ok=True)
        dst = d / r["filename"]
        if dst.exists():
            stem, ext = dst.stem, dst.suffix
            i = 1
            while dst.exists():
                dst = d / f"{stem}__{i}{ext}"
                i += 1
        if can_hardlink:
            try:
                os.link(r["abs_path"], dst); continue
            except Exception:
                pass
        shutil.copy2(r["abs_path"], dst)

def main():
    ap = argparse.ArgumentParser(description="Load MAT labels -> CSV/JSON, optional class folders")
    ap.add_argument("--imgdir", default=".", help="이미지 폴더(기본: 현재 폴더)")
    ap.add_argument("--labels_mat", default="../imagelabels.mat")
    ap.add_argument("--setid_mat", default="../setid.mat")
    ap.add_argument("--classes", default=None, help="줄당 1개의 클래스명 파일")
    ap.add_argument("--csv", default="../index_mapping.csv")
    ap.add_argument("--json", default="../index_mapping.json")
    ap.add_argument("--materialize", action="store_true", help="클래스별 가시화 폴더 생성")
    ap.add_argument("--outdir", default="../plants_by_class")
    args = ap.parse_args()

    img_dir = Path(args.imgdir).resolve()
    imgs = sorted(img_dir.glob("image_*.jpg")) or sorted(img_dir.glob("*.jpg"))
    if not imgs:
        raise SystemExit(f"[error] no images in {img_dir}")

    labels = load_labels(Path(args.labels_mat).resolve())
    n = min(len(imgs), len(labels))
    if len(imgs) != len(labels):
        print(f"[warn] images({len(imgs)}) != labels({len(labels)}); using {n}")
    imgs, labels = imgs[:n], labels[:n]
    K = int(labels.max())

    setid_path = Path(args.setid_mat).resolve()
    split = load_split(setid_path, n) if setid_path.exists() else np.array(["unknown"] * n)

    class_names = read_class_names(K, Path(args.classes) if args.classes else None)

    rows = []
    for i, (p, cid) in enumerate(zip(imgs, labels), start=1):
        rows.append(dict(
            idx=i,
            filename=p.name,
            abs_path=str(p),
            class_id=int(cid),
            class_name=class_names[cid - 1],
            split=str(split[i-1])
        ))

    # 저장
    csv_path = Path(args.csv).resolve()
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    json_path = Path(args.json).resolve()
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[ok] saved: {csv_path}")
    print(f"[ok] saved: {json_path}")

    if args.materialize:
        out_root = Path(args.outdir).resolve()
        materialize(rows, out_root)
        print(f"[ok] materialized: {out_root}")

if __name__ == "__main__":
    main()