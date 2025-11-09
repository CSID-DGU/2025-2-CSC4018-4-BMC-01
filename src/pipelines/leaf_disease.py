# src/pipelines/leaf_disease.py
from __future__ import annotations
from typing import Any, Dict
from pathlib import Path
import logging
import os
import time

from src.data.image import to_disease
from src.data.morphology import run_after_morphology_stage
from src.models.disease import infer as disease_infer

logger = logging.getLogger(__name__)

try:
    import yaml  # optional
except Exception:
    yaml = None

def _get_topk(default: int = 3) -> int:
    # 1) ENV 우선
    for k in ("APP_TOPK", "TOPK", "DISEASE_TOPK"):
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
                        or cfg.get("models", {}).get("disease", {}).get("topk")
                    )
                    if isinstance(topk, int) and topk > 0:
                        return topk
                except Exception:
                    pass
    # 3) 기본값
    return default

def run_infer(image_path: str) -> Dict[str, Any]:
    """
    이미지 → (image 전처리 스텁) → 모폴로지 스텁 → disease 모델
    반환: 모델 표준 스키마 dict
    """
    t0 = time.perf_counter()

    def _after_morph(img: Any, meta: Dict) -> Dict:
        return disease_infer(img, meta, topk=_get_topk())

    def _next_from_image(img: Any, meta: Dict) -> Dict:
        # image 단계 이후 모폴로지로 연결
        return run_after_morphology_stage(img, meta, next_fn=_after_morph)

    result = to_disease(image_path, next_fn=_next_from_image)

    # 타이밍 집계
    elapsed = int((time.perf_counter() - t0) * 1000)
    tm = dict(result.get("timing_ms") or {})
    tm["pipeline"] = elapsed
    tm["total"] = max(tm.get("total", 0), elapsed)
    result["timing_ms"] = tm
    return result