# 🌱 BMC Plant - 스마트 화분 관리 앱

React Native + expo-sqlite 기반의 독립형 식물 관리 애플리케이션

[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-black)](https://expo.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-3-green)](https://www.sqlite.org/)

## 프로젝트 개요

BMC Plant는 식물 관리를 돕는 스마트 모바일 애플리케이션입니다. 102종의 식물 데이터베이스를 기반으로 물주기 알림, 날씨 정보, AI 기반 병충해 진단 기능을 제공합니다.

### 주요 기능

- 📱 **식물 관리**: 내 화분 등록 및 물주기 일정 관리 (완전 오프라인)
- 🌦️ **날씨 정보**: GPS 기반 실시간 날씨 정보 (기상청 API 직접 호출)
- 🤖 **AI 분석**: Google Cloud AI 기반 식물 종 판별 및 병충해 진단 (직접 호출)
- 📅 **캘린더**: 물주기 일정 캘린더 뷰
- 🔔 **알림**: 물주기 시간 푸시 알림

## 시스템 아키텍처 (2025.11 최신)

```
┌─────────────────────────────────────────────────┐
│           React Native Frontend                  │
│        (Expo 54 + expo-sqlite)                  │
│                                                  │
│  ┌──────────────────────────────────────┐      │
│  │   expo-sqlite (로컬 DB)              │      │
│  │   - 102종 식물 정보 (완전 오프라인)    │      │
│  │   - 사용자 정보                        │      │
│  │   - 사용자 화분 관리                   │      │
│  └──────────────────────────────────────┘      │
└────────────┬────────────┬──────────────────────┘
             │            │
             │ (온라인)   │ (온라인)
             ▼            ▼
    Google Cloud AI   기상청 API
    (식물/병충해)      (날씨)
```

### 핵심 변경사항

**이전 (Flask 백엔드 필요):**
```
React Native → Flask API → SQLite/외부 API
```

**현재 (완전 독립형):**
```
React Native → expo-sqlite (오프라인 DB)
             → Google Cloud AI (직접 호출)
             → 기상청 API (직접 호출)
```

## 프로젝트 구조

```
2025-2-CSC4018-4-BMC-01/
├── backend/               # 참고용 (더 이상 실행 불필요)
│   ├── database/
│   │   └── plants.db      # 102종 식물 DB (프론트엔드로 복사됨)
│   └── src/               # 로직 참고용
│
└── frontend/              # React Native 독립형 앱
    ├── assets/
    │   └── database/
    │       └── plants.db  # 앱 내장 DB (102종)
    ├── src/
    │   ├── config/        # API URL 설정
    │   └── services/
    │       ├── localDbService.js    # expo-sqlite 로컬 DB
    │       ├── aiService.js         # Google Cloud AI 직접 호출
    │       ├── weatherService.js    # 기상청 API 직접 호출
    │       ├── plantService.js      # 식물 CRUD (로컬 DB)
    │       ├── userService.js       # 사용자 관리 (로컬 DB)
    │       └── userPlantService.js  # 화분 관리 (로컬 DB)
    ├── context/          # 전역 상태 관리
    │   └── PlantContext.js          # 식물 데이터 캐싱 (5초)
    ├── screens/          # 화면 컴포넌트 (8개)
    ├── components/       # 재사용 컴포넌트
    ├── constants/        # 디자인 시스템 상수
    ├── navigation/       # React Navigation 설정
    ├── utils/            # 유틸리티
    └── App.js            # 앱 진입점 (DB 초기화, PlantProvider)
```

## 시작하기

### 필수 요구사항

- **Node.js**: 18 이상
- **npm**: 최신 버전
- **Expo Go 앱**: Android/iOS 실제 기기용
- **모바일 데이터 또는 WiFi**: AI 분석 및 날씨 정보용

### 1. 의존성 설치

```bash
cd frontend
npm install
```

**주요 의존성:**
```json
{
  "expo-sqlite": "~15.0.0",      // 로컬 SQLite DB
  "expo-asset": "~11.0.0",       // 에셋 관리
  "expo-file-system": "~19.0.0", // 파일 시스템
  "expo-image-picker": "~17.0.0",// 이미지 선택
  "expo-location": "~19.0.0",    // GPS 위치
  "expo-notifications": "~0.32.0" // 푸시 알림
}
```

### 2. 앱 실행

```bash
cd frontend
npx expo start --tunnel
```

**실행 옵션:**
- **Expo Go (권장)**: 실제 Android/iOS 기기에서 QR 코드 스캔
- **Android 에뮬레이터**: 'a' 키 입력
- **iOS 시뮬레이터**: 'i' 키 입력 (Mac 전용)

### 3. 첫 실행 시

앱 시작 시 자동으로:
1. ✅ `assets/database/plants.db` → 앱 내부 디렉토리로 복사
2. ✅ expo-sqlite로 데이터베이스 열기
3. ✅ 102종 식물 정보 로드
4. ✅ 사용자 생성 (AsyncStorage에 ID 저장)

## 주요 기능 상세

### 오프라인 기능 (expo-sqlite)

- 내 화분 조회/삭제
- 물주기 기록
- 관리 레포트 열람
- 알림 설정

### 온라인 기능 (모바일 데이터 필요)

**1. AI 식물/병충해 분석**
- **API**: Google Cloud AI
- **URL**: `https://smartpot-api-551846265142.asia-northeast3.run.app/infer`
- **기능**: 사진으로 식물 종 판별, 잎사귀 병충해 진단

**2. 날씨 정보**
- **API**: 기상청 단기예보 API
- **URL**: `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst`
- **기능**: GPS 위치 기반 실시간 날씨 (온도, 습도, 강수량, 하늘 상태)
- **좌표 변환**: Lambert Conformal Conic 투영 (JavaScript 구현)

## 화면 구성

| 화면 | 파일 | 기능 | 데이터 갱신 |
|------|------|------|------------|
| 🏠 홈 | `HomeScreen.js` | 날씨, 내 화분 슬라이드, 물주기 알림 |
| 🪴 내 화분 | `MyPlantListScreen.js` | 화분 목록 그리드, 즐겨찾기 |
| 📝 화분 상세 | `PlantDetailScreen.js` | 상세 정보, 수정, 삭제, 병충해 분석 |
| ➕ 화분 추가/수정 | `PlantEditorScreen.js` | 이름, 사진, AI 분석 등록 |
| 📅 캘린더 | `CalendarScreen.js` | 물주기 일정 캘린더 |
| 📊 레포트 | `ReportScreen.js` | 30일 물주기 성실도 통계 |
| 🔬 병충해 결과 | `DiseaseResultScreen.js` | AI 분석 결과 표시 |
| ⚙️ 알림 설정 | `NotificationSettingScreen.js` | 알림 설정, 앱 정보 |

## 기술 스택

### Frontend (독립형 앱)
- **프레임워크**: React Native 0.81 + Expo 54
- **네비게이션**: React Navigation 7 (Bottom Tabs + Stack)
- **상태 관리**: React Hooks (useState, useEffect)
- **로컬 DB**: expo-sqlite (SQLite 3)
- **로컬 저장소**: AsyncStorage (사용자 ID)
- **카메라/이미지**: expo-image-picker, expo-camera
- **위치**: expo-location
- **알림**: expo-notifications
- **캘린더**: react-native-calendars

### Backend (참고용, 실행 불필요)
- **언어**: Python 3.13
- **웹 프레임워크**: Flask 3.x
- **데이터베이스**: SQLite3 (plants.db)
- **용도**: 로직 참고 및 DB 스키마 관리

## 데이터베이스 스키마

### plants 테이블 (102종)
```sql
CREATE TABLE plants (
    id INTEGER PRIMARY KEY,
    common_name TEXT NOT NULL,      -- 일반명
    latin_name TEXT,                -- 학명
    ai_label_en TEXT,               -- AI 영문 라벨
    ai_label_ko TEXT,               -- AI 한글 라벨
    category TEXT,                  -- 카테고리
    wateringperiod INTEGER,         -- 물주기 주기(일)
    ideallight TEXT,                -- 이상적인 광량
    toleratedlight TEXT,            -- 허용 광량
    watering TEXT,                  -- 물주기 설명
    tempmin_celsius REAL,           -- 최저 온도(°C)
    tempmax_celsius REAL            -- 최고 온도(°C)
);
```

### users 테이블
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### user_plants 테이블
```sql
CREATE TABLE user_plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plant_id INTEGER,
    nickname TEXT,
    image TEXT,
    ai_label_en TEXT,
    ai_label_ko TEXT,
    wateringperiod INTEGER,
    last_watered TEXT,              -- YYYY-MM-DD
    next_watering TEXT,             -- YYYY-MM-DD
    disease TEXT,                   -- 병충해 정보
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plant_id) REFERENCES plants(id)
);
```

## API 통신 흐름

### 1. AI 식물 종 판별
```
사용자 → 꽃 사진 카메라/갤러리 선택
      → aiService.identifySpecies()
      → Google Cloud AI API (multipart/form-data)
      → 응답: pred_label, pred_label_ko, confidence
      → localDbService.searchPlants(pred_label_ko)
      → localDbService.addUserPlant()
      → DB 저장 완료
```

### 2. 병충해 진단
```
사용자 → 잎사귀 사진 카메라/갤러리 선택
      → aiService.diagnoseDisease()
      → Google Cloud AI API (multipart/form-data)
      → 응답: pred_label_ko, confidence
      → localDbService.updateDisease()
      → DB 업데이트 완료
```

### 3. 날씨 조회
```
사용자 → 홈 화면 진입
      → expo-location으로 GPS 좌표 획득
      → weatherService.getWeather(lat, lon)
      → convertToGrid(lat, lon) [좌표 변환]
      → 기상청 API 호출
      → 응답: 온도, 습도, 하늘 상태, 강수 형태
      → UI 표시
```

### 4. 물주기 일정 계산
```
사용자 → 화면 진입 (Home/Calendar/Report/PlantDetail)
      → fetchPlants() 호출 (Storage.js)
      → localDbService.getUserPlants() → DB 조회
      → 물주기 주기 결정:
      → nextWater 계산: last_watered + WateringPeriod
      → UI 표시 (nextWater 우선, 없으면 next_watering)
```

## 개발 현황

### 완료된 기능 (2025.11)
- ✅ 독립형 아키텍처 전환 (Flask 서버 불필요)
- ✅ expo-sqlite 로컬 DB 통합
- ✅ 102종 식물 데이터베이스 내장
- ✅ Google Cloud AI 직접 호출
- ✅ 기상청 API 직접 호출 (좌표 변환 포함)
- ✅ React Native UI (8개 화면)
- ✅ 물주기 알림 시스템
- ✅ 사진 기반 식물 등록
- ✅ 병충해 진단 기능
- ✅ 물주기 주기 자동 계산 (DB 우선순위: 커스텀 > 식물별 > 기본값)
- ✅ 레포트 화면 (30일 물주기 성실도 통계)
- ✅ 전역 상태 관리 (PlantContext, 5초 캐싱)

## 빌드 및 배포

### Development Build
```bash
# Android APK
npx expo run:android

# iOS IPA (Mac 전용)
npx expo run:ios
```

### Production Build (EAS Build)
```bash
# EAS CLI 설치
npm install -g eas-cli

# 프로젝트 설정
eas build:configure

# Android 빌드
eas build --platform android

# iOS 빌드 (Mac 전용)
eas build --platform ios
```

## 주의사항

### 네트워크 조건
- ⚠️ **온라인 필요**: AI 분석, 날씨 정보 조회에 네트워크 필요

### 데이터 관리
- 로컬 DB는 앱 삭제 시 함께 삭제됨
- AsyncStorage의 사용자 ID도 앱 삭제 시 초기화

### API 키
- 기상청 API 키: `frontend/src/services/weatherService.js`에 하드코딩
- Google Cloud AI URL: `frontend/src/services/aiService.js`에 하드코딩
- 프로덕션 배포 시 환경변수로 관리 권장

## 디버깅

### 콘솔 로그 확인
```bash
npx expo start
# 터미널에서 로그 확인 또는
# React Native Debugger 사용
```

### 주요 로그 포인트
- `[localDbService]`: DB 초기화 및 쿼리
- `[aiService]`: AI API 호출 및 응답
- `[weatherService]`: 날씨 API 호출 및 좌표 변환
- `[App]`: 앱 초기화

## 라이선스

이 프로젝트는 교육 목적으로 제작되었습니다.

## 기여

2025-2 CSC4018-4-BMC-01 팀 프로젝트
