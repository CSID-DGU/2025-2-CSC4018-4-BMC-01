# 🌱 BMC Plant Backend

식물 관리 앱 백엔드 서버

## 역할

- 식물 정보 데이터베이스 관리
- REST API 서버 구축
- 기상청 단기예보 API 연동
- AI 서버 연동 (예정)

## 기술 스택

- **언어**: Python 3.13
- **데이터베이스**: SQLite3
- **웹 프레임워크**: Flask
- **외부 API**: 기상청 단기예보 API

## 실행

```bash
# 환경 설정
conda create -n bmc python=3.13
conda activate bmc
pip install flask flask-cors requests python-dotenv

# API 서버 실행
python src/app.py
# http://localhost:5000
```

## 구조

```
backend/
├── database/          # DB 스키마 및 초기화
│   ├── schema.sql
│   ├── init_db.py
│   └── plants.db
├── data/              # 식물 데이터 (JSON)
│   └── house_plants.json
└── src/               # 소스 코드
    ├── parser.py      # JSON 파싱
    ├── insert_data.py # 데이터 삽입
    ├── crud.py        # CRUD 함수
    ├── weather.py     # 기상청 API
    └── app.py         # Flask 서버
```

## 데이터베이스 스키마

### plants (식물 정보)

- 209개 실내 식물 데이터
- 온도, 물주기, 빛 조건 등

### users (사용자)

- 사용자 이름(별명)

### user_plants (사용자-식물 관계)

- 사용자가 키우는 식물
- 물주기 기록 및 일정

## API 엔드포인트

### 식물

- `GET /api/plants` - 전체 식물 목록 (209개)
- `GET /api/plants/<id>` - 특정 식물 조회
- `GET /api/plants/search?q=<keyword>` - 식물 검색

### 사용자

- `POST /api/users` - 사용자 생성
- `GET /api/users/<id>` - 사용자 조회

### 사용자-식물

- `POST /api/users/<id>/plants` - 식물 추가
- `GET /api/users/<id>/plants` - 내 식물 목록
- `PUT /api/user-plants/<id>/water` - 물주기 기록
- `DELETE /api/user-plants/<id>` - 식물 삭제

### 날씨 정보

- `GET /api/weather` - 날씨 조회 (기본: 서울)
- `GET /api/weather?lat=<위도>&lon=<경도>` - GPS 위치별 날씨

## 개발 현황

- [x] 프로젝트 초기 설정
- [x] DB 스키마 설계 (plants, users, user_plants)
- [x] DB 초기화 스크립트 작성
- [x] JSON 파싱 기능 구현
- [x] 식물 데이터 삽입 (209개)
- [x] CRUD 함수 구현 (사용자/식물 관리)
- [x] API 서버 구축
- [x] 기상청 API 연동
- [ ] AI 서버 연동

## 주요 기능

### 식물 데이터베이스

- 209개 실내 식물 정보
- 물주기, 온도, 습도, 빛 조건 등

### 사용자 관리

- 사용자별 식물 관리
- 물주기 일정 자동 계산
- 커스텀 물주기 주기 설정

### 날씨 연동

- 기상청 단기예보 API
- GPS 좌표 → 격자 좌표 자동 변환
- 온도, 습도, 강수확률 제공
