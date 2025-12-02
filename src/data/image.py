# src/data/image.py
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional, Callable, Literal, Tuple
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

Mode = Literal["species", "disease"]

try:
    from PIL import Image, ImageOps
except Exception:
    Image = None
    ImageOps = None

try:
    import numpy as np
    from numpy.typing import NDArray, ArrayLike
except Exception:
    np = None

try:
    import torch
except Exception:
    torch = None

from src.config_loader import load_config

# =============================
# I/O
# =============================
def _load_image(image_path: str, to_rgb: bool) -> NDArray[Any]:
    p = Path(image_path)
    if not p.exists():
        raise FileNotFoundError(f"입력 이미지 없음: {p}")
    with Image.open(str(p)) as im:
        im = ImageOps.exif_transpose(im)
        if to_rgb or im.mode != "RGB":
            im = im.convert("RGB")
        arr = np.asarray(im)
    if arr.ndim != 3 or arr.shape[2] != 3:
        raise ValueError(f"지원되지 않는 이미지 형식: shape={arr.shape}")
    return arr  # H,W,C uint8

# =============================
# Geom / Normalize
# =============================
def _fit_then_crop(arr: NDArray[Any], target_w: int, target_h: int, anchor: str, keep_ratio: float) -> NDArray[Any]:
    if 0.0 < keep_ratio < 1.0:
        h, w = arr.shape[:2]
        new_h = int(round(h * keep_ratio))
        new_w = int(round(w * keep_ratio))
        if new_h > 0 and new_w > 0:
            y0 = (h - new_h) // 2
            x0 = (w - new_w) // 2
            arr = arr[y0:y0 + new_h, x0:x0 + new_w, :]

    h, w = arr.shape[:2]
    scale = max(target_w / w, target_h / h)
    new_w, new_h = int(round(w * scale)), int(round(h * scale))

    img = Image.fromarray(arr).resize((new_w, new_h), Image.BICUBIC)
    arr2 = np.asarray(img)

    y_excess = new_h - target_h
    x_excess = new_w - target_w

    a = str(anchor).lower()
    y0 = 0 if a == "top" else y_excess // 2
    x0 = x_excess // 2

    return arr2[y0:y0 + target_h, x0:x0 + target_w, :]

def _to_tensor(arr: NDArray[Any]) -> "torch.Tensor": # type: ignore
    if arr.ndim != 3 or arr.shape[2] != 3:
        raise ValueError(f"tensor 변환 실패: 예상 HWC(3), 실제 shape={arr.shape}")
    t = torch.from_numpy(arr)
    t = t.permute(2, 0, 1).contiguous()
    return t

def _normalize(arr: NDArray[Any], mean, std, enable: bool) -> NDArray[Any]:
    x = arr.astype("float32") / 255.0
    if not enable:
        return x
    m = np.asarray(mean, dtype="float32").reshape(1, 1, -1)
    s = np.asarray(std,  dtype="float32").reshape(1, 1, -1)
    c = x.shape[2]
    return ((x - m[..., :c]) / s[..., :c]).astype("float32")

# =============================
# Core
# =============================
def _preprocess(img: NDArray[Any], mode: Mode, cfg: Dict[str, Any], save_preprocessed_path: Optional[str] = None) -> Tuple[NDArray[Any], Optional[NDArray[Any]]]:
    pp = cfg["preprocess"]
    common = pp["common"]
    mode_cfg = pp[mode] if pp[mode]["enable"] else {}

    # 공통 파라미터 적용
    img_size = common["img_size"]     # [W,H], 0은 미적용 의미
    keep_ratio = common["keep_ratio"]
    norm_cfg = common["normalize"]
    norm_enable = bool(norm_cfg["enable"])
    mean, std = norm_cfg["mean"], norm_cfg["std"]

    # 모드별 extra 적용
    anchor = "center"
    if mode_cfg:
        anchor = str(mode_cfg["extra"]["anchor"]).lower()

    # 크기 조절
    w, h = int(img_size[0]), int(img_size[1])
    resized_img = None
    if w > 0 and h > 0:
        img = _fit_then_crop(img, w, h, anchor, keep_ratio)
        # Save resized image (before normalization) if requested
        resized_img = img.copy()
        if save_preprocessed_path:
            Image.fromarray(resized_img).save(save_preprocessed_path)
            logger.info(f"Preprocessed image saved: {save_preprocessed_path}")

    # 정규화 및 텐서 변환
    img = _normalize(img, mean, std, norm_enable)
    ten = _to_tensor(img)
    return ten, resized_img

# =============================
# Public API
# =============================
def run_image_stage(
    image_path: str,
    *,
    mode: Mode,
    next_fn: Callable[[NDArray[Any], Dict[str, Any]], Dict[str, Any]],
    extra_meta: Optional[Dict[str, Any]] = None,
    save_preprocessed_path: Optional[str] = None,
) -> Dict[str, Any]:

    cfg = load_config()
    to_rgb = bool(cfg["preprocess"]["common"]["to_rgb"])

    logger.info("image.stage | mode=%s | path=%s", mode, image_path)
    raw = _load_image(image_path, to_rgb=to_rgb)
    proc, resized_img = _preprocess(raw, mode, cfg, save_preprocessed_path)

    meta = {
        "stage": "image",
        "mode": mode,
        "source_path": str(image_path),
        "preprocess": cfg["preprocess"],
    }
    if save_preprocessed_path:
        meta["preprocessed_image_path"] = save_preprocessed_path

    if extra_meta:
        meta.update(extra_meta)
    return next_fn(proc, meta)

def to_species(image_path: str, next_fn: Callable[[torch.Tensor, Dict[str, Any]], Dict[str, Any]], save_preprocessed_path: Optional[str] = None, **kwargs) -> Dict[str, Any]: # type: ignore
    return run_image_stage(image_path, mode="species", next_fn=next_fn, extra_meta=kwargs, save_preprocessed_path=save_preprocessed_path)

def to_disease(image_path: str, next_fn: Callable[[torch.Tensor, Dict[str, Any]], Dict[str, Any]], save_preprocessed_path: Optional[str] = None, **kwargs) -> Dict[str, Any]: # type: ignore
    return run_image_stage(image_path, mode="disease", next_fn=next_fn, extra_meta=kwargs, save_preprocessed_path=save_preprocessed_path)