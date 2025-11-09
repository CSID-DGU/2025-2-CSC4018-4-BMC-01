# src/data/image.py
from __future__ import annotations
from pathlib import Path
from typing import Callable, Dict, Literal, Tuple, Any
import logging

# 외부 의존 최소화: 실제 구현 시 cv2, PIL, numpy 등을 붙이면 됨.
# 여기서는 패스스루만 수행.
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

Mode = Literal["species", "disease"]

def _load_image(image_path: str) -> Any:
    """
    이미지 로드. 현재는 실제 로드는 하지 않고 경로만 반환.
    실제 구현 시:
      - PIL.Image.open or cv2.imread
      - RGB/BGR 변환
      - ndarray 또는 tensor로 변환
    """
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"입력 이미지 없음: {path}")
    # TODO: 실제 이미지 로드 후 반환
    return {"_placeholder": True, "path": str(path)}

def _preprocess(img: Any, mode: Mode) -> Any:
    """
    공통 전처리 스텁. 실제 구현 시:
      - 리사이즈, 정규화(mean/std), 색공간 변환 등
      - mode == 'species' / 'disease'에 따라 파이프라인 분기
    """
    # TODO: 전처리 적용
    return img

def run_after_image_stage(
    image_path: str,
    *,
    mode: Mode,
    next_fn: Callable[[Any, Dict], Dict],
    extra_meta: Dict | None = None,
) -> Dict:
    """
    이미지 → 전처리 → 다음 스테이지(next_fn)로 전달.
    - mode='species'  : 종 분류 입력용 전처리 후 next_fn 호출
    - mode='disease'  : 병충해 입력용 전처리 후 next_fn 호출
    - next_fn(signature): next_fn(processed_image, meta) -> dict
    반환: next_fn의 결과 dict
    """
    logger.info("image.load -> preprocess -> next | mode=%s | path=%s", mode, image_path)

    raw = _load_image(image_path)
    proc = _preprocess(raw, mode)

    meta = {
        "stage": "image",
        "mode": mode,
        "source_path": str(image_path),
    }
    if extra_meta:
        meta.update(extra_meta)

    # 다음 단계로 전달
    out = next_fn(proc, meta)
    return out

# 편의 래퍼
def to_species(image_path: str, next_fn: Callable[[Any, Dict], Dict], **kwargs) -> Dict:
    return run_after_image_stage(image_path, mode="species", next_fn=next_fn, extra_meta=kwargs)

def to_disease(image_path: str, next_fn: Callable[[Any, Dict], Dict], **kwargs) -> Dict:
    return run_after_image_stage(image_path, mode="disease", next_fn=next_fn, extra_meta=kwargs)