# src/router.py
from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
import sys
from typing import Any, Dict, Iterable, List, Optional

from src.models.species import run_species
from src.models.disease import run_disease_direct
from src.data.image import to_species, to_disease
from src.config_loader import load_config

# -----------------------------
# Config validation
# -----------------------------

REQUIRED_KEYS = [
    ("app", "default_route"),
    ("app", "skip_morphology"),
    ("io", "input_extensions"),
    ("io", "outputs_dir"),
    ("logging", "level"),
    ("logging", "fmt"),
    ("router", "rules"),
]

def _validate_config(cfg: Dict[str, Any]) -> None:
    """config 스키마 및 값 검증"""
    def _need(path):
        cur = cfg
        for k in path:
            if not isinstance(cur, dict) or k not in cur:
                dotted = ".".join(path)
                raise KeyError(f"config 누락: {dotted}")
            cur = cur[k]
        return cur

    for path in REQUIRED_KEYS:
        _need(path)

    dr = cfg["app"]["default_route"]
    if dr not in (None, "species", "disease"):
        raise ValueError("app.default_route는 None | 'species' | 'disease' 중 하나여야 함")
    if not isinstance(cfg["app"]["skip_morphology"], bool):
        raise TypeError("app.skip_morphology는 bool")

    rules = cfg["router"]["rules"]
    if not isinstance(rules, list):
        raise TypeError("router.rules는 리스트여야 함")
    for i, r in enumerate(rules):
        if not isinstance(r, dict) or "contains" not in r or "route" not in r:
            raise ValueError(f"router.rules[{i}]는 {{contains, route}} 필수")
        if r["route"] not in ("species", "disease"):
            raise ValueError(f"router.rules[{i}].route는 'species' | 'disease'")

def _setup_logging(cfg: Dict[str, Any]) -> None:
    level = getattr(logging, str(cfg["logging"]["level"]).upper(), logging.INFO)
    logging.basicConfig(level=level, format=cfg["logging"]["fmt"])

# -----------------------------
# Routing
# -----------------------------

def _match_by_rules(name_lower: str, rules: Iterable[Dict[str, str]]) -> Optional[str]:
    # rules: [{contains: "leaf", route: "disease"}, ...]
    for r in rules or []:
        key = str(r.get("contains") or "").lower()
        rt = r.get("route")
        if key and rt and key in name_lower:
            return rt
    return None

def choose_route(image_path: Path, cfg: Dict[str, Any], force: Optional[str] = None) -> str:
    """
    1) CLI --force 우선
    2) config.router.rules contains 규칙
    3) fallback: 파일명에 plant/leaf 포함 여부
    4) 최종 fallback: config.app.default_route (없으면 에러)
    """
    if force:
        force = force.lower()
        if force not in {"species", "disease"}:
            raise ValueError("force must be one of {'species','disease'}")
        return force

    name = image_path.stem.lower()

    # router.rules 우선 적용
    rt = _match_by_rules(name, (cfg.get("router") or {}).get("rules") or [])
    if rt in {"species", "disease"}:
        return rt

    # 파일명 기반 추론
    has_plant = "plant" in name
    has_leaf = "leaf" in name

    if has_plant and not has_leaf:
        return "species"
    if has_leaf and not has_plant:
        return "disease"

    # 파일명으로 판단 불가 시 default_route 사용
    default_route = cfg.get("app", {}).get("default_route")
    if default_route in {"species", "disease"}:
        return str(default_route)

    raise ValueError(
        f"라우팅 실패: 파일명에 'plant' 또는 'leaf' 키워드가 없고 default_route도 미설정. "
        f"파일명: {image_path.name}"
    )

def _validate_extension(path: Path, cfg: Dict[str, Any]) -> None:
    allowed = [s.lower() for s in (cfg.get("io", {}).get("input_extensions") or [])]
    if allowed:
        if path.suffix.lower() not in allowed:
            logging.getLogger(__name__).warning(
                "허용 확장자 목록(%s)에 없음: %s", ", ".join(allowed), path.suffix
            )

def route(image_path: Path, *, cfg: Dict[str, Any], skip_morph: Optional[bool] = None, force: Optional[str] = None, save_preprocessed_path: Optional[str] = None) -> Dict:
    """
    skip_morph:
      - True/False 명시 시 그대로 사용
      - None이면 config.app.skip_morphology 적용
    """
    pipeline = choose_route(image_path, cfg, force=force)

    if skip_morph is None:
        skip_morph = bool(cfg.get("app", {}).get("skip_morphology", False))

    if pipeline == "species":
        def _call(img, meta):
            return run_species(img, meta)
        return to_species(str(image_path), next_fn=_call, save_preprocessed_path=save_preprocessed_path)

    # Disease pipeline without segmentation
    if skip_morph:
        def _call(img, meta):
            return run_disease_direct(img, meta)
        return to_disease(str(image_path), next_fn=_call, save_preprocessed_path=save_preprocessed_path)

    # Morphology 파이프라인 활성화
    from src.data.morphology import run_after_morphology_stage

    def _call(img, meta):
        def _disease_fn(processed_img, processed_meta):
            return run_disease_direct(processed_img, processed_meta)
        return run_after_morphology_stage(img, meta, next_fn=_disease_fn)

    return to_disease(str(image_path), next_fn=_call, save_preprocessed_path=save_preprocessed_path)

# -----------------------------
# Batch Inference
# -----------------------------

def batch_inference(input_dir: Path, cfg: Dict[str, Any], out_dir: Path, force: Optional[str] = None, skip_morph: Optional[bool] = None) -> Dict[str, Any]:
    """
    폴더 내 모든 이미지에 대해 배치 추론 수행

    Returns:
        summary: {
            "total": 전체 이미지 수,
            "success": 성공한 추론 수,
            "failed": 실패한 추론 수,
            "results": [{"image": "...", "prediction": "...", "confidence": ...}, ...]
        }
    """
    log = logging.getLogger("router.batch")

    # 이미지 파일 찾기
    extensions = cfg.get("io", {}).get("input_extensions", [".jpg", ".jpeg", ".png"])
    images = []
    for ext in extensions:
        images.extend(input_dir.glob(f"**/*{ext}"))
        images.extend(input_dir.glob(f"**/*{ext.upper()}"))

    images = sorted(set(images))
    log.info(f"배치 추론 시작: {len(images)}개 이미지")

    if not images:
        print(f"Warning: {input_dir}에서 이미지를 찾을 수 없습니다.")
        return {"total": 0, "success": 0, "failed": 0, "results": []}

    # 출력 디렉토리 생성
    out_dir.mkdir(parents=True, exist_ok=True)

    # 배치 추론
    results = []
    success_count = 0
    failed_count = 0

    for i, img_path in enumerate(images, 1):
        try:
            # 전처리 이미지 저장 경로 설정 (배치 추론 시에만)
            preprocessed_path = str(out_dir / (img_path.stem + "_preprocessed.png"))

            # 추론
            result = route(img_path, cfg=cfg, skip_morph=skip_morph, force=force, save_preprocessed_path=preprocessed_path)

            # 결과 저장
            out_path = out_dir / (img_path.stem + ".json")
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

            # 입력 이미지 복사
            import shutil
            img_out_path = out_dir / img_path.name
            shutil.copy2(img_path, img_out_path)

            # Summary 정보 수집
            pred_info = {
                "image": str(img_path.relative_to(input_dir)),
                "prediction": result.get("pred_label", "unknown"),
                "confidence": result.get("confidence", 0.0),
                "output": str(out_path)
            }

            # Ground truth 추출 (폴더명이 클래스명이면)
            if img_path.parent != input_dir:
                pred_info["ground_truth"] = img_path.parent.name
                pred_info["correct"] = (pred_info["ground_truth"].lower() == pred_info["prediction"].lower())

            results.append(pred_info)
            success_count += 1

            # 진행 상황 출력
            if i % 10 == 0 or i == len(images):
                print(f"진행: {i}/{len(images)} ({success_count} 성공, {failed_count} 실패)")

        except Exception as e:
            log.error(f"추론 실패: {img_path} - {e}")
            results.append({
                "image": str(img_path.relative_to(input_dir)),
                "error": str(e)
            })
            failed_count += 1

    # Summary 생성
    summary = {
        "total": len(images),
        "success": success_count,
        "failed": failed_count,
        "results": results
    }

    # 정확도 계산 (ground truth가 있는 경우)
    correct_results = [r for r in results if r.get("correct") is not None]
    if correct_results:
        correct_count = sum(1 for r in correct_results if r.get("correct", False))
        summary["accuracy"] = correct_count / len(correct_results)
        summary["correct"] = correct_count
        summary["incorrect"] = len(correct_results) - correct_count

    return summary

# -----------------------------
# CLI
# -----------------------------

def main(argv: Optional[List[str]] = None) -> None:
    cfg = load_config()
    _validate_config(cfg)
    _setup_logging(cfg)
    log = logging.getLogger("router")

    p = argparse.ArgumentParser(description="Filename-based router for plant/leaf images")
    p.add_argument("image", type=str, help="입력 이미지 경로 (파일 또는 폴더, --batch 사용 시)")
    p.add_argument("--out", type=str, default=None, help="JSON 저장 폴더. 미지정 시 /mnt/outputs")
    p.add_argument("--force", type=str, choices=["species", "disease"], help="파일명 규칙 무시 강제 라우팅")
    p.add_argument("--skip-morph", action="store_true", help="잎사귀 경로에서 모폴로지 단계를 생략하고 disease 모델로 바로 추론")
    p.add_argument("--batch", action="store_true", help="폴더 내 모든 이미지에 대해 배치 추론")
    p.add_argument("--save-preview", action="store_true", help="전처리된 이미지 (segmentation 적용 후) 저장")
    args = p.parse_args(argv)

    img = Path(args.image)
    if cfg.get("security", {}).get("resolve_symlink", True):
        try:
            img = img.resolve()
        except Exception:
            pass

    if not img.exists():
        print(f"입력 경로 없음: {img}", file=sys.stderr)
        sys.exit(2)

    # compute defaults from config when CLI not provided
    out_dir = Path(args.out or cfg.get("io", {}).get("outputs_dir") or "outputs")
    use_skip = args.skip_morph or bool(cfg.get("app", {}).get("skip_morphology", False))

    # Override save_preview if --save-preview flag is used
    if args.save_preview:
        cfg["io"]["save_preview"] = True

    # 배치 추론 모드
    if args.batch:
        if not img.is_dir():
            print(f"Error: --batch 플래그 사용 시 폴더 경로를 지정해야 합니다.", file=sys.stderr)
            sys.exit(2)

        log.info("batch.start dir=%s out=%s force=%s skip_morph=%s", str(img), str(out_dir), args.force, use_skip)

        summary = batch_inference(
            input_dir=img,
            cfg=cfg,
            out_dir=out_dir,
            force=args.force,
            skip_morph=use_skip if args.skip_morph else None
        )

        # Summary 저장
        summary_path = out_dir / "batch_summary.json"
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)

        # Summary 출력
        print("\n" + "="*60)
        print("배치 추론 완료")
        print("="*60)
        print(f"전체: {summary['total']}개")
        print(f"성공: {summary['success']}개")
        print(f"실패: {summary['failed']}개")
        if "accuracy" in summary:
            print(f"정확도: {summary['accuracy']:.2%} ({summary['correct']}/{summary['correct'] + summary['incorrect']})")
        print(f"\nSummary 저장: {summary_path}")
        print("="*60)

        return

    # 단일 이미지 추론 모드
    if img.is_dir():
        print(f"Error: 폴더 경로가 지정되었습니다. 배치 추론을 위해서는 --batch 플래그를 사용하세요.", file=sys.stderr)
        sys.exit(2)

    _validate_extension(img, cfg)

    log.info("route.start path=%s out=%s force=%s skip_morph=%s", str(img), str(out_dir), args.force, use_skip)

    result = route(img, cfg=cfg, skip_morph=use_skip if args.skip_morph else None, force=args.force)

    # 출력 파일명: 입력명 + '.json'
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / (img.stem + ".json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(str(out_path))

if __name__ == "__main__":
    main()

'''
실행 예시:

# 단일 이미지 추론
python -m src.router "samples/img_leaf_0001.jpg"
python -m src.router "samples/img_plant_0001.jpg" --force species
python -m src.router "samples/img_leaf_0001.jpg" --force disease --skip-morph

# 배치 추론 (폴더 내 모든 이미지)
python -m src.router "samples/leaves_test" --batch --force disease --out outputs/test
python -m src.router "samples/leaves_test" --batch --force disease --skip-morph --out outputs/test

# 정확도 측정 (폴더 구조: leaves_test/class_name/*.jpg)
python -m src.router "samples/leaves_test" --batch
# → batch_summary.json에 클래스별 정확도 포함
'''