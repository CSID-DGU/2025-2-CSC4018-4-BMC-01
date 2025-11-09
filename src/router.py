# src/router.py
from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys

# 파이프라인: README 구조 기준
# - 경로 ①: pot_species.py (종 분류)
# - 경로 ②: leaf_disease.py (모폴로지 → 병충해)
#   옵션: 모폴로지 생략 후 바로 disease 모델 호출
from src.pipelines.pot_species import run_infer as run_species
from src.pipelines.leaf_disease import run_infer as run_leaf_disease
from src.models.disease import infer as run_disease_direct  # 모폴로지 생략 우회용
from src.data.image import to_disease

def choose_route(image_path: Path, force: str | None = None) -> str:
    """
    규칙:
      - 파일명에 'plant' 있으면 'species'
      - 파일명에 'leaf' 있으면 'disease'
    force 인자가 있으면 강제 적용
    """
    if force:
        force = force.lower()
        if force not in {"species", "disease"}:
            raise ValueError("force must be one of {'species','disease'}")
        return force

    name = image_path.stem.lower()
    if "plant" in name and "leaf" not in name:
        return "species"
    if "leaf" in name and "plant" not in name:
        return "disease"

    raise ValueError(
        "파일명에 'plant' 또는 'leaf' 키워드가 없습니다. "
    )

def route(image_path: Path, *, skip_morph: bool = False, force: str | None = None) -> dict:
    """
    skip_morph=True: 개발자용. 잎사귀 경로에서 모폴로지 단계를 건너뛰고
                     disease 모델로 바로 추론.
    force: 'species' 또는 'disease'로 강제 라우팅.
    파이프라인의 JSON 결과(dict) 반환.
    """
    pipeline = choose_route(image_path, force=force)

    if pipeline == "species":
        return run_species(str(image_path))

    if skip_morph:
        def _call(img, meta):
            return run_disease_direct(img, meta)
        return to_disease(str(image_path), next_fn=_call)
    return run_leaf_disease(str(image_path))

def main(argv=None):
    p = argparse.ArgumentParser(description="Filename-based router for plant/leaf images")
    p.add_argument("image", type=str, help="입력 이미지 경로")
    p.add_argument("--out", type=str, default="outputs", help="JSON 저장 폴더")
    p.add_argument("--force", type=str, choices=["species", "disease"], help="파일명 규칙 무시 강제 라우팅")
    p.add_argument("--skip-morph", action="store_true", help="잎사귀 경로에서 모폴로지 단계를 생략하고 disease 모델로 바로 추론")
    args = p.parse_args(argv)

    img = Path(args.image)
    if not img.exists():
        print(f"입력 이미지 없음: {img}", file=sys.stderr)
        sys.exit(2)

    result = route(img, skip_morph=args.skip_morph, force=args.force)

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    # 출력 파일명: 입력명 + '.json'
    out_path = out_dir / (img.stem + ".json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(str(out_path))

if __name__ == "__main__":
    main()