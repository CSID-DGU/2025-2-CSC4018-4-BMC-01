# src/models/disease.py
from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Tuple
import math
import os
import json

try:
    import yaml
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

_DISEASE_MAP: Dict[int, str] | None = None

def _load_disease_map() -> Dict[int, str]:
    global _DISEASE_MAP
    if _DISEASE_MAP is not None:
        return _DISEASE_MAP

    mp: Dict[int, str] = {}
    # 1순위: YAML
    p_yml = Path("/mnt/data/dataset_map_disease.yaml")
    if p_yml.exists() and yaml is not None:
        obj = yaml.safe_load(p_yml.read_text(encoding="utf-8"))
        # 예상 스키마:
        # classes:
        #   - id: 0
        #     common_name: "Healthy"
        #     disease_name: "None"
        if isinstance(obj, dict) and "classes" in obj:
            for it in obj["classes"]:
                cid = int(it.get("id"))
                name = str(
                    it.get("disease_name")
                    or it.get("common_name")
                    or it.get("name")
                    or f"disease_{cid}"
                )
                mp[cid] = name
        else:
            # 단순 dict{id: name}도 수용
            if isinstance(obj, dict):
                for k, v in obj.items():
                    try:
                        mp[int(k)] = str(v)
                    except Exception:
                        continue
    # 2순위: JSON 백업
    if not mp:
        p_json = Path("/mnt/data/dataset_map_disease.json")
        if p_json.exists():
            obj = json.loads(p_json.read_text(encoding="utf-8"))
            if "classes" in obj:
                for it in obj["classes"]:
                    cid = int(it.get("id"))
                    name = str(it.get("disease_name") or it.get("name") or f"disease_{cid}")
                    mp[cid] = name
            else:
                for k, v in obj.items():
                    try:
                        mp[int(k)] = str(v)
                    except Exception:
                        continue

    _DISEASE_MAP = mp
    return _DISEASE_MAP

_DISEASE_ENTRY: dict[int, dict] | None = None

def _load_disease_entry() -> dict[int, dict]:
    global _DISEASE_ENTRY
    if _DISEASE_ENTRY is not None:
        return _DISEASE_ENTRY
    entries: dict[int, dict] = {}

    p_yml = Path("/mnt/data/dataset_map_disease.yaml")
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
                    entries[int(k)] = {"id": int(k), "disease_name": str(v)}
                except Exception:
                    continue
    else:
        p_json = Path("/mnt/data/dataset_map_disease.json")
        if p_json.exists():
            obj = json.loads(p_json.read_text(encoding="utf-8"))
            if isinstance(obj, dict) and "classes" in obj:
                for it in obj["classes"]:
                    try:
                        entries[int(it["id"])] = dict(it)
                    except Exception:
                        continue
            elif isinstance(obj, dict):
                for k, v in obj.items():
                    try:
                        entries[int(k)] = {"id": int(k), "disease_name": str(v)}
                    except Exception:
                        continue

    _DISEASE_ENTRY = entries
    return _DISEASE_ENTRY

def _name_from_id(cid: int) -> str:
    mp = _load_disease_map()
    return mp.get(cid, f"disease_{cid}")


def _entry_from_id(cid: int) -> dict | None:
    return _load_disease_entry().get(cid)

# ---------- 모델 래퍼 ----------

from dataclasses import dataclass

@dataclass
class DiseaseModelConfig:
    num_classes: int = 20   # 실제 클래스 수로 교체 예정
    ckpt_path: str = ""     # 가중치 경로

class DiseaseModel:
    def __init__(self, cfg: DiseaseModelConfig | None = None) -> None:
        self.cfg = cfg or DiseaseModelConfig()
        self._loaded = False
        self._backend = None

    def load(self) -> None:
        if self.cfg.ckpt_path and Path(self.cfg.ckpt_path).exists():
            # TODO: 실제 런타임 로드(Torch/ONNX 등)
            self._backend = object()
        self._loaded = True

    def preprocess(self, img: Any) -> Any:
        # TODO: 텐서 변환, 정규화 등
        return img

    def infer_logits(self, x: Any) -> List[float]:
        n = max(1, self.cfg.num_classes)
        seed = ""
        if isinstance(x, dict):
            seed = str(x.get("path") or "")
        h = _stable_hash(seed[::-1])  # species와 분리 위해 역순 해시
        logits = []
        cur = h or 987654321
        for _ in range(n):
            cur = (1664525 * cur + 1013904223) & 0xFFFFFFFF
            logits.append((cur % 1000) / 100.0)
        return logits

    def postprocess(self, probs: List[float], topk: int = 3) -> Tuple[int, List[Tuple[int, float]]]:
        idx = sorted(range(len(probs)), key=lambda i: probs[i], reverse=True)
        top = [(i, probs[i]) for i in idx[:topk]]
        return (top[0][0], top)

# ---------- 공개 API ----------

_DEFAULT_MODEL: DiseaseModel | None = None

def _ensure_model() -> DiseaseModel:
    global _DEFAULT_MODEL
    if _DEFAULT_MODEL is None:
        ckpt = os.getenv("DISEASE_CKPT", "")
        num_classes = int(os.getenv("DISEASE_NUM_CLASSES", "20") or "20")
        _DEFAULT_MODEL = DiseaseModel(DiseaseModelConfig(num_classes=num_classes, ckpt_path=ckpt))
        _DEFAULT_MODEL.load()
    return _DEFAULT_MODEL

def infer(img: Any, meta: Dict, *, topk: int = 3) -> Dict:
    """
    병충해 모델 표준 인터페이스.
    router의 --skip-morph 우회에서도 이 함수를 직접 호출한다.
    """
    meta = dict(meta)
    stages = list(meta.get("stages") or [])
    stages.append("model:disease")
    meta["stages"] = stages

    model = _ensure_model()
    x = model.preprocess(img)
    logits = model.infer_logits(x)
    probs = _safe_softmax(logits)
    cid, top = model.postprocess(probs, topk=topk)
    name = _name_from_id(cid)

    return {
        "ok": True,
        "route": "disease",
        "meta": meta,
        "prediction": {
            "class_id": cid,
            "class_name": name,
            "score": float(probs[cid]),
            "topk": [{"class_id": i, "class_name": _name_from_id(i), "score": float(p)} for i, p in top],
        },
        "timing_ms": {"total": 0, "model": 0},
        "version": "v0",
    }