# tests/test_model_fields.py
import tempfile
from pathlib import Path
from src.pipelines.pot_species import run_infer as run_species
from src.pipelines.leaf_disease import run_infer as run_disease

def _mk_empty(tmpdir: Path, name: str) -> Path:
    p = tmpdir / name
    p.write_bytes(b"")
    return p

def test_prediction_fields_present():
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        s = run_species(str(_mk_empty(td, "img_plant_a.jpg")))
        d = run_disease(str(_mk_empty(td, "img_leaf_b.jpg")))
        for obj, route in [(s, "species"), (d, "disease")]:
            assert obj["route"] == route
            pred = obj["prediction"]
            # 공통 키
            for k in ["class_id", "class_name", "score", "topk"]:
                assert k in pred
            # dataset_map 원본 키가 존재해야 함(None 허용)
            assert "common_name" in pred
            assert "labels" in pred
        # disease 전용 키
        assert "disease_name" in d["prediction"]