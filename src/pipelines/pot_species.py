# src/pipelines/pot_species.py
from __future__ import annotations
from typing import Any, Dict
from pathlib import Path
import logging
import os
import time

from src.data.image import to_species
from src.models.species import infer as species_infer

logger = logging.getLogger(__name__)

try:
    import yaml  # optional
except Exception:
    yaml = None

def _get_topk(default: int = 3) -> int:
    # 1) ENV 우선
    for k in ("APP_TOPK", "TOPK", "SPECIES_TOPK"):
        v = os.getenv(k)
        if v and v.isdigit():
            return int(v)
    # 2) config.yaml 조회(선택)
    if yaml:
        for p in (Path("config.yaml"), Path("src/config.yaml")):
            if p.exists():
                try:
                    cfg = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
                    topk = (
                        cfg.get("app", {}).get("topk")
                        or cfg.get("models", {}).get("species", {}).get("topk")
                    )
                    if isinstance(topk, int) and topk > 0:
                        return topk
                except Exception:
                    pass
    # 3) 기본값
    return default

def run_infer(image_path: str) -> Dict[str, Any]:
    """
    이미지 → (image 전처리 스텁) → species 모델
    반환: 모델 표준 스키마 dict
    """
    t0 = time.perf_counter()

    def _call_model(img: Any, meta: Dict) -> Dict:
        return species_infer(img, meta, topk=_get_topk())

    result = to_species(image_path, next_fn=_call_model)

    # 타이밍 집계
    elapsed = int((time.perf_counter() - t0) * 1000)
    tm = dict(result.get("timing_ms") or {})
    tm["pipeline"] = elapsed
    tm["total"] = max(tm.get("total", 0), elapsed)
    result["timing_ms"] = tm
    return result