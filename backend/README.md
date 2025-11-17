# 🌱 BMC Plant Backend

식물 관리 앱 백엔드 서버

## 아키텍처

### Layered Architecture (계층형 아키텍처)

```
API (app.py)
    ↓
Service (비즈니스 로직)
    ↓
Repository (DB 접근)
    ↓
Model (도메인 객체)
```

## 실행

```bash
# 환경 설정
conda activate bmc

# 서버 실행
cd src
python app.py
# http://localhost:5000
```

## 프로젝트 구조

```
src/
├── models/              # 도메인 모델
├── repositories/        # DB 접근 계층
├── services/            # 비즈니스 로직
├── utils/               # 유틸리티
├── config.py            # 설정
└── app.py               # Flask API
```

## API 엔드포인트

### 식물

- `GET /api/plants` - 전체 식물 목록
- `GET /api/plants/<id>` - 특정 식물 조회
- `GET /api/plants/search?q=` - 식물 검색

### 사용자

- `POST /api/users` - 사용자 생성
- `GET /api/users/<id>` - 사용자 조회

### 사용자-식물

- `POST /api/users/<id>/plants` - 식물 추가
- `GET /api/users/<id>/plants` - 내 식물 목록
- `PUT /api/user-plants/<id>/water` - 물주기 기록
- `DELETE /api/user-plants/<id>` - 식물 삭제

### 날씨

- `GET /api/weather?lat=&lon=` - GPS 위치별 날씨

## 개발 현황

- [x] 프로젝트 초기 설정
- [x] DB 스키마 설계
- [x] 식물 데이터 삽입 (209개)
- [x] Layered Architecture 리팩토링
- [x] Flask API 서버 구축
- [x] 기상청 API 연동
- [ ] AI 서버 연동

## 기술 스택

- **아키텍처**: Layered Architecture
- **언어**: Python 3.13
- **웹 프레임워크**: Flask
- **데이터베이스**: SQLite3
- **외부 API**: 기상청 단기예보
