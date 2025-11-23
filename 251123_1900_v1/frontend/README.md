# BMC Plant Frontend

스마트 화분 관리 앱 프론트엔드 (React Native + Expo)

## 아키텍처

```
App.js
   |
AppNavigator (Tab + Stack)
   |
Screens -> Services -> Backend API
```

## 프로젝트 구조

```
frontend/
├── src/
│   ├── config/           # 앱 설정
│   │   └── index.js
│   └── services/         # API 서비스
│       ├── api.js
│       ├── plantService.js
│       ├── userService.js
│       ├── userPlantService.js
│       └── weatherService.js
├── screens/              # 화면 컴포넌트
│   ├── HomeScreen.js
│   ├── MyPlantListScreen.js
│   ├── PlantDetailScreen.js
│   ├── PlantEditorScreen.js
│   ├── CalendarScreen.js
│   ├── DiseaseResultScreen.js
│   └── SettingsScreen.js
├── navigation/           # 네비게이션
│   └── AppNavigator.js
├── utils/                # 유틸리티
│   └── Storage.js
├── assets/               # 이미지, 폰트
├── App.js                # 앱 진입점
└── package.json
```

## 실행 방법

### 1. 의존성 설치

```bash
cd frontend
npm install
```

### 2. 백엔드 서버 실행 (별도 터미널)

```bash
cd backend/src
python app.py
```

### 3. API URL 설정

`src/config/index.js`에서 환경에 맞게 설정:

```javascript
// Android 에뮬레이터: http://10.0.2.2:5000/api
// iOS 시뮬레이터: http://localhost:5000/api
// 실제 기기: http://[PC IP]:5000/api
```

### 4. Expo 실행

```bash
npx expo start
```

- `a` - Android 에뮬레이터
- `i` - iOS 시뮬레이터
- QR 코드 - Expo Go 앱 (실제 기기)

## 화면 구성

| 화면 | 파일 | 기능 |
|------|------|------|
| 홈 | HomeScreen.js | 날씨, 내 화분 슬라이드, 물주기 알림 |
| 내 화분 | MyPlantListScreen.js | 화분 목록 그리드 |
| 화분 상세 | PlantDetailScreen.js | 상세 정보, 수정, 삭제, 병충해 분석 |
| 화분 추가/수정 | PlantEditorScreen.js | 이름, 사진 등록 |
| 캘린더 | CalendarScreen.js | 물주기 일정 캘린더 |
| 병충해 결과 | DiseaseResultScreen.js | AI 분석 결과 (예정) |
| 설정 | SettingsScreen.js | 앱 설정 |

## API 서비스

### plantService
- `getAll()` - 전체 식물 목록
- `getById(id)` - 특정 식물 조회
- `search(keyword)` - 식물 검색

### userService
- `getCurrentUserId()` - 현재 사용자 ID (없으면 생성)
- `create(name)` - 사용자 생성

### userPlantService
- `getMyPlants()` - 내 식물 목록
- `addPlant(plantId, nickname, cycle)` - 식물 추가
- `recordWatering(id)` - 물주기 기록
- `updatePlant(id, data)` - 식물 정보 수정
- `deletePlant(id)` - 식물 삭제

### weatherService
- `getWeather(lat, lon)` - 날씨 정보

## 기술 스택

- **프레임워크**: React Native 0.81 + Expo 54
- **네비게이션**: React Navigation 7
- **상태 관리**: React Hooks (useState, useEffect)
- **저장소**: AsyncStorage (사용자 ID), Backend API
- **이미지**: expo-image-picker
- **위치**: expo-location
- **캘린더**: react-native-calendars

## 개발 현황

- [x] 기본 UI 구현
- [x] 네비게이션 설정
- [x] API 서비스 모듈
- [x] 백엔드 연동
- [ ] AI 서버 연동 (병충해 분석)
- [ ] 푸시 알림

## 주의사항

- 실제 기기 테스트 시 PC와 같은 WiFi 네트워크 필요
- 백엔드 서버가 실행 중이어야 API 호출 가능
- Android 에뮬레이터는 `10.0.2.2`로 localhost 접근
