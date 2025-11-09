# 🌱 BMC Plant Data Processor

식물 관리 앱 - DB 및 서버 모듈

## 목표

JSON 형식의 식물 데이터를 SQLite DB로 변환

## 기술 스택

- Python 3.13
- SQLite3

## 구조

```
data-processor/
├── data/              # 식물 정보 JSON
├── database/          # DB 스키마
└── src/              # 소스 코드
```

## 실행

```bash
# 환경 설정
conda create -n bmc python=3.13
conda activate bmc
pip install pandas numpy requests python-dotenv

# DB 초기화
python database/init_db.py
```

## 팀

- DB/서버: 정태호
- 클라이언트: 유성식
- AI: 조준혁
- UI/UX: 채희주
