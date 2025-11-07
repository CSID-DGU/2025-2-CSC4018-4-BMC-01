# index_mapping.py
# 사용:
#   python index_mapping.py                                # ../index_mapping.json → ../plants_by_class_from_index
#   python index_mapping.py --out ../plants_by_class
#   python index_mapping.py --split train                  # train/val/test만 선택

import argparse, json, shutil, sys, re
from pathlib import Path

def sanitize(name: str) -> str:
    return re.sub(r"[^\w]+", "_", str(name)).strip("_") or "unknown"

def load_records(json_path: Path) -> list[dict]:
    if not json_path.exists():
        raise SystemExit(f"[error] JSON not found: {json_path}")
    data = json.loads(json_path.read_text(encoding="utf-8"))
    if not isinstance(data, list) or not data:
        raise SystemExit(f"[error] invalid or empty JSON: {json_path}")
    need = {"filename", "common_name"}
    if not need.issubset(set(data[0].keys())):
        raise SystemExit(f"[error] JSON missing keys {need} in: {json_path}")
    return data

def main():
    ap = argparse.ArgumentParser(description="Materialize folders by common_name from index_mapping.json")
    ap.add_argument("--json", default="../index_mapping.json", help="index_mapping.json 경로")
    ap.add_argument("--out", default="../plants_by_class_from_index", help="출력 루트")
    ap.add_argument("--split", choices=["all","train","val","test"], default="all", help="특정 split만")
    args = ap.parse_args()

    cwd = Path(".").resolve()
    json_path = Path(args.json).resolve()
    out_root = Path(args.out).resolve()
    rows = load_records(json_path)

    # split 필터
    if args.split != "all":
        rows = [r for r in rows if str(r.get("split", "unknown")) == args.split]
        if not rows:
            print(f"[info] no rows for split={args.split}")
            sys.exit(0)

    created = 0
    for r in rows:
        # 소스 경로: abs_path 있으면 사용, 없으면 현재 폴더+filename
        apath = r.get("abs_path")
        src = Path(apath) if apath else (cwd / r["filename"])
        if not src.exists():
            print(f"[warn] missing file: {src}", file=sys.stderr)
            continue

        dst_dir = out_root / sanitize(r["common_name"])
        dst_dir.mkdir(parents=True, exist_ok=True)
        dst = dst_dir / src.name
        # 파일명 충돌 회피
        if dst.exists():
            stem, ext = dst.stem, dst.suffix
            i = 1
            while dst.exists():
                dst = dst_dir / f"{stem}__{i}{ext}"
                i += 1

        try:
            shutil.copy2(src, dst)   # 항상 복사
            created += 1
        except Exception as e:
            print(f"[warn] skip {src} -> {dst} ({e})", file=sys.stderr)

    print(f"[ok] materialized: {created} files -> {out_root} (folders = common_name, mode=copy)")

if __name__ == "__main__":
    main()