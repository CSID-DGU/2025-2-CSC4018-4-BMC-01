# rename_images_by_rule.py
import argparse, re, hashlib
from pathlib import Path

VALID_EXT = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"}
# 대상: image (n).ext  (대소문자 무시, 공백 허용)
TARGET_RE = re.compile(r"^image\s*\((\d+)\)\.[A-Za-z0-9]+$", re.IGNORECASE)

def sanitize(s: str) -> str:
    return re.sub(r"[^\w]+", "_", s).strip("_")

def sha1_8(p: Path) -> str:
    h = hashlib.sha1()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1<<20), b""):
            h.update(chunk)
    return h.hexdigest()[:8]

def current_max_idx(label_dir: Path, label: str) -> int:
    # 이미 리네이밍된 파일이 있으면 번호 이어붙이기
    pat = re.compile(rf"^{re.escape(label)}__([0-9]{{5}})__[0-9a-fA-F]{{8}}\.[A-Za-z0-9]+$")
    mx = 0
    for p in label_dir.iterdir():
        if not p.is_file(): 
            continue
        m = pat.match(p.name)
        if m:
            mx = max(mx, int(m.group(1)))
    return mx

def main():
    ap = argparse.ArgumentParser(description="image (n) 형식만 리네이밍")
    ap.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parent,
        help="라벨 폴더들이 있는 루트(기본값: 스크립트 위치)"
    )
    ap.add_argument("--dryrun", action="store_true", help="미리보기")
    args = ap.parse_args()

    root = args.root.resolve()
    print(f"[info] root = {root}")

    for label_dir in sorted([d for d in root.iterdir() if d.is_dir()]):
        label = sanitize(label_dir.name)
        idx = current_max_idx(label_dir, label)

        for img in sorted(label_dir.iterdir()):
            if not img.is_file():
                continue
            if img.suffix.lower() not in VALID_EXT:
                continue

            # 대상 파일만 처리: image (n).ext
            if not TARGET_RE.match(img.name):
                continue

            idx += 1
            h8 = sha1_8(img)
            new_name = f"{label}__{idx:05d}__{h8}{img.suffix.lower()}"
            dst = img.with_name(new_name)

            # 우발 충돌 방어
            while dst.exists():
                idx += 1
                new_name = f"{label}__{idx:05d}__{h8}{img.suffix.lower()}"
                dst = img.with_name(new_name)

            if args.dryrun:
                print(f"[DRY] {img} -> {dst.name}")
            else:
                img.rename(dst)

if __name__ == "__main__":
    main()