# mnt/app.py
from pathlib import Path
import shutil
import uuid
import logging
import traceback

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from src.router import route
from src.config_loader import load_config

app = FastAPI()
CFG = load_config()

UPLOAD_DIR = Path("/tmp/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = CFG.get("security", {}).get("max_file_size_mb", 100) * 1024 * 1024
logger = logging.getLogger(__name__)


@app.post("/infer")
async def infer(file: UploadFile = File(...)):
    """
    단일 이미지 1장 받아서 species/disease 자동 라우팅 후 JSON 응답
    """
    # 1) 확장자 검증
    ext = Path(file.filename).suffix.lower()
    allowed = [s.lower() for s in (CFG.get("io", {}).get("input_extensions") or [])]
    if allowed and ext not in allowed:
        raise HTTPException(status_code=400, detail=f"허용되지 않는 확장자: {ext}")

    # 2) 파일 크기 검증
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"파일 크기 초과: {file_size / 1024 / 1024:.1f}MB (최대: {MAX_FILE_SIZE / 1024 / 1024}MB)"
        )

    # 3) 임시 파일로 저장
    original_stem = Path(file.filename).stem
    safe_stem = original_stem.replace(" ", "_")
    tmp_name = f"{safe_stem}_{uuid.uuid4().hex}{ext}"
    tmp_path = UPLOAD_DIR / tmp_name

    with tmp_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    # 4) 파이프라인 실행
    try:
        result = route(tmp_path, cfg=CFG)
    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        raise HTTPException(status_code=404, detail=f"파일을 찾을 수 없음: {str(e)}")
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=f"입력 검증 오류: {str(e)}")
    except (KeyError, RuntimeError) as e:
        logger.error(f"Model error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"모델 오류: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="내부 서버 오류")
    finally:
        # 5) 임시 파일 정리
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception as e:
            logger.warning(f"임시 파일 삭제 실패 {tmp_path}: {e}")

    return JSONResponse(result)