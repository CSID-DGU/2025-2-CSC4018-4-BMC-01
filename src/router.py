# src/router.py
from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
import sys
from typing import Any, Dict, Iterable, List, Optional

try:
    import yaml
except Exception:
    yaml = None
          
from src.models.species import run_species                              # 경로 ①: pot_species.py (종 분류)
# todo 경로 ②: leaf_disease.py (모폴로지 → 병충해)
from src.models.disease import run_disease_direct                       # 모폴로지 생략 후 바로 disease 모델 호출
from src.data.image import to_species, to_disease

# -----------------------------
# Config loading
# -----------------------------

_CONFIG_PATHS: List[Path] = [
    Path("config.yaml"),
    Path("src/config.yaml"),
    Path("/mnt/src/config.yaml"),
]

REQUIRED_KEYS = [
    ("app", "default_route"),          # "species" | "disease" | None 허용 시 검증 로직에서 처리
    ("app", "skip_morphology"),        # bool
    ("io", "input_extensions"),        # list[str]
    ("io", "outputs_dir"),             # str
    ("logging", "level"),              # str
    ("logging", "fmt"),                # str
    ("router", "rules"),               # list[{contains:str, route:str}]
]

def load_config() -> Dict[str, Any]:
    cfg_path = next((p for p in _CONFIG_PATHS if p.exists()), None)
    if not cfg_path:
        raise FileNotFoundError("config.yaml을 찾을 수 없음: " + ", ".join(map(str, _CONFIG_PATHS)))

    with open(cfg_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f) or {}

    # 스키마 검증
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

    # 값 검증
    dr = cfg["app"]["default_route"]
    if dr not in (None, "species", "disease"):
        raise ValueError("app.default_route는 None | 'species' | 'disease' 중 하나여야 함")
    if not isinstance(cfg["app"]["skip_morphology"], bool):
        raise TypeError("app.skip_morphology는 bool")

    # router.rules 검증
    rules = cfg["router"]["rules"]
    if not isinstance(rules, list):
        raise TypeError("router.rules는 리스트여야 함")
    for i, r in enumerate(rules):
        if not isinstance(r, dict) or "contains" not in r or "route" not in r:
            raise ValueError(f"router.rules[{i}]는 {{contains, route}} 필수")
        if r["route"] not in ("species", "disease"):
            raise ValueError(f"router.rules[{i}].route는 'species' | 'disease'")

    return cfg

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
    2) config.app.default_route가 있으면 사용
    3) config.router.rules contains 규칙
    4) fallback: 파일명에 plant → species, leaf → disease
    """
    if force:
        force = force.lower()
        if force not in {"species", "disease"}:
            raise ValueError("force must be one of {'species','disease'}")
        return force

    default_route = cfg.get("app", {}).get("default_route")
    if default_route in {"species", "disease"}:
        return str(default_route)

    name = image_path.stem.lower()
    rt = _match_by_rules(name, (cfg.get("router") or {}).get("rules") or [])
    if rt in {"species", "disease"}:
        return rt

    # fallback to legacy rule
    if "plant" in name and "leaf" not in name:
        return "species"
    if "leaf" in name and "plant" not in name:
        return "disease"

    raise ValueError("파일명에서 라우팅 키워드를 찾을 수 없습니다.")

def _validate_extension(path: Path, cfg: Dict[str, Any]) -> None:
    allowed = [s.lower() for s in (cfg.get("io", {}).get("input_extensions") or [])]
    if allowed:
        if path.suffix.lower() not in allowed:
            logging.getLogger(__name__).warning(
                "허용 확장자 목록(%s)에 없음: %s", ", ".join(allowed), path.suffix
            )

def route(image_path: Path, *, cfg: Dict[str, Any], skip_morph: Optional[bool] = None, force: Optional[str] = None) -> Dict:
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
        return to_species(str(image_path), next_fn=_call)

    if skip_morph:
        def _call(img, meta):
            return run_disease_direct(img, meta)
        return to_disease(str(image_path), next_fn=_call)
    
    def _call(img, meta):
    # TODO: 여기서 morphology(img) 적용 후 run_disease_direct 호출하도록 교체
        return run_disease_direct(img, meta)
    return to_disease(str(image_path), next_fn=_call)

# -----------------------------
# CLI
# -----------------------------

def main(argv: Optional[List[str]] = None) -> None:
    cfg = load_config()
    _setup_logging(cfg)
    log = logging.getLogger("router")

    p = argparse.ArgumentParser(description="Filename-based router for plant/leaf images")
    p.add_argument("image", type=str, help="입력 이미지 경로")
    p.add_argument("--out", type=str, default=None, help="JSON 저장 폴더. 미지정 시 /mnt/outputs")
    p.add_argument("--force", type=str, choices=["species", "disease"], help="파일명 규칙 무시 강제 라우팅")
    p.add_argument("--skip-morph", action="store_true", help="잎사귀 경로에서 모폴로지 단계를 생략하고 disease 모델로 바로 추론")
    args = p.parse_args(argv)

    img = Path(args.image)
    if cfg.get("security", {}).get("resolve_symlink", True):
        try:
            img = img.resolve()
        except Exception:
            pass

    if not img.exists():
        print(f"입력 이미지 없음: {img}", file=sys.stderr)
        sys.exit(2)

    _validate_extension(img, cfg)

    # compute defaults from config when CLI not provided
    out_dir = Path(args.out or cfg.get("io", {}).get("outputs_dir") or "outputs")
    use_skip = args.skip_morph or bool(cfg.get("app", {}).get("skip_morphology", False))

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
python -m src.router "samples/img_leaf_0001.jpg" (기본 실행)
python -m src.router "samples/img_plant_0001.jpg" --force species (강제 종 분기)
python -m src.router "samples/img_leaf_0001.jpg" --force disease --skip-morph (강제 병해 분기, 모폴로지 생략)
python -m src.router "samples/img_plant_0001.jpg" --out runs/leaf_test (출력 경로 지정)
'''