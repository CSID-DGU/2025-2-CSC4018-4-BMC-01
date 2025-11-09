# src/models/species.py
from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Tuple
import json
import math
import os

try:
    import yaml  # 선택 의존. 없으면 매핑 없이 동작.
except Exception:
    yaml = None

# ---------- 공통 유틸 ----------

def _safe_softmax(xs: List[float]) -> List[float]:
    if not xs:
        return []
    m = max(xs)
    exps = [math.exp(x - m) for x in xs]
    s = sum(exps) or 1.0
    return [e / s for e in exps]

def _stable_hash(s: str) -> int:
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h

# ---------- 라벨 매핑 ----------

_SPECIES_MAP: Dict[int, str] | None = None

def _load_species_map() -> Dict[int, str]:
    global _SPECIES_MAP
    if _SPECIES_MAP is not None:
        return _SPECIES_MAP

    mp: Dict[int, str] = {}
    # 1순위: JSON
    p_json = Path("/mnt/data/dataset_map_species.json")
    if p_json.exists():
        obj = json.loads(p_json.read_text(encoding="utf-8"))
        # 예상 스키마: {"classes":[{"id":0,"common_name":"Rose"}, ...]}
        if "classes" in obj:
            for it in obj["classes"]:
                cid = int(it.get("id"))
                name = str(it.get("common_name") or it.get("name") or f"species_{cid}")
                mp[cid] = name
        else:
            # 단순 dict{id: name}도 수용
            for k, v in obj.items():
                try:
                    mp[int(k)] = str(v)
                except Exception:
                    continue
    # 2순위: YAML(옵션)
    if not mp and yaml is not None:
        p_yml = Path("/mnt/data/dataset_map_species.yaml")
        if p_yml.exists():
            obj = yaml.safe_load(p_yml.read_text(encoding="utf-8"))
            if isinstance(obj, dict):
                for k, v in obj.items():
                    try:
                        mp[int(k)] = str(v)
                    except Exception:
                        continue

    _SPECIES_MAP = mp
    return _SPECIES_MAP

_SPECIES_ENTRY: dict[int, dict] | None = None

def _load_species_entry() -> dict[int, dict]:
    global _SPECIES_ENTRY
    if _SPECIES_ENTRY is not None:
        return _SPECIES_ENTRY
    entries: dict[int, dict] = {}

    p_json = Path("/mnt/data/dataset_map_species.json")
    if p_json.exists():
        obj = json.loads(p_json.read_text(encoding="utf-8"))
        if isinstance(obj, dict) and "classes" in obj:
            for it in obj["classes"]:
                try:
                    entries[int(it["id"])] = dict(it)
                except Exception:
                    continue
        elif isinstance(obj, dict):
            # {id: name} 형태면 name만 감싼다
            for k, v in obj.items():
                try:
                    entries[int(k)] = {"id": int(k), "common_name": str(v)}
                except Exception:
                    continue
    else:
        # 선택: YAML 백업도 허용
        p_yml = Path("/mnt/data/dataset_map_species.yaml")
        if p_yml.exists() and yaml is not None:
            obj = yaml.safe_load(p_yml.read_text(encoding="utf-8"))
            if isinstance(obj, dict) and "classes" in obj:
                for it in obj["classes"]:
                    try:
                        entries[int(it["id"])] = dict(it)
                    except Exception:
                        continue
            elif isinstance(obj, dict):
                for k, v in obj.items():
                    try:
                        entries[int(k)] = {"id": int(k), "common_name": str(v)}
                    except Exception:
                        continue

    _SPECIES_ENTRY = entries
    return _SPECIES_ENTRY

def _name_from_id(cid: int) -> str:
    mp = _load_species_map()
    return mp.get(cid, f"species_{cid}")

def _entry_from_id(cid: int) -> dict | None:
    return _load_species_entry().get(cid)

# ---------- 모델 래퍼 ----------

@dataclass
class SpeciesModelConfig:
    num_classes: int = 100  # 실제 값으로 교체 예정
    ckpt_path: str = ""     # 가중치 경로. 비어 있으면 더미 동작.

class SpeciesModel:
    def __init__(self, cfg: SpeciesModelConfig | None = None) -> None:
        self.cfg = cfg or SpeciesModelConfig()
        self._loaded = False
        self._backend = None  # 추후 torchscript/onnx/runtime 객체

    def load(self) -> None:
        if self.cfg.ckpt_path and Path(self.cfg.ckpt_path).exists():
            # TODO: 실제 런타임 로드(Torch/ONNX 등)
            self._backend = object()
        self._loaded = True

    def preprocess(self, img: Any) -> Any:
        # TODO: 텐서 변환, 정규화 등
        return img

    def infer_logits(self, x: Any) -> List[float]:
        # 실제 추론. 현재는 입력 경로 해시 기반의 결정적 더미.
        n = max(1, self.cfg.num_classes)
        seed = ""
        if isinstance(x, dict):
            seed = str(x.get("path") or "")
        h = _stable_hash(seed)
        # 간단한 반복 난수로 로짓 생성
        logits = []
        cur = h or 123456789
        for _ in range(n):
            cur = (1103515245 * cur + 12345) & 0x7FFFFFFF
            logits.append((cur % 1000) / 100.0)  # 0.00~9.99
        return logits

    def postprocess(self, probs: List[float], topk: int = 3) -> Tuple[int, List[Tuple[int, float]]]:
        idx = sorted(range(len(probs)), key=lambda i: probs[i], reverse=True)
        top = [(i, probs[i]) for i in idx[:topk]]
        return (top[0][0], top)

# ---------- 공개 API ----------

_DEFAULT_MODEL: SpeciesModel | None = None

def _ensure_model() -> SpeciesModel:
    global _DEFAULT_MODEL
    if _DEFAULT_MODEL is None:
        ckpt = os.getenv("SPECIES_CKPT", "")
        num_classes = int(os.getenv("SPECIES_NUM_CLASSES", "100") or "100")
        _DEFAULT_MODEL = SpeciesModel(SpeciesModelConfig(num_classes=num_classes, ckpt_path=ckpt))
        _DEFAULT_MODEL.load()
    return _DEFAULT_MODEL

def infer(img: Any, meta: Dict, *, topk: int = 3) -> Dict:
    """
    입력: 전처리된 이미지 또는 패스스루 객체, meta 누적 딕셔너리.
    출력: 라우터가 저장하는 표준 스키마(dict).
    """
    meta = dict(meta)
    stages = list(meta.get("stages") or [])
    stages.append("model:species")
    meta["stages"] = stages

    model = _ensure_model()
    x = model.preprocess(img)
    logits = model.infer_logits(x)
    probs = _safe_softmax(logits)
    cid, top = model.postprocess(probs, topk=topk)
    name = _name_from_id(cid)

    entry = _entry_from_id(cid) or {}
    return {
        "ok": True,
        "route": "species",
        "meta": meta,
        "prediction": {
            "class_id": cid,
            "class_name": name,
            "score": float(probs[cid]),
            "topk": [{"class_id": i, "class_name": _name_from_id(i), "score": float(p)} for i, p in top],
            # dataset_map의 원본 필드 직접 노출
            "common_name": entry.get("common_name"),
            "labels": entry.get("labels"),
            "raw_entry": entry or None,
        },
        "timing_ms": {"total": 0, "model": 0},
        "version": "v0",
    }