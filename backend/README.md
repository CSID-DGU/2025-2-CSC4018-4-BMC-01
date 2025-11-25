# 🌱 BMC Plant Backend

Flask 기반 스마트 화분 관리 REST API 서버

## 개요

102종의 식물 데이터베이스를 기반으로 식물 관리, 날씨 정보, AI 분석 기능을 제공하는 백엔드 서버입니다.

## 아키텍처

### Layered Architecture (계층형 아키텍처)

각 계층은 바로 아래 계층하고만 통신하여 의존성을 최소화합니다.

```
┌─────────────────────────────────┐
│  API Layer (app.py)             │  ← Flask 라우트, 요청/응답 처리
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│  Service Layer                  │  ← 비즈니스 로직, 외부 API 연동
│  (plant_service, user_service,  │
│   user_plant_service,           │
│   weather_service, ai_service)  │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│  Repository Layer               │  ← 데이터베이스 접근
│  (plant_repository,             │
│   user_repository,              │
│   user_plant_repository)        │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│  Model Layer                    │  ← 도메인 객체 (dataclass)
│  (Plant, User, UserPlant)       │
└─────────────────────────────────┘
```

### 의존성 주입

서비스는 생성자에서 Repository를 주입받아 테스트 용이성을 높입니다.

```python
class PlantService:
    def __init__(self, plant_repository: PlantRepository = None):
        self.plant_repo = plant_repository or PlantRepository()
```

## 실행 방법

### 1. 환경 설정

```bash
# Conda 환경 활성화
conda activate bmc
```

### 2. 서버 실행

```bash
cd backend/src
python app.py

# 서버 시작: http://localhost:5000
# CORS 활성화: 모든 origin 허용 (개발용)
```

### 3. 데이터베이스 초기화 (선택)

```bash
cd backend/database
python init_db.py  # plants.db 재생성 및 102종 데이터 삽입
```

## 프로젝트 구조

```
backend/
├── data/
│   └── house_plants_updated.json    # 식물 관리 데이터 (102종)
│
├── database/
│   ├── plants.db                    # SQLite 데이터베이스
│   ├── schema.sql                   # DB 스키마 정의
│   ├── init_db.py                   # DB 초기화 스크립트
│   ├── load_plants_data.py          # 식물 데이터 삽입
│   └── check_db_status.py           # DB 상태 확인 도구
│
└── src/
    ├── models/                      # 도메인 모델
    │   ├── plant.py                 # Plant 모델
    │   ├── user.py                  # User 모델
    │   └── user_plant.py            # UserPlant 모델
    │
    ├── repositories/                # DB 접근 계층
    │   ├── plant_repository.py
    │   ├── user_repository.py
    │   └── user_plant_repository.py
    │
    ├── services/                    # 비즈니스 로직
    │   ├── plant_service.py         # 식물 조회/검색
    │   ├── user_service.py          # 사용자 관리
    │   ├── user_plant_service.py    # 사용자 식물 CRUD
    │   ├── weather_service.py       # 기상청 API 연동
    │   └── ai_service.py            # Google Cloud AI 연동
    │
    ├── config.py                    # 설정 (DB 경로, API 키)
    └── app.py                       # Flask API 서버
```

## API 엔드포인트

### 식물 (Plants)

| Method | Endpoint | 기능 |
|--------|----------|------|
| GET | `/api/plants` | 전체 식물 목록 (102종) |
| GET | `/api/plants/<id>` | 특정 식물 조회 |
| GET | `/api/plants/search?q=<keyword>` | 식물 검색 (한/영) |

**응답 예시:**
```json
{
  "success": true,
  "count": 209,
  "data": [
    {
      "id": 301,
      "tempmax_celsius": 21,
      "tempmin_celsius": -20,
      "ideallight": "Full sun to partial shade.",
      "toleratedlight": "Partial shade.",
      "watering": "Water moderately. Allow soil to dry slightly between waterings.",
      "wateringperiod": "7",
      "ai_label_en": "alpine_sea_holly",
      "ai_label_ko": "에린지움",
      "ideallight_ko": "햇빛이 잘 드는 곳부터 반그늘까지 견딜 수 있어요",
      "toleratedlight_ko": "반그늘이 좋아요",
      "watering_ko": "물은 적당히 주시고, 물 주기 사이에 흙이 약간 마르도록 해주세요"
    },
  ]
}
```

### 사용자 (Users)

| Method | Endpoint | 기능 |
|--------|----------|------|
| POST | `/api/users` | 사용자 생성 |
| GET | `/api/users/<id>` | 사용자 조회 |

**요청 예시 (POST):**
```json
{
  "name": "홍길동"
}
```

### 사용자 식물 (User Plants)

| Method | Endpoint | 기능 |
|--------|----------|------|
| POST | `/api/users/<id>/plants` | 식물 추가 |
| GET | `/api/users/<id>/plants` | 내 식물 목록 |
| PUT | `/api/user-plants/<id>` | 식물 정보 수정 |
| PUT | `/api/user-plants/<id>/water` | 물주기 기록 |
| DELETE | `/api/user-plants/<id>` | 식물 삭제 |

**식물 추가 요청 예시:**
```json
{
  "plant_id": 5,
  "nickname": "내 앵초",
  "image": "data:image/png;base64,...",
}
```

**물주기 기록 응답:**
- `last_watered`: 현재 날짜로 자동 설정
- `next_watering`: `last_watered + wateringperiod` 자동 계산

### 날씨 (Weather)

| Method | Endpoint | 기능 |
|--------|----------|------|
| GET | `/api/weather?lat=<위도>&lon=<경도>` | GPS 위치별 날씨 정보 |

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "lat": 37.5665,
    "lon": 126.9780,
    "grid": {"nx": 60, "ny": 127},
    "temp": 15.0,
    "humidity": 72,
    "sky": "맑음",
    "precipitation": "없음",
    "rain_probability": 20
  }
}
```

**처리 과정:**
1. GPS 좌표(lat, lon) → Lambert Conformal Conic 투영 → 기상청 격자 좌표(nx, ny)
2. 기상청 API 호출 (base_time 계산: 0200, 0500, 0800, ...)
3. 다음 시간 예보 데이터 파싱 (TMP, REH, SKY, PTY, POP)

### AI 분석 (AI)

| Method | Endpoint | 기능 |
|--------|----------|------|
| POST | `/api/ai/analyze` | 식물 종 분석만 (저장 안함) |
| POST | `/api/ai/identify-species` | 식물 종 판별 + user_plant 생성 |
| POST | `/api/ai/diagnose-disease` | 병충해 진단 + disease 필드 업데이트 |

**요청 형식:** `multipart/form-data`

**identify-species 요청 예시:**
```
file: [이미지 파일]
user_id: 1
nickname: "새 식물"
image_path: "file://..."
```

**응답 예시:**
```json
{
  "success": true,
  "mode": "plant",
  "user_plant": {
    "id": 10,
    "ai_label_en": "primula",
    "ai_label_ko": "앵초",
    "confidence": 0.92
  }
}
```

**파일명 규칙:**
- `plant_*.jpg`: 식물 종 판별
- `leaf_*.jpg`: 병충해 진단

## 데이터베이스 스키마

### plants 테이블 (102종)
```sql
CREATE TABLE plants (
    id INTEGER PRIMARY KEY,
    ai_label_en TEXT,           -- AI 모델 영문 라벨
    ai_label_ko TEXT,           -- AI 모델 한글 라벨
    tempmax_celsius REAL,       -- 최대 온도 (°C)
    tempmin_celsius REAL,       -- 최소 온도 (°C)
    ideallight TEXT,            -- 이상적인 광량
    toleratedlight TEXT,        -- 허용 광량
    watering TEXT,              -- 물주기 방법
    wateringperiod INTEGER,     -- 물주기 주기 (일)
    ideallight_ko TEXT,
    toleratedlight_ko TEXT,
    watering_ko TEXT
);
```

### users 테이블
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### user_plants 테이블
```sql
CREATE TABLE user_plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plant_id INTEGER,                  -- NULL 가능 (AI 식별 식물)
    nickname TEXT,
    image TEXT,                        -- Base64 또는 파일 경로
    ai_label_en TEXT,
    ai_label_ko TEXT,
    disease TEXT,                      -- 병충해 진단 결과

    -- 관리 정보 (plants 테이블에서 복사)
    tempmax_celsius REAL,
    tempmin_celsius REAL,
    ideallight TEXT,
    toleratedlight TEXT,
    watering TEXT,

    -- 물주기 일정
    last_watered DATE,
    next_watering DATE,
    wateringperiod INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## 외부 API 연동

### 1. 기상청 단기예보 API

**API URL:** `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst`

**주요 기능:**
- GPS 좌표를 기상청 격자 좌표로 변환 (Lambert Conformal Conic 투영)
- Base Time 계산 (API 업데이트 시간: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300)
- 다음 시간대 예보 데이터 추출

**중요:** `weather_service.py`의 `_convert_to_grid()` 메서드는 복잡한 수학 계산을 포함하므로 수정 시 주의 필요

### 2. Google Cloud AI API

**API URL:** `https://smartpot-api-551846265142.asia-northeast3.run.app/infer`

**주요 기능:**
- 식물 종 판별 (plant_ 접두사 이미지)
- 병충해 진단 (leaf_ 접두사 이미지)

**응답 형식:**
```json
{
  "mode": "plant" | "disease",
  "pred_label": "primula",
  "pred_label_ko": "앵초",
  "confidence": 0.92
}
```

## 설정 (config.py)

```python
class Config:
    # 데이터베이스
    DB_PATH = "backend/database/plants.db"
    UPDATED_DATA_PATH = "backend/data/house_plants_updated.json"

    # Flask
    FLASK_HOST = "0.0.0.0"
    FLASK_PORT = 5000
    FLASK_DEBUG = True

    # 기상청 API
    WEATHER_API_KEY = "5621048a47e5a1f37bdb05a7dd8c567dca6034fbde9af3a9cd320293cfff84dc"
    WEATHER_API_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
```

**주의:** 프로덕션 배포 시 API 키를 환경 변수로 관리하는 것을 권장합니다.

## 개발자 도구

### check_db_status.py

데이터베이스 상태를 확인하는 유틸리티입니다.

```bash
cd backend/database
python check_db_status.py

# 출력: 테이블 목록, 레코드 수, 샘플 데이터
```

## 기술 스택

- **언어**: Python 3.13
- **웹 프레임워크**: Flask 3.x
- **데이터베이스**: SQLite3
- **외부 API**:
  - 기상청 단기예보 API
  - Google Cloud Run AI API

## 에러 처리

모든 API 엔드포인트는 통일된 응답 형식을 사용합니다:

**성공:**
```json
{
  "success": true,
  "data": {...},
  "count": 10
}
```

**실패:**
```json
{
  "success": false,
  "error": "에러 메시지"
}
```

## 로깅

Flask 기본 로거를 사용하며, 로그 레벨은 `config.py`의 `FLASK_DEBUG` 설정에 따라 결정됩니다.

## 개발 상태

- ✅ Layered Architecture 구현
- ✅ 102종 식물 데이터베이스
- ✅ REST API (15개 엔드포인트)
- ✅ 기상청 API 연동
- ✅ Google Cloud AI 연동
- ✅ CORS 설정 (개발용)
- ✅ 날짜 자동 계산 (물주기 일정)

## 향후 계획

- 🔲 JavaScript/Node.js로 마이그레이션 (React Native 앱 내장)
- 🔲 API 인증/인가 추가
- 🔲 환경 변수 기반 설정 관리

## 라이선스

교육 목적 프로젝트
