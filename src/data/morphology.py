# src/data/morphology.py
from __future__ import annotations
from typing import Callable, Dict, Any
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def _morphology_ops(img: Any, meta: Dict) -> Any:
    """
    모폴로지 연산 스텁. 실제 구현 시:
      - 그레이 변환, 이진화(OTS U/적응형)
      - 오픈/클로즈, 침식/팽창, Top-hat/Black-hat
      - 노이즈 제거 및 ROI 추출
    """
    # TODO: 실제 모폴로지 파이프라인
    return img  # 현재는 패스스루

def run_after_morphology_stage(
    img_or_tensor: Any,
    meta: Dict,
    *,
    next_fn: Callable[[Any, Dict], Dict],
) -> Dict:
    """
    모폴로지 → 다음 스테이지(next_fn)로 전달.
    - next_fn(signature): next_fn(processed_image, meta) -> dict
    - meta는 stage 이력을 남겨 파이프라인 디버깅을 돕는다.
    """
    logger.info("morphology -> next")
    proc = _morphology_ops(img_or_tensor, meta)

    meta = dict(meta)  # 사본
    meta["stage"] = "morphology"

    out = next_fn(proc, meta)
    return out

# 개발자 우회 옵션(설계 연결부):
# - router.py에서 --skip-morph가 True면 본 모듈을 생략하고 disease 모델로 바로 next_fn 호출.
# - 이 모듈 자체에서는 추가 파라미터 없이 표준 시그니처만 보장.