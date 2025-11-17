# 1) 베이스 이미지
FROM python:3.11-slim

# 2) 시스템 라이브러리 (Pillow, OpenCV 등 대비)
RUN apt-get update && apt-get install -y \
    libglib2.0-0 libsm6 libxrender1 libxext6 \
    && rm -rf /var/lib/apt/lists/*

# 3) 코드 복사
#   - /mnt/src 에 전체 레포를 넣어둔다 (config의 /mnt/src 경로와 일치)
WORKDIR /mnt/src
COPY . /mnt/src

# 4) Python 의존성 설치
RUN pip install --no-cache-dir -r requirements.txt

# 5) Cloud Run은 PORT 환경변수를 넘겨줌
ENV PORT=8080

# 6) 컨테이너 포트
EXPOSE 8080

# 7) FastAPI 서버 실행
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]