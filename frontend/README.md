# 🌱 BMC Plant Frontend

React Native + Expo 기반 스마트 화분 관리 모바일 앱

## 개요

102종의 식물 데이터베이스를 활용하여 물주기 알림, 날씨 정보, AI 기반 병충해 진단을 제공하는 모바일 애플리케이션입니다.

## 아키텍처

### Screen-Service Pattern

```
App.js (진입점)
   ↓
AppNavigator (Bottom Tabs + Stack)
   ↓
Screens (7개 화면)
   ↓
Services (API 클라이언트)
   ↓
Backend REST API (Flask)
```

### 네비게이션 구조

```
Bottom Tab Navigator
├── Home Tab (Stack)
│   └── HomeScreen
├── My Plants Tab (Stack)
│   ├── MyPlantListScreen
│   ├── PlantDetailScreen
│   ├── PlantEditorScreen
│   └── DiseaseResultScreen
├── Calendar Tab
│   └── CalendarScreen
└── Settings Tab
    └── SettingsScreen (NotificationSettingScreen)
```

## 실행 방법

### 1. 의존성 설치

```bash
cd frontend
npm install
```

### 2. 백엔드 서버 실행 (필수)

별도 터미널에서 백엔드 서버를 실행해야 합니다:

```bash
cd backend/src
python app.py

# 서버: http://localhost:5000
```

### 3. API URL 설정

`src/config/index.js`에서 환경에 맞게 API URL 설정:

```javascript
const getApiUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000/api';  // Android 에뮬레이터
    }
    return 'http://localhost:5000/api';    // iOS 시뮬레이터
    // 실제 기기: return 'http://[PC_IP]:5000/api';
  }
  return 'http://YOUR_PRODUCTION_SERVER/api';
};
```

**중요:**
- Android 에뮬레이터: `10.0.2.2`는 호스트 머신의 localhost
- iOS 시뮬레이터: `localhost` 직접 사용 가능
- 실제 기기: PC와 같은 WiFi 네트워크 필요, PC의 IP 주소 사용

### 4. Expo 개발 서버 실행

```bash
npx expo start
```

**실행 옵션:**
- `a` 키: Android 에뮬레이터에서 실행
- `i` 키: iOS 시뮬레이터에서 실행 (macOS만)
- QR 코드 스캔: Expo Go 앱으로 실제 기기에서 실행

## 프로젝트 구조

```
frontend/
├── src/
│   ├── config/
│   │   └── index.js             # API URL, 앱 설정
│   └── services/                # API 클라이언트 모듈
│       ├── api.js               # HTTP 요청 wrapper
│       ├── plantService.js      # 식물 API
│       ├── userService.js       # 사용자 API
│       ├── userPlantService.js  # 사용자 식물 API
│       ├── weatherService.js    # 날씨 API
│       └── aiService.js         # AI 분석 API
│
├── screens/                     # 화면 컴포넌트
│   ├── HomeScreen.js            # 홈 (날씨, 슬라이드, 알림)
│   ├── MyPlantListScreen.js     # 내 화분 목록 그리드
│   ├── PlantDetailScreen.js     # 화분 상세 정보
│   ├── PlantEditorScreen.js     # 화분 추가/수정
│   ├── CalendarScreen.js        # 물주기 캘린더
│   ├── DiseaseResultScreen.js   # 병충해 진단 결과
│   ├── NotificationSettingScreen.js  # 알림 설정
│   └── SettingsScreen.js        # 설정 (NotificationSettingScreen 래퍼)
│
├── navigation/
│   └── AppNavigator.js          # React Navigation 설정
│
├── utils/
│   ├── Storage.js               # AsyncStorage 유틸리티
│   └── notificationService.js   # 푸시 알림 서비스
│
├── assets/                      # 이미지, 아이콘, 폰트
├── App.js                       # 앱 진입점
├── app.json                     # Expo 설정
└── package.json                 # 의존성
```

## 화면 상세

### 1. HomeScreen (홈)
- **위치**: `screens/HomeScreen.js`
- **기능**:
  - GPS 기반 실시간 날씨 정보 (기상청 API)
  - 내 화분 가로 슬라이드 (최대 5개 표시)
  - 오늘/내일 물주기 알림 리스트
  - Nominatim API로 주소 변환

### 2. MyPlantListScreen (내 화분)
- **위치**: `screens/MyPlantListScreen.js`
- **기능**:
  - 2열 그리드 레이아웃
  - 즐겨찾기 표시 (별 아이콘)
  - 물주기 일정 표시 (D-day)
  - 화분 탭으로 상세 화면 이동

### 3. PlantDetailScreen (화분 상세)
- **위치**: `screens/PlantDetailScreen.js`
- **기능**:
  - 화분 상세 정보 (닉네임, 사진, 물주기 주기)
  - 최근 물 준 날짜 수정 (DateTimePicker)
  - 사진 변경 (갤러리/카메라)
  - 병충해 분석 버튼 (→ DiseaseResultScreen)
  - 화분 삭제

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
  - 물주기 일정 표시 (마커)
  - 날짜별 화분 목록 표시

### 6. DiseaseResultScreen (병충해 진단)
- **위치**: `screens/DiseaseResultScreen.js`
- **기능**:
  - 잎사귀 사진 촬영/선택
  - AI 병충해 진단 (Google Cloud AI)
  - 진단 결과 표시 (병명, 신뢰도)
  - 진단 이력 저장

### 7. NotificationSettingScreen (알림 설정)
- **위치**: `screens/NotificationSettingScreen.js`
- **기능**:
  - 알림 on/off 토글
  - 알림 시간 설정 (TimePicker)
  - 권한 요청 및 관리

## API 서비스 모듈

### plantService
```javascript
getAllPlants()           // 전체 식물 목록 (102종)
getPlantById(id)         // 특정 식물 조회
searchPlants(keyword)    // 식물 검색
```

### userService
```javascript
getCurrentUserId()       // 현재 사용자 ID (없으면 생성)
createUser(name)         // 사용자 생성
getUserById(userId)      // 사용자 조회
```

### userPlantService
```javascript
addUserPlant(userId, plantData)     // 식물 추가
getUserPlants(userId)               // 내 식물 목록
recordWatering(userPlantId)         // 물주기 기록
updateUserPlant(userPlantId, data)  // 식물 정보 수정
deleteUserPlant(userPlantId)        // 식물 삭제
```

### weatherService
```javascript
getWeather(lat, lon)     // 날씨 정보
```

### aiService
```javascript
analyzeSpecies(imageUri, filename)               // 식물 종 분석만
identifySpecies(userId, imageUri, nickname)      // 식물 종 판별 + 저장
diagnoseDisease(userPlantId, imageUri, filename) // 병충해 진단
```

**중요:** AI 서비스는 multipart/form-data로 이미지 업로드

## 저장소

### AsyncStorage
- **용도**: 사용자 ID 저장 (영구 저장)
- **키**: `@user_id`
- **로직**: 앱 실행 시 userService가 확인 후 없으면 자동 생성

### Backend API
- 모든 식물 데이터는 백엔드 API에 저장
- 실시간 동기화 (로컬 캐싱 없음)

## 기술 스택

### Core
- **React Native**: 0.81.5
- **Expo**: ~54.0
- **React**: 19.1.0

### Navigation
- **@react-navigation/native**: ^7.1
- **@react-navigation/bottom-tabs**: ^7.8
- **@react-navigation/native-stack**: ^7.6

### UI Components
- **expo-image**: ~3.0 (이미지 표시)
- **expo-image-picker**: ~17.0 (갤러리/카메라)
- **expo-camera**: ~17.0 (카메라 접근)
- **@react-native-community/datetimepicker**: 8.4 (날짜/시간 선택)
- **react-native-calendars**: ^1.1313 (캘린더)

### Data & Storage
- **@react-native-async-storage/async-storage**: ^2.2 (로컬 저장소)

### Location & Notifications
- **expo-location**: ~19.0 (GPS 위치)
- **expo-notifications**: ^0.32 (푸시 알림)

### File System
- **expo-file-system**: ~19.0 (파일 저장/읽기)

## 주요 기능 구현

### 1. 물주기 알림
- `utils/notificationService.js`에서 관리
- expo-notifications 사용
- 매일 지정된 시간에 알림 발송
- 권한 요청 및 토큰 관리

### 2. GPS 기반 날씨
- expo-location으로 GPS 좌표 획득
- weatherService로 백엔드 API 호출
- 백엔드에서 기상청 API 호출 및 격자 변환 처리

### 3. AI 식물 종 판별
- expo-image-picker로 이미지 선택
- aiService.identifySpecies()로 multipart/form-data 업로드
- 백엔드에서 Google Cloud AI API 호출
- 결과를 바탕으로 user_plant 자동 생성

### 4. 병충해 진단
- 잎사귀 사진 촬영
- aiService.diagnoseDisease()로 업로드
- AI 진단 결과 표시
- user_plant.disease 필드에 저장

## 개발 상태

### 완료된 기능
- ✅ 7개 화면 구현
- ✅ React Navigation 설정 (Bottom Tabs + Stack)
- ✅ 백엔드 API 연동 (5개 서비스 모듈)
- ✅ 사용자 ID 자동 생성 및 저장
- ✅ GPS 기반 날씨 정보
- ✅ AI 식물 종 판별
- ✅ AI 병충해 진단
- ✅ 물주기 알림 시스템
- ✅ 캘린더 뷰
- ✅ 이미지 업로드 (갤러리/카메라)

### 개발 예정
- 🔲 백엔드 JavaScript 마이그레이션 (앱 내장)
- 🔲 오프라인 지원

## 빌드 및 배포

### Expo EAS Build (권장)

```bash
# EAS CLI 설치
npm install -g eas-cli

# Expo 계정 로그인
eas login

# Android APK 빌드
eas build --platform android --profile preview

# Android AAB 빌드 (Google Play)
eas build --platform android --profile production
```

### 로컬 빌드

```bash
# Android
npx expo run:android

# iOS (macOS만)
npx expo run:ios
```

## 주의사항

### 개발 환경
1. **백엔드 서버 필수**: 백엔드 Flask 서버가 실행 중이어야 API 호출 가능
2. **WiFi 네트워크**: 실제 기기 테스트 시 PC와 같은 WiFi 필요
3. **API URL 설정**: 각 환경(에뮬레이터/시뮬레이터/실제 기기)에 맞게 설정

### 권한
- **위치**: 날씨 정보를 위한 GPS 접근
- **카메라**: 식물/병충해 사진 촬영
- **갤러리**: 기존 사진 선택
- **알림**: 물주기 알림 발송

### 플랫폼 차이
- **Android**: `10.0.2.2`로 localhost 접근
- **iOS**: `localhost` 직접 사용
- **Web**: 일부 기능 제한 (카메라, 알림 등)

## 디버깅

### Expo 개발 도구
```bash
npx expo start

# 옵션:
# - Shift+M: 개발 메뉴 토글
# - Shift+J: Chrome DevTools 열기
# - R: 앱 새로고침
```

### Console Logging
- `console.log()`: 일반 로그
- `console.error()`: 에러 로그 (빨간색 표시)
- React Native Debugger 사용 권장

## 성능 최적화

- **이미지**: expo-image 사용 (자동 캐싱)
- **리스트**: FlatList 사용 (가상화)
- **네비게이션**: React Navigation의 lazy loading

## 트러블슈팅

### 문제: Android 에뮬레이터에서 API 연결 안됨
**해결:** API URL을 `http://10.0.2.2:5000/api`로 설정

### 문제: 실제 기기에서 API 연결 안됨
**해결:**
1. PC와 기기가 같은 WiFi에 연결되어 있는지 확인
2. PC의 방화벽 설정 확인
3. API URL을 PC의 IP 주소로 변경

### 문제: 알림이 발송되지 않음
**해결:**
1. 알림 권한 확인
2. 물리적 기기에서 테스트 (시뮬레이터는 제한적)
3. NotificationSettingScreen에서 알림 활성화 확인

## 라이선스

교육 목적 프로젝트

## 기여

2025-2 CSC4018-4-BMC-01 팀 프로젝트
