#!/usr/bin/env python3
"""
samples/leaves 데이터에 morphology 전처리를 적용하여 samples/leaves_mp로 저장
"""
import cv2
import numpy as np
from pathlib import Path
from tqdm import tqdm
import shutil

from src.config_loader import load_config


def apply_morphology_to_image(img_path: Path, cfg: dict) -> np.ndarray:
    """
    단일 이미지에 morphology 전처리 적용
    개선된 HSV 색상 마스킹으로 잎사귀 영역만 정확히 추출
    """
    # 이미지 로드
    img = cv2.imread(str(img_path))
    if img is None:
        raise ValueError(f"이미지 로드 실패: {img_path}")

    # RGB 변환
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    morph_cfg = cfg.get("morphology", {})

    if not morph_cfg.get("enable", False):
        return img_rgb

    # 개선된 HSV 색상 마스킹 방식
    hsv_cfg = morph_cfg.get("hsv_masking", {})

    # 1) HSV 변환
    img_hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # 2) 여러 색상 범위로 마스크 생성 (모든 잎 색상 포착)
    color_ranges = hsv_cfg.get("color_ranges", [])

    if not color_ranges:
        # 기본 색상 범위 (config에 없을 경우)
        color_ranges = [
            {"lower": [25, 20, 20], "upper": [90, 255, 255]},  # 녹색
            {"lower": [10, 20, 20], "upper": [25, 255, 255]},  # 노란색
            {"lower": [0, 20, 20], "upper": [10, 255, 255]},   # 빨강/갈색
        ]

    # 모든 색상 범위의 마스크 결합
    mask_combined = np.zeros(img_hsv.shape[:2], dtype=np.uint8)

    for color_range in color_ranges:
        lower = np.array(color_range.get("lower", [0, 0, 0]))
        upper = np.array(color_range.get("upper", [180, 255, 255]))
        mask_i = cv2.inRange(img_hsv, lower, upper)
        mask_combined = cv2.bitwise_or(mask_combined, mask_i)

    # 3) 강화된 Morphology 연산
    ops_cfg = morph_cfg.get("ops", {})

    def apply_op(mask_img, op_name, morph_type):
        op_cfg = ops_cfg.get(op_name, {})
        if not op_cfg.get("enable", False):
            return mask_img
        ksize = tuple(op_cfg.get("ksize", [3, 3]))
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, ksize)
        iterations = op_cfg.get("iter", 1)

        if morph_type == cv2.MORPH_OPEN:
            return cv2.morphologyEx(mask_img, cv2.MORPH_OPEN, kernel, iterations=iterations)
        elif morph_type == cv2.MORPH_CLOSE:
            return cv2.morphologyEx(mask_img, cv2.MORPH_CLOSE, kernel, iterations=iterations)
        elif morph_type == cv2.MORPH_ERODE:
            return cv2.erode(mask_img, kernel, iterations=iterations)
        elif morph_type == cv2.MORPH_DILATE:
            return cv2.dilate(mask_img, kernel, iterations=iterations)
        return mask_img

    # Closing 먼저: 작은 구멍 메우기 (강화)
    mask_combined = apply_op(mask_combined, "close", cv2.MORPH_CLOSE)

    # Opening: 작은 노이즈 제거 (약하게)
    mask_combined = apply_op(mask_combined, "open", cv2.MORPH_OPEN)

    # 4) Connected Component 분석: 가장 큰 객체만 선택
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask_combined, connectivity=8)

    if num_labels > 1:
        # 배경(0) 제외하고 가장 큰 component 찾기
        largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        mask_final = (labels == largest_label).astype(np.uint8) * 255
    else:
        mask_final = mask_combined

    # 5) 마스크 테두리 부드럽게 (선택사항)
    smooth_cfg = hsv_cfg.get("smooth_edges", {})
    if smooth_cfg.get("enable", False):
        blur_size = smooth_cfg.get("blur_size", 5)
        mask_final = cv2.GaussianBlur(mask_final, (blur_size, blur_size), 0)
        _, mask_final = cv2.threshold(mask_final, 127, 255, cv2.THRESH_BINARY)

    # 6) 원본 RGB 이미지에 마스크 적용
    result = cv2.bitwise_and(img_rgb, img_rgb, mask=mask_final)

    # 7) 배경을 흰색으로 설정
    background = np.full_like(img_rgb, 255)
    mask_inv = cv2.bitwise_not(mask_final)
    background = cv2.bitwise_and(background, background, mask=mask_inv)
    result = cv2.add(result, background)

    # 8) ROI 추출 (선택사항)
    roi_cfg = morph_cfg.get("roi", {})
    if roi_cfg.get("enable", False):
        contours, _ = cv2.findContours(mask_final, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest_contour)
            # 약간의 패딩 추가
            padding = roi_cfg.get("padding", 10)
            x = max(0, x - padding)
            y = max(0, y - padding)
            w = min(result.shape[1] - x, w + 2 * padding)
            h = min(result.shape[0] - y, h + 2 * padding)
            result = result[y:y+h, x:x+w]

    return result


def main():
    cfg = load_config()

    input_dir = Path("samples/leaves")
    output_dir = Path("samples/leaves_mp")

    if not input_dir.exists():
        print(f"Error: {input_dir} 폴더가 없습니다.")
        return

    # Output 디렉토리 생성
    if output_dir.exists():
        print(f"Warning: {output_dir} 폴더가 이미 존재합니다. 삭제하고 다시 생성합니다.")
        shutil.rmtree(output_dir)

    output_dir.mkdir(parents=True, exist_ok=True)

    # 모든 이미지 파일 찾기
    image_extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']
    all_images = []

    for ext in image_extensions:
        all_images.extend(input_dir.rglob(f"*{ext}"))

    print(f"총 {len(all_images)}개 이미지 발견")
    print(f"Morphology 설정:")
    print(f"  - Enable: {cfg['morphology']['enable']}")
    print(f"  - HSV Masking: {len(cfg['morphology'].get('hsv_masking', {}).get('color_ranges', []))} color ranges")
    print(f"  - Open: {cfg['morphology']['ops']['open']}")
    print(f"  - Close: {cfg['morphology']['ops']['close']}")
    print(f"  - ROI: {cfg['morphology']['roi']['enable']}")
    print()

    # 전처리 및 저장
    success_count = 0
    error_count = 0

    for img_path in tqdm(all_images, desc="Processing"):
        try:
            # 상대 경로 계산
            rel_path = img_path.relative_to(input_dir)
            out_path = output_dir / rel_path

            # 출력 디렉토리 생성
            out_path.parent.mkdir(parents=True, exist_ok=True)

            # Morphology 적용
            processed = apply_morphology_to_image(img_path, cfg)

            # 저장 (BGR로 변환)
            processed_bgr = cv2.cvtColor(processed, cv2.COLOR_RGB2BGR)
            cv2.imwrite(str(out_path), processed_bgr)

            success_count += 1
        except Exception as e:
            print(f"\nError processing {img_path}: {e}")
            error_count += 1

    print(f"\n완료!")
    print(f"  - 성공: {success_count}개")
    print(f"  - 실패: {error_count}개")
    print(f"  - 출력: {output_dir}")


if __name__ == "__main__":
    main()
