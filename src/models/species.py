# src/models/species.py
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Tuple, Optional, List
import logging, json, re

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

try:
    import torch
    import torch.nn as nn
    from torch import Tensor
except Exception:
    torch = None

try:
    import timm
    _HAS_TIMM = True
except Exception:
    timm = None
    _HAS_TIMM = False

from src.config_loader import load_config

# -----------------------------
# Labels
# -----------------------------
_LABELS_CACHE: Optional[List[str]] = None

def _load_labels(path: str, num_classes: int) -> List[str]:
    global _LABELS_CACHE
    if _LABELS_CACHE is not None:
        return _LABELS_CACHE
    
    fp = Path(path)
    if not fp.exists():
        raise FileNotFoundError(f"라벨 파일 없음: {fp}")
    
    with open(fp, "r", encoding="utf-8") as f:
        obj = json.load(f)
    
    # 허용 형태: ["rose", "tulip", ...] 또는 {"0":"rose","1":"tulip",...} 또는 {0:"rose",...}
    if isinstance(obj, list):
        labels = [str(x) for x in obj]
    elif isinstance(obj, dict):
        try:
            items = sorted(((int(k), v) for k, v in obj.items()), key=lambda kv: kv[0])
        except Exception:
            raise ValueError("라벨 맵의 키는 0..N-1 정수여야 합니다.")
        labels = [str(v) for _, v in items]
    else:
        raise ValueError("라벨 파일 형식 오류: list 또는 dict(int->str) 필요")
    
    if len(labels) != num_classes:
        raise ValueError(f"num_classes({num_classes})와 라벨 수({len(labels)}) 불일치")
    
    _LABELS_CACHE = labels
    return labels

# -----------------------------
# Model cache / loaders
# -----------------------------
_MODEL_CACHE: Optional[nn.Module] = None
_DEVICE_CACHE: Optional[torch.device] = None # type: ignore

def _load_torch_model(ckpt_path: str, num_classes: int) -> nn.Module:
    p = Path(ckpt_path)
    if not p.exists():
        raise FileNotFoundError(f"종 모델 체크포인트 없음: {p}")

    logger.info(f"체크포인트 로딩: {p}")

    # 1) TorchScript
    try:
        m = torch.jit.load(str(p), map_location="cpu")
        if isinstance(m, torch.jit.ScriptModule) or isinstance(m, torch.jit.RecursiveScriptModule):
            logger.info("TorchScript 모델 로드 성공")
            m.eval()
            return m  # type: ignore[return-value]
    except Exception as e:
        logger.debug(f"TorchScript 로드 실패 (정상): {e}")

    # 2) PyTorch state_dict
    try:
        obj = torch.load(str(p), map_location="cpu")
    except Exception as e:
        raise RuntimeError(f"체크포인트 로드 실패: {e}")

    if isinstance(obj, nn.Module):
        logger.info("nn.Module 직렬화 모델 로드 성공")
        obj.eval()
        return obj

    if isinstance(obj, dict):
        state = obj.get("model") or obj.get("state_dict")
        arch = obj.get("arch", None)

        logger.info(f"체크포인트 키: {list(obj.keys())}")
        logger.info(f"아키텍처: {arch}, num_classes: {num_classes}")

        if not arch:
            raise RuntimeError(
                f"체크포인트에 'arch' 필드가 없습니다. "
                f"체크포인트 저장 시 {{'arch': 'efficientnet_b0', 'state_dict': model.state_dict()}} 형식으로 저장하세요. "
                f"현재 키: {list(obj.keys())}"
            )

        if not _HAS_TIMM:
            raise RuntimeError("timm 라이브러리가 설치되지 않았습니다.")

        if not state:
            raise RuntimeError(
                f"체크포인트에 'state_dict' 또는 'model' 키가 없습니다. "
                f"현재 키: {list(obj.keys())}"
            )

        model = timm.create_model(arch, pretrained=False, num_classes=num_classes)
        missing, unexpected = model.load_state_dict(state, strict=False)
        if missing or unexpected:
            logger.warning(
                f"state_dict 불일치 | missing={len(missing)} unexpected={len(unexpected)}"
            )
        logger.info(f"timm 모델 로드 성공: {arch}")
        model.eval()
        return model

    raise RuntimeError(f"지원되지 않는 체크포인트 형식: {type(obj)}")

def _get_model_and_device(cfg: Dict[str, Any]) -> Tuple[nn.Module, torch.device, List[str]]: # type: ignore
    global _MODEL_CACHE, _DEVICE_CACHE

    mcfg = cfg["models"]["species"]
    backend = str(mcfg["backend"]).lower()
    device = torch.device(mcfg["device"])
    labels = _load_labels(mcfg["label_path"], int(mcfg["num_classes"]))

    if _MODEL_CACHE is not None and _DEVICE_CACHE is not None:
        return _MODEL_CACHE, _DEVICE_CACHE, labels

    if backend == "dummy":
        class _Dummy(nn.Module):
            def __init__(self, n: int) -> None:
                super().__init__()
                self.nc = n
            def forward(self, x: "Tensor") -> torch.Tensor: # type: ignore
                return torch.zeros((x.shape[0], self.nc), dtype=torch.float32, device=x.device)
        model = _Dummy(len(labels))
    elif backend == "torch":
        model = _load_torch_model(mcfg["ckpt_path"], len(labels))
    elif backend in ("onnx", "tflite"):
        raise NotImplementedError(f"backend '{backend}'는 species에서 미구현")
    else:
        raise ValueError(f"알 수 없는 backend: {backend}")

    model = model.to(device).eval()
    _MODEL_CACHE, _DEVICE_CACHE = model, device
    return model, device, labels

# -----------------------------
# Translator
# -----------------------------
_TR_CACHE: Optional[Dict[str, str]] = None
_NORM_RE = re.compile(r"[\s_\-]+")

def _norm_key(s: str) -> str:
    return _NORM_RE.sub("", s.strip().lower())

def _load_translator(path: Optional[str]) -> Dict[str, str]:
    """영문 라벨 -> 한글명 매핑. path가 없거나 파일이 없으면 빈 dict."""
    global _TR_CACHE
    if _TR_CACHE is not None:
        return _TR_CACHE
    if not path:
        _TR_CACHE = {}
        return _TR_CACHE
    p = Path(path)
    if not p.exists():
        _TR_CACHE = {}
        return _TR_CACHE
    with open(p, "r", encoding="utf-8") as f:
        raw = json.load(f)
    _TR_CACHE = {_norm_key(k): str(v) for k, v in raw.items()}
    return _TR_CACHE

def _tr(label_en: str, tmap: Dict[str, str]) -> str:
    """없으면 원문 반환."""
    return tmap.get(_norm_key(label_en), label_en)

# -----------------------------
# Inference API
# -----------------------------
def run_species(x: "Tensor", meta: Dict[str, Any], topk: int = None) -> Dict[str, Any]:
    if x.ndim != 3:
        raise ValueError(f"CHW 텐서 기대, got {tuple(x.shape)}")

    cfg = load_config()
    model, device, labels = _get_model_and_device(cfg)

    if topk is None:
        topk = cfg.get("app", {}).get("topk", 5)

    tpath = cfg.get("models", {}).get("species", {}).get("translate_path")
    tmap = _load_translator(tpath)

    with torch.inference_mode():
        xb = x.unsqueeze(0).to(device, non_blocking=True)  # [1, C, H, W]
        logits = model(xb)                                 # [1, num_classes]
        probs = torch.softmax(logits, dim=1)
        conf, pred = torch.max(probs, dim=1)
        k = min(int(topk), probs.shape[1])
        pvals, inds = torch.topk(probs[0], k=k)

    pred_idx = int(pred.item())
    pred_en = labels[pred_idx]
    pred_ko = _tr(pred_en, tmap)

    return {
        "stage": "infer",
        "mode": "species",
        "pred_class": pred_idx,
        "pred_label": pred_en,
        "pred_label_ko": pred_ko,
        "confidence": float(conf.item()),
        "topk": [
            {"index": int(i.item()), "label": labels[int(i.item())], "prob": float(p.item())}
            for p, i in zip(pvals, inds)
        ],
        "meta": meta,
    }