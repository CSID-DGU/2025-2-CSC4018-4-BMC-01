# src/data/image.py
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional, Callable, Literal, Tuple
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

Mode = Literal["species", "disease"]

try:
    import yaml
except Exception:
    yaml = None

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

# -----------------------------
# Config loading
# -----------------------------
_CONFIG_PATHS = [
    Path("config.yaml"),
    Path("src/config.yaml"),
    Path("/mnt/src/config.yaml"),
]

_REQUIRED_KEYS: Tuple[Tuple[str, ...], ...] = (
    ("preprocess",),
    ("preprocess", "common"),
    ("preprocess", "common", "img_size"),          # [W,H]
    ("preprocess", "common", "to_rgb"),
    ("preprocess", "common", "normalize"),
    ("preprocess", "common", "normalize", "enable"),
    ("preprocess", "common", "normalize", "mean"),
    ("preprocess", "common", "normalize", "std"),
    ("preprocess", "species"),
    ("preprocess", "species", "enable"),
    ("preprocess", "species", "extra"),
    ("preprocess", "species", "extra", "anchor"),
    ("preprocess", "disease"),
    ("preprocess", "disease", "enable"),
    ("preprocess", "disease", "extra"),
    ("preprocess", "disease", "extra", "anchor"),
)

def _need(cfg: Dict[str, Any], path: Tuple[str, ...]) -> Any:
    cur = cfg
    for k in path:
        if not isinstance(cur, dict) or k not in cur:
            dotted = ".".join(path)
            raise KeyError(f"config 누락: {dotted}")
        cur = cur[k]
    return cur

def load_config() -> Dict[str, Any]:
    cfg_path = next((p for p in _CONFIG_PATHS if p.exists()), None)
    if not cfg_path:
        raise FileNotFoundError("config.yaml을 찾을 수 없음: " + ", ".join(map(str, _CONFIG_PATHS)))
    with open(cfg_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f) or {}
    for p in _REQUIRED_KEYS:
        _need(cfg, p)
    return cfg

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
def _fit_then_crop(arr: NDArray[Any], target_w: int, target_h: int, anchor: str) -> NDArray[Any]:
    h, w = arr.shape[:2]
    if target_w <= 0 or target_h <= 0:
        return arr
    scale = max(target_w / w, target_h / h)
    new_w, new_h = int(round(w * scale)), int(round(h * scale))
    img = Image.fromarray(arr).resize((new_w, new_h), Image.BICUBIC)
    arr2 = np.asarray(img)

    y_excess = new_h - target_h
    x_excess = new_w - target_w

    a = str(anchor).lower()
    if a == "top":
        y0 = 0
    else:
        y0 = y_excess // 2
    x0 = x_excess // 2

    y0 = max(0, min(y0, max(0, new_h - target_h)))
    x0 = max(0, min(x0, max(0, new_w - target_w)))
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
def _preprocess(img: NDArray[Any], mode: Mode, cfg: Dict[str, Any]) -> NDArray[Any]:
    pp = cfg["preprocess"]
    common = pp["common"]
    mode_cfg = pp[mode] if pp[mode]["enable"] else {}

    # 공통 파라미터 적용
    img_size = common["img_size"]     # [W,H], 0은 미적용 의미
    norm_cfg = common["normalize"]
    norm_enable = bool(norm_cfg["enable"])
    mean, std = norm_cfg["mean"], norm_cfg["std"]

    # 모드별 extra 적용
    anchor = "center"
    if mode_cfg:
        anchor = str(mode_cfg["extra"]["anchor"]).lower()

    # 크기 조절
    w, h = int(img_size[0]), int(img_size[1])
    if w > 0 and h > 0:
        img = _fit_then_crop(img, w, h, anchor)

    # 정규화 및 텐서 변환
    img = _normalize(img, mean, std, norm_enable)
    ten = _to_tensor(img)
    return ten

# =============================
# Public API
# =============================
def run_image_stage(
    image_path: str,
    *,
    mode: Mode,
    next_fn: Callable[[NDArray[Any], Dict[str, Any]], Dict[str, Any]],
    extra_meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:

    cfg = load_config()
    to_rgb = bool(cfg["preprocess"]["common"]["to_rgb"])

    logger.info("image.stage | mode=%s | path=%s", mode, image_path)
    raw = _load_image(image_path, to_rgb=to_rgb)
    proc = _preprocess(raw, mode, cfg)

    meta = {
        "stage": "image",
        "mode": mode,
        "source_path": str(image_path),
        "preprocess": cfg["preprocess"],
    }
    if extra_meta:
        meta.update(extra_meta)
    return next_fn(proc, meta)

def to_species(image_path: str, next_fn: Callable[[torch.Tensor, Dict[str, Any]], Dict[str, Any]], **kwargs) -> Dict[str, Any]: # type: ignore
    return run_image_stage(image_path, mode="species", next_fn=next_fn, extra_meta=kwargs)

def to_disease(image_path: str, next_fn: Callable[[torch.Tensor, Dict[str, Any]], Dict[str, Any]], **kwargs) -> Dict[str, Any]: # type: ignore
    return run_image_stage(image_path, mode="disease", next_fn=next_fn, extra_meta=kwargs)