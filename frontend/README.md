# 🌱 BMC Plant Frontend

React Native + expo-sqlite 기반의 독립형 식물 관리 애플리케이션

[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-black)](https://expo.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-3-green)](https://www.sqlite.org/)

## 앱 개요

BMC Plant는 식물 관리를 돕는 스마트 모바일 애플리케이션입니다. 102종의 식물 데이터베이스를 기반으로 물주기 알림, 날씨 정보, AI 기반 병충해 진단 기능을 제공합니다.

**⚠️ 2025.11 업데이트:** 백엔드 Flask 서버 없이 완전히 독립적으로 작동합니다!

## 아키텍처

### 독립형 구조 (Backend-Free)

```
App.js (진입점 + DB 초기화)
   ↓
expo-sqlite (로컬 SQLite DB)
   ├── plants (102종 식물 정보)
   ├── users (사용자 정보)
   └── user_plants (내 화분 관리)
   ↓
Screens (8개 화면)
   ↓
Services
   ├── localDbService.js (로컬 DB 작업)
   ├── aiService.js (Google Cloud AI 직접 호출)
   └── weatherService.js (기상청 API 직접 호출)
```

### 네비게이션 구조

```
Bottom Tab Navigator
├── Home Tab (Stack)
│   └── HomeScreen (날씨 + 슬라이드)
├── My Plants Tab (Stack)
│   ├── MyPlantListScreen (목록)
│   ├── PlantDetailScreen (상세)
│   ├── PlantEditorScreen (추가/수정)
│   └── DiseaseResultScreen (병충해)
├── Calendar Tab
│   └── CalendarScreen (물주기 캘린더)
├── Report Tab
│   └── ReportScreen (성실도 통계)
└── Settings Tab
    └── SettingsScreen (알림 설정)
```

## 실행 방법

### 1. 의존성 설치

```bash
cd frontend
npm install
```

**주요 의존성:**
```json
{
  "expo-sqlite": "~15.0.0",        // 로컬 SQLite DB
  "expo-asset": "~11.0.0",         // 에셋 관리
  "expo-file-system": "~19.0.0",   // 파일 시스템
  "expo-image-picker": "~17.0.0",  // 이미지 선택
  "expo-location": "~19.0.0",      // GPS 위치
  "expo-notifications": "~0.32.0"  // 푸시 알림
}
```

### 2. Expo 개발 서버 실행

```bash
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

## 프로젝트 구조

```
frontend/
├── assets/
│   └── database/
│       └── plants.db              # 앱 내장 DB (102종)
│
├── src/
│   ├── config/
│   │   └── index.js               # 앱 설정
│   └── services/
│       ├── localDbService.js      # expo-sqlite 로컬 DB
│       ├── aiService.js           # Google Cloud AI 직접 호출
│       ├── weatherService.js      # 기상청 API 직접 호출
│       ├── plantService.js        # 식물 CRUD (로컬 DB)
│       ├── userService.js         # 사용자 관리 (로컬 DB)
│       └── userPlantService.js    # 화분 관리 (로컬 DB)
│
├── screens/                       # 화면 컴포넌트 (8개)
│   ├── HomeScreen.js              # 홈 (날씨, 슬라이드, 알림)
│   ├── MyPlantListScreen.js       # 내 화분 목록 그리드
│   ├── PlantDetailScreen.js       # 화분 상세 정보
│   ├── PlantEditorScreen.js       # 화분 추가/수정
│   ├── CalendarScreen.js          # 물주기 캘린더
│   ├── ReportScreen.js            # 성실도 통계 레포트
│   ├── DiseaseResultScreen.js     # 병충해 진단 결과
│   └── SettingsScreen.js          # 설정 (알림)
│
├── navigation/
│   └── AppNavigator.js            # React Navigation 설정
│
├── utils/
│   ├── Storage.js                 # fetchPlants + 메타데이터 관리
│   └── notificationService.js     # 푸시 알림 서비스
│
├── App.js                         # 앱 진입점 (DB 초기화)
├── app.json                       # Expo 설정
└── package.json                   # 의존성
```

## 화면 상세

### 1. HomeScreen (홈)
- **위치**: `screens/HomeScreen.js`
- **기능**:
  - GPS 기반 실시간 날씨 정보 (기상청 API 직접 호출)
  - 내 화분 가로 슬라이드
  - 오늘/내일 물주기 알림 리스트
- **데이터 갱신**: focus 시 자동 갱신

### 2. MyPlantListScreen (내 화분)
- **위치**: `screens/MyPlantListScreen.js`
- **기능**:
  - 2열 그리드 레이아웃
  - 즐겨찾기 표시 (별 아이콘)
  - 물주기 일정 표시 (D-day)
- **데이터 갱신**: focus 시 자동 갱신

### 3. PlantDetailScreen (화분 상세)
- **위치**: `screens/PlantDetailScreen.js`
- **기능**:
  - 화분 상세 정보 (닉네임, 사진, 물주기 주기)
  - 최근 물 준 날짜 수정 (DateTimePicker)
  - 사진 변경 (갤러리/카메라)
  - 병충해 분석 버튼
  - 화분 삭제
- **데이터 갱신**: 진입 시 최신 데이터 로드

### 4. PlantEditorScreen (화분 추가/수정)
- **위치**: `screens/PlantEditorScreen.js`
- **기능**:
  - 사진 선택 (갤러리/카메라)
  - AI 식물 종 판별 (Google Cloud AI)
  - 닉네임, 물주기 주기 설정
  - 식물 정보 저장

### 5. CalendarScreen (캘린더)
- **위치**: `screens/CalendarScreen.js`
- **기능**:
  - react-native-calendars 사용
  - 물주기 일정 표시 (O: 예정, ●: 완료)
  - 날짜별 화분 목록 표시
- **데이터 갱신**: focus 시 자동 갱신

### 6. ReportScreen (레포트)
- **위치**: `screens/ReportScreen.js`
- **기능**:
  - 최근 30일 물주기 성실도 통계
  - 평균 성실도, 식물 수, 물 준 횟수
  - 식물별 성실도 바 그래프
  - 식물별 관리 지표 카드
- **데이터 갱신**: focus 시 자동 갱신

### 7. DiseaseResultScreen (병충해 진단)
- **위치**: `screens/DiseaseResultScreen.js`
- **기능**:
  - 잎사귀 사진 촬영/선택
  - AI 병충해 진단 (Google Cloud AI)
  - 진단 결과 표시 (병명, 신뢰도)

### 8. SettingsScreen (설정)
- **위치**: `screens/SettingsScreen.js`
- **기능**:
  - 알림 on/off 토글
  - 알림 시간 설정
  - 앱 정보

## 데이터베이스 (expo-sqlite)

### plants 테이블 (102종)
```sql
CREATE TABLE plants (
    id INTEGER PRIMARY KEY,
    tempmax_celsius REAL,
    tempmin_celsius REAL,
    ideallight TEXT,
    toleratedlight TEXT,
    watering TEXT,
    wateringperiod INTEGER,
    ai_label_en TEXT,
    ai_label_ko TEXT,
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
    last_watered TEXT,
    next_watering TEXT,
    disease TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plant_id) REFERENCES plants(id)
);
```

## 서비스 모듈

### localDbService (로컬 DB)
```javascript
// 식물 관련
getAllPlants()                    // 전체 식물 목록 (102종)
getPlantById(plantId)             // 특정 식물 조회
searchPlants(keyword)             // 식물 검색

// 사용자 관련
createUser(name)                  // 사용자 생성
getUserById(userId)               // 사용자 조회

// 화분 관련
addUserPlant(userId, plantId, nickname, image, ...)  // 화분 추가
getUserPlants(userId)             // 내 화분 목록
updateUserPlant(userPlantId, nickname, ...)          // 화분 수정
recordWatering(userPlantId)       // 물주기 기록
deleteUserPlant(userPlantId)      // 화분 삭제
updateDisease(userPlantId, disease)  // 병충해 정보 업데이트
```

### aiService (Google Cloud AI)
```javascript
identifySpecies(userId, imageUri, nickname)      // 식물 종 판별 + 저장
diagnoseDisease(userPlantId, imageUri, filename) // 병충해 진단
```

### weatherService (기상청 API)
```javascript
getWeather(latitude, longitude)   // 날씨 정보
// - 좌표 변환: Lambert Conformal Conic 투영
// - 응답: 온도, 습도, 하늘 상태, 강수 형태
```

## 주요 기능 구현

### 1. 물주기 일정 계산 (프론트엔드)

```javascript
// Storage.js의 fetchPlants()에서 자동 계산
const WateringPeriod = m.WateringPeriod ?? p.wateringperiod ?? 7;
// 우선순위:
//   1. AsyncStorage의 WateringPeriod (사용자 커스텀)
//   2. user_plants.wateringperiod (식물별 설정)
//   3. plants.wateringperiod (기본 DB 값)
//   4. 7일 (하드코딩 기본값)

const nextWater = new Date(waterDate);
nextWater.setDate(nextWater.getDate() + WateringPeriod);

// UI 표시 우선순위: nextWater > next_watering
```

### 2. 화면 전환 시 데이터 갱신

```javascript
// Home, MyPlantList, Calendar, Report 화면
useEffect(() => {
  const unsub = navigation.addListener("focus", loadPlantData);
  return unsub;
}, [navigation]);

// PlantDetailScreen
useEffect(() => {
  loadPlantData(); // 진입 시 최신 데이터 로드
}, []);
```

### 3. GPS 기반 날씨
- expo-location으로 GPS 좌표 획득
- weatherService.getWeather()로 기상청 API 직접 호출
- convertToGrid()로 좌표 변환 (Lambert Conformal Conic)

### 4. AI 식물 종 판별
- expo-image-picker로 이미지 선택
- aiService.identifySpecies()로 multipart/form-data 업로드
- Google Cloud AI API 직접 호출 (백엔드 불필요)
- 결과를 바탕으로 localDbService.addUserPlant() 호출

### 5. 병충해 진단
- 잎사귀 사진 촬영
- aiService.diagnoseDisease()로 업로드
- Google Cloud AI API 직접 호출
- localDbService.updateDisease()로 저장

## 저장소

### AsyncStorage
- **용도**: 사용자 ID, 즐겨찾기, 물주기 주기 커스텀 값
- **키**:
  - `@user_id`: 현재 사용자 ID
  - `PLANT_META_DATA`: 식물별 메타데이터 (favorite, WateringPeriod)

### expo-sqlite
- **DB 파일**: `assets/database/plants.db` → 앱 내부 SQLite 디렉토리
- **위치**: `${FileSystem.documentDirectory}SQLite/plants.db`
- **데이터**: 102종 식물 정보, 사용자 정보, 화분 관리 데이터

## 기술 스택

### Core
- **React Native**: 0.81
- **Expo**: ~54.0
- **React**: 19.1.0

### Database
- **expo-sqlite**: ~15.0 (로컬 SQLite)
- **expo-asset**: ~11.0 (DB 파일 임베딩)
- **expo-file-system**: ~19.0 (파일 관리, `/legacy` 사용)

### Navigation
- **@react-navigation/native**: ^7.1
- **@react-navigation/bottom-tabs**: ^7.8
- **@react-navigation/native-stack**: ^7.6

### UI Components
- **expo-image**: ~3.0
- **expo-image-picker**: ~17.0
- **expo-camera**: ~17.0
- **@react-native-community/datetimepicker**: 8.4
- **react-native-calendars**: ^1.1313

### Services
- **expo-location**: ~19.0 (GPS)
- **expo-notifications**: ^0.32 (푸시 알림)
- **@react-native-async-storage/async-storage**: ^2.2

## 빌드 및 배포

### Development Build (권장)

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
- 기상청 API 키: `src/services/weatherService.js`에 하드코딩
- Google Cloud AI URL: `src/services/aiService.js`에 하드코딩
- 프로덕션 배포 시 환경변수로 관리 권장

### 권한
- **위치**: 날씨 정보를 위한 GPS 접근
- **카메라**: 식물/병충해 사진 촬영
- **갤러리**: 기존 사진 선택
- **알림**: 물주기 알림 발송

## 디버깅

### Expo 개발 도구
```bash
npx expo start

# 옵션:
# - Shift+M: 개발 메뉴 토글
# - Shift+J: Chrome DevTools 열기
# - R: 앱 새로고침
```

### 주요 로그 포인트
- `[localDbService]`: DB 초기화 및 쿼리
- `[aiService]`: AI API 호출 및 응답
- `[weatherService]`: 날씨 API 호출 및 좌표 변환
- `[App]`: 앱 초기화

## 트러블슈팅

### 문제: AI 분석 타임아웃
**해결:**
- 네트워크 연결 확인
- 30초 타임아웃 설정됨
- Google Cloud AI 서버 상태 확인

### 문제: 날씨 정보 오류
**해결:**
- GPS 권한 확인
- 위치 서비스 활성화 확인
- 기상청 API 키 유효성 확인

### 문제: 알림이 발송되지 않음
**해결:**
- Expo Go는 원격 푸시 알림 미지원 (SDK 53+)
- Development Build 또는 Production Build 필요
- 로컬 알림만 Expo Go에서 작동

## 성능 최적화

- **이미지**: expo-image 사용 (자동 캐싱)
- **리스트**: FlatList 사용 (가상화)
- **네비게이션**: React Navigation의 lazy loading
- **DB 쿼리**: 인덱싱 및 COALESCE 활용

## 라이선스

교육 목적 프로젝트
