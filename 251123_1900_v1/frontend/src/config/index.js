/*
  파일명: config/index.js
  기능: 앱 환경 설정
*/

import { Platform } from 'react-native';

// API 기본 URL 설정
const getApiUrl = () => {
  if (__DEV__) {
    // 개발 환경
    // Android 에뮬레이터: 10.0.2.2
    // iOS 시뮬레이터: localhost
    // 실제 기기: WiFi IP (같은 네트워크)
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000/api';  // Android 에뮬레이터
    }
    return 'http://localhost:5000/api';  // iOS 시뮬레이터
    // 실제 기기 테스트 시: return 'http://172.20.10.6:5000/api';
  }
  // 프로덕션 환경
  return 'http://YOUR_PRODUCTION_SERVER/api';
};

export const API_URL = getApiUrl();  // 직접 export

export const Config = {
  API_URL: API_URL,

  // 기본 물주기 주기 (일)
  DEFAULT_WATERING_CYCLE: 3,

  // 앱 버전
  APP_VERSION: '1.0.0',
};

export default Config;
