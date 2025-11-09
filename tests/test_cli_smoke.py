# tests/test_cli_smoke.py
import json
import subprocess
import sys
import tempfile
from pathlib import Path

def run_cli(imgname: str):
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        img = td / imgname
        img.write_bytes(b"")  # 존재만 확인
        outdir = td / "outputs"
        cmd = [sys.executable, "-m", "src.router", str(img), "--out", str(outdir)]
        subprocess.check_call(cmd)
        out_json = outdir / (img.stem + ".json")
        assert out_json.exists()
        obj = json.loads(out_json.read_text(encoding="utf-8"))
        return obj

def test_cli_species():
    obj = run_cli("img_plant_0007.jpg")
    assert obj["route"] == "species"
    assert "prediction" in obj

def test_cli_disease():
    obj = run_cli("img_leaf_0007.jpg")
    assert obj["route"] == "disease"
    assert "prediction" in obj