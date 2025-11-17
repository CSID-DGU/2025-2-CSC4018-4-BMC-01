# mnt/app.py
from pathlib import Path
import shutil
import uuid

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from src.router import route, load_config

app = FastAPI()

CFG = load_config()

UPLOAD_DIR = Path("/tmp/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.post("/infer")
async def infer(file: UploadFile = File(...)):
    """
    단일 이미지 1장 받아서 species/disease 자동 라우팅 후 JSON 응답
    """
    # 1) 확장자 검증 (config.io.input_extensions 기준)
    ext = Path(file.filename).suffix.lower()
    allowed = [s.lower() for s in (CFG.get("io", {}).get("input_extensions") or [])]
    if allowed and ext not in allowed:
        raise HTTPException(status_code=400, detail=f"허용되지 않는 확장자: {ext}")

    # 2) 임시 파일로 저장
    tmp_name = f"{uuid.uuid4().hex}{ext}"
    tmp_path = UPLOAD_DIR / tmp_name
    with tmp_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    # 3) 파이프라인 실행
    try:
        result = route(tmp_path, cfg=CFG)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # 4) 임시 파일 정리
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass

    return JSONResponse(result)