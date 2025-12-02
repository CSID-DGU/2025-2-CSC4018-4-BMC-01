# src/data/morphology.py
from __future__ import annotations
from typing import Callable, Dict, Any
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

try:
    import cv2
    import numpy as np
    from numpy.typing import NDArray
except Exception:
    cv2 = None
    np = None

from src.config_loader import load_config


def _calculate_roundness(contour) -> float:
    """
    Calculate roundness of a contour
    roundness = 4π * area / perimeter^2
    Perfect circle = 1.0, lower values = less circular
    """
    area = cv2.contourArea(contour)
    perimeter = cv2.arcLength(contour, True)

    if perimeter == 0:
        return 0.0

    roundness = (4 * np.pi * area) / (perimeter * perimeter)
    return roundness


def _apply_hsv_masking(img: NDArray, morph_cfg: Dict) -> tuple[NDArray, NDArray]:
    """
    Apply HSV color masking to extract leaf regions
    """
    hsv_cfg = morph_cfg.get("hsv_masking", {})
    color_ranges = hsv_cfg.get("color_ranges", [])

    if not color_ranges:
        # No HSV masking, return as-is with full mask
        full_mask = np.ones(img.shape[:2], dtype=np.uint8) * 255
        return img, full_mask

    # Convert to HSV
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)

    # Create combined mask for all color ranges
    combined_mask = np.zeros(img.shape[:2], dtype=np.uint8)

    for color_range in color_ranges:
        lower = np.array(color_range.get("lower", [0, 0, 0]), dtype=np.uint8)
        upper = np.array(color_range.get("upper", [180, 255, 255]), dtype=np.uint8)

        mask = cv2.inRange(hsv, lower, upper)
        combined_mask = cv2.bitwise_or(combined_mask, mask)

    # Check if mask is empty
    if cv2.countNonZero(combined_mask) == 0:
        logger.warning("HSV masking resulted in empty mask, using full image")
        full_mask = np.ones(img.shape[:2], dtype=np.uint8) * 255
        return img, full_mask

    # Apply mask to original image
    result = cv2.bitwise_and(img, img, mask=combined_mask)

    # Optional: smooth edges
    smooth_cfg = hsv_cfg.get("smooth_edges", {})
    if smooth_cfg.get("enable", False):
        blur_size = smooth_cfg.get("blur_size", 5)
        combined_mask = cv2.GaussianBlur(combined_mask, (blur_size, blur_size), 0)
        result = cv2.bitwise_and(img, img, mask=combined_mask)

    logger.info(f"HSV masking: foreground pixels = {cv2.countNonZero(combined_mask)} / {combined_mask.size}")

    return result, combined_mask


def _morphology_ops(img: NDArray, meta: Dict, original_img: NDArray) -> tuple[NDArray, Dict]:
    """
    모폴로지 연산 파이프라인 with roundness check
    - HSV 색상 마스킹으로 배경 제거
    - 모폴로지 연산 (open/close)
    - ROI 추출 및 roundness 계산
    - Roundness가 낮으면 원본 반환

    Returns:
        (processed_image, metadata)
    """
    cfg = load_config()
    morph_cfg = cfg.get("morphology", {})

    if not morph_cfg.get("enable", False):
        return img, meta

    # 1) HSV masking for background removal
    masked_img, mask = _apply_hsv_masking(img, morph_cfg)

    # 2) Convert to grayscale for morphology operations
    if len(masked_img.shape) == 3:
        gray = cv2.cvtColor(masked_img, cv2.COLOR_RGB2GRAY)
    else:
        gray = masked_img

    # 3) Binary threshold
    _, binary = cv2.threshold(gray, 1, 255, cv2.THRESH_BINARY)
    binary = binary.astype(np.uint8)  # Ensure uint8 type for findContours

    # 4) 모폴로지 연산 (더 강하게)
    ops_cfg = morph_cfg.get("ops", {})
    result = binary

    def apply_op(img, op_name, morph_type):
        op_cfg = ops_cfg.get(op_name, {})
        if not op_cfg.get("enable", False):
            return img
        ksize = tuple(op_cfg.get("ksize", [3, 3]))
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, ksize)
        iterations = op_cfg.get("iter", 1)
        return cv2.morphologyEx(img, morph_type, kernel, iterations=iterations)

    # Open (노이즈 제거)
    result = apply_op(result, "open", cv2.MORPH_OPEN)
    # Close (구멍 메우기)
    result = apply_op(result, "close", cv2.MORPH_CLOSE)

    # Erode, Dilate
    if ops_cfg.get("erode", {}).get("enable", False):
        ksize = tuple(ops_cfg["erode"].get("ksize", [3, 3]))
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, ksize)
        iterations = ops_cfg["erode"].get("iter", 1)
        result = cv2.erode(result, kernel, iterations=iterations)

    if ops_cfg.get("dilate", {}).get("enable", False):
        ksize = tuple(ops_cfg["dilate"].get("ksize", [3, 3]))
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, ksize)
        iterations = ops_cfg["dilate"].get("iter", 1)
        result = cv2.dilate(result, kernel, iterations=iterations)

    # 5) ROI 추출 및 roundness 체크
    roi_cfg = morph_cfg.get("roi", {})
    roundness_threshold = roi_cfg.get("roundness_threshold", 0.3)

    if roi_cfg.get("enable", False):
        method = roi_cfg.get("method", "largest_contour")
        if method == "largest_contour":
            contours, _ = cv2.findContours(result, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                largest = max(contours, key=cv2.contourArea)
                roundness = _calculate_roundness(largest)

                logger.info(f"morphology: contour roundness = {roundness:.3f}")

                # Roundness가 너무 낮으면 원본 사용
                if roundness < roundness_threshold:
                    logger.warning(f"morphology: roundness {roundness:.3f} < threshold {roundness_threshold}, using original image")
                    meta["morphology_applied"] = False
                    meta["morphology_roundness"] = roundness
                    meta["morphology_used_original"] = True
                    return original_img, meta

                # ROI 추출
                x, y, w, h = cv2.boundingRect(largest)
                padding = roi_cfg.get("padding", 10)

                # Padding 적용 (이미지 경계 확인)
                x1 = max(0, x - padding)
                y1 = max(0, y - padding)
                x2 = min(img.shape[1], x + w + padding)
                y2 = min(img.shape[0], y + h + padding)

                # 원본 이미지에서 ROI 추출 (마스크 적용된 영역)
                roi_img = masked_img[y1:y2, x1:x2]

                meta["morphology_applied"] = True
                meta["morphology_roundness"] = roundness
                meta["morphology_used_original"] = False

                return roi_img, meta

    # ROI 추출 실패 시 원본 반환
    logger.warning("morphology: no valid contours found, using original image")
    meta["morphology_applied"] = False
    meta["morphology_used_original"] = True
    return original_img, meta


def run_after_morphology_stage(
    img_or_tensor: Any,
    meta: Dict,
    *,
    next_fn: Callable[[Any, Dict], Dict],
) -> Dict:
    """
    모폴로지 → 다음 스테이지(next_fn)로 전달
    """
    logger.info("morphology stage start")

    # Tensor를 numpy로 변환
    if hasattr(img_or_tensor, 'numpy'):
        img = img_or_tensor.numpy()
    else:
        img = img_or_tensor

    # CHW -> HWC 변환 (if needed)
    if len(img.shape) == 3 and img.shape[0] in [1, 3]:
        img = img.transpose(1, 2, 0)

    # 정규화 복원 (0-255 범위로)
    if img.dtype == np.float32 or img.dtype == np.float64:
        if img.max() <= 1.0:
            img = (img * 255).astype(np.uint8)

    # RGB로 변환 (1채널이면)
    if len(img.shape) == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)

    # 원본 이미지 저장 (roundness 체크용)
    original_img = img.copy()

    # 모폴로지 적용 (원본 전달)
    proc, meta = _morphology_ops(img, meta, original_img)

    # HWC -> CHW 변환 후 텐서로
    if len(proc.shape) == 3:
        proc = proc.transpose(2, 0, 1)

    # numpy -> tensor
    import torch
    proc_tensor = torch.from_numpy(proc).float() / 255.0

    out = next_fn(proc_tensor, meta)
    return out
