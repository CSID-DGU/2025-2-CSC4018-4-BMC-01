# 🌱 BMC Plant - 스마트 화분 관리 앱

React Native + Flask 기반의 식물 관리 통합 플랫폼

[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-black)](https://expo.dev/)
[![Flask](https://img.shields.io/badge/Flask-3.x-lightgrey)](https://flask.palletsprojects.com/)
[![Python](https://img.shields.io/badge/Python-3.13-blue)](https://www.python.org/)

## 프로젝트 개요

BMC Plant는 식물 관리를 돕는 스마트 모바일 애플리케이션입니다. 209종의 식물 데이터베이스를 기반으로 물주기 알림, 날씨 정보, AI 기반 병충해 진단 기능을 제공합니다.

### 주요 기능

- 📱 **식물 관리**: 내 화분 등록 및 물주기 일정 관리
- 🌦️ **날씨 정보**: GPS 기반 실시간 날씨 정보 (기상청 API 연동)
- 🤖 **AI 분석**: Google Cloud AI 기반 식물 종 판별 및 병충해 진단
- 📅 **캘린더**: 물주기 일정 캘린더 뷰
- 🔔 **알림**: 물주기 시간 푸시 알림

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────┐
│           React Native Frontend                  │
│   (Expo 54 + React Navigation 7)                │
└─────────────────┬───────────────────────────────┘
                  │ HTTP API
┌─────────────────▼───────────────────────────────┐
│             Flask Backend                        │
│  (Layered Architecture: API→Service→Repo→Model) │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
    SQLite   기상청API   Google Cloud AI
    (102종)    (날씨)      (식물/병충해)
```

### Layered Architecture (Backend)

```
API Layer (Flask Routes)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Database Access)
    ↓
Model Layer (Domain Objects)
```

## 프로젝트 구조

```
2025-2-CSC4018-4-BMC-01/
├── backend/                # Flask 백엔드
│   ├── data/              # 식물 데이터 (JSON)
│   ├── database/          # SQLite DB 및 스키마
│   └── src/
│       ├── models/        # 도메인 모델 (Plant, User, UserPlant)
│       ├── repositories/  # DB 접근 계층
│       ├── services/      # 비즈니스 로직
│       ├── config.py      # 설정 (API 키, DB 경로)
│       └── app.py         # Flask API 서버
│
└── frontend/              # React Native 프론트엔드
    ├── src/
    │   ├── config/        # API URL 설정
    │   └── services/      # API 클라이언트
    ├── screens/           # 화면 컴포넌트 (7개)
    ├── navigation/        # React Navigation 설정
    ├── utils/            # 유틸리티 (Storage, Notifications)
    └── App.js            # 앱 진입점
```

## 시작하기

### 필수 요구사항

- **Backend**: Python 3.13, Conda
- **Frontend**: Node.js 18+, npm, Expo CLI
- **개발 환경**: Android Studio (Android) 또는 Xcode (iOS)

### 1. 백엔드 설정

```bash
# 백엔드 서버 실행
cd backend/src
python app.py

# 서버: http://localhost:5000
```

**주요 API 엔드포인트:**
- `GET /api/plants` - 전체 식물 목록 (209종)
- `GET /api/users/<id>/plants` - 사용자 식물 목록
- `PUT /api/user-plants/<id>/water` - 물주기 기록
- `GET /api/weather?lat=&lon=` - 날씨 정보
- `POST /api/ai/identify-species` - AI 식물 종 판별
- `POST /api/ai/diagnose-disease` - AI 병충해 진단

### 2. 프론트엔드 설정

```bash
# 의존성 설치
cd frontend
npm install

# API URL 설정 (src/config/index.js)
# Android 에뮬레이터: http://10.0.2.2:5000/api
# iOS 시뮬레이터: http://localhost:5000/api
# 실제 기기: http://[PC_IP]:5000/api

# Expo 실행
npx expo start

# 실행 옵션:
# - 'a' 키: Android 에뮬레이터
# - 'i' 키: iOS 시뮬레이터
# - QR 코드: Expo Go 앱 (실제 기기)
```

### 3. 데이터베이스 초기화 (선택)

```bash
cd backend/database
python init_db.py  # plants.db 재생성 및 209종 데이터 삽입
```

## 화면 구성

| 화면 | 파일 | 기능 |
|------|------|------|
| 🏠 홈 | `HomeScreen.js` | 날씨, 내 화분 슬라이드, 물주기 알림 |
| 🪴 내 화분 | `MyPlantListScreen.js` | 화분 목록 그리드, 즐겨찾기 |
| 📝 화분 상세 | `PlantDetailScreen.js` | 상세 정보, 수정, 삭제, 병충해 분석 |
| ➕ 화분 추가/수정 | `PlantEditorScreen.js` | 이름, 사진, AI 분석 등록 |
| 📅 캘린더 | `CalendarScreen.js` | 물주기 일정 캘린더 |
| 🔬 병충해 결과 | `DiseaseResultScreen.js` | AI 분석 결과 표시 |
| ⚙️ 설정 | `SettingsScreen.js` | 알림 설정, 앱 정보 |

## 기술 스택

### Frontend
- **프레임워크**: React Native 0.81 + Expo 54
- **네비게이션**: React Navigation 7 (Bottom Tabs + Stack)
- **상태 관리**: React Hooks (useState, useEffect)
- **저장소**: AsyncStorage (사용자 ID), Backend API
- **카메라/이미지**: expo-image-picker, expo-camera
- **위치**: expo-location
- **알림**: expo-notifications
- **캘린더**: react-native-calendars

### Backend
- **언어**: Python 3.13
- **웹 프레임워크**: Flask 3.x
- **데이터베이스**: SQLite3 (plants.db)
- **외부 API**:
  - 기상청 단기예보 API (날씨)
  - Google Cloud Run AI API (식물 종 판별, 병충해 진단)

## 외부 API 연동

### 기상청 단기예보 API
- **용도**: GPS 위치 기반 실시간 날씨 정보
- **변환**: Lambert Conformal Conic 투영으로 GPS → 기상청 격자 좌표

### Google Cloud AI API
- **용도**: 식물 종 판별 및 병충해 진단
- **엔드포인트**: `https://smartpot-api-551846265142.asia-northeast3.run.app/infer`
- **입력**: 식물/잎사귀 이미지 (multipart/form-data)
- **출력**: 예측 라벨(한/영), 신뢰도

## 개발 현황

### 완료된 기능
- ✅ 백엔드 Layered Architecture 구축
- ✅ 209종 식물 데이터베이스
- ✅ Flask REST API (15개 엔드포인트)
- ✅ React Native UI (7개 화면)
- ✅ 기상청 API 연동
- ✅ Google Cloud AI 연동
- ✅ 물주기 알림 시스템
- ✅ 사진 기반 식물 등록
- ✅ 병충해 진단 기능

### 개발 예정
- 🔲 JavaScript 백엔드로 마이그레이션 (앱 내장)
- 🔲 Android APK 빌드 (Expo EAS Build)
- 🔲 오프라인 지원 강화

## 개발자 도구

### check_db_status.py
데이터베이스 상태 확인 도구:
```bash
cd backend/database
python check_db_status.py
```

## 주의사항

### 개발 환경
- 실제 기기 테스트 시 PC와 같은 WiFi 네트워크 필요
- 백엔드 서버(`python app.py`)가 실행 중이어야 API 호출 가능
- Android 에뮬레이터는 `10.0.2.2`로 localhost 접근

### API 키
- 기상청 API 키: `backend/src/config.py`에 하드코딩
- Google Cloud AI URL: `backend/src/services/ai_service.py`에 하드코딩
- 프로덕션 배포 시 환경변수로 관리 권장

## 라이선스

이 프로젝트는 교육 목적으로 제작되었습니다.

## 기여

2025-2 CSC4018-4-BMC-01 팀 프로젝트
