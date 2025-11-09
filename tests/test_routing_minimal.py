# tests/test_routing_minimal.py
import json
import tempfile
from pathlib import Path

from src.router import route

def _mk_empty(tmpdir: Path, name: str) -> Path:
    p = tmpdir / name
    p.write_bytes(b"")  # 존재만 하면 됨
    return p

def test_species_route_ok():
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        img = _mk_empty(td, "img_plant_0001.jpg")
        out = route(img, skip_morph=False, force=None)
        assert out["ok"] is True
        assert out["route"] == "species"
        assert out["prediction"]["class_id"] >= 0
        # 원본 라벨 필드 노출 확인
        assert "common_name" in out["prediction"]
        assert "labels" in out["prediction"]

def test_disease_route_ok():
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        img = _mk_empty(td, "img_leaf_0123.png")
        out = route(img, skip_morph=False, force=None)
        assert out["ok"] is True
        assert out["route"] == "disease"
        assert out["prediction"]["class_id"] >= 0
        # disease 전용 필드
        assert "disease_name" in out["prediction"]

def test_skip_morph_bypass():
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        img = _mk_empty(td, "img_leaf_9999.bmp")
        out = route(img, skip_morph=True, force=None)
        assert out["ok"] is True
        assert out["route"] == "disease"  # 우회해도 태스크는 disease
        stages = out["meta"].get("stages", [])
        # morphology 단계가 기록되지 않아야 함
        assert not any(s == "morphology" for s in stages)