/*
  파일명: config/index.js
  기능: 앱 환경 설정
*/

import { Platform } from 'react-native';

// API 기본 URL 설정
const getApiUrl = () => {
  if (__DEV__) {
    // 개발 환경 - Windows Wi-Fi IP
    return 'http://172.20.10.6:5000/api';
  }
  // 프로덕션 환경
  return 'http://YOUR_PRODUCTION_SERVER/api';
};

export const Config = {
  API_URL: getApiUrl(),

  // 기본 물주기 주기 (일)
  DEFAULT_WATERING_CYCLE: 3,

  // 앱 버전
  APP_VERSION: '1.0.0',
};

export default Config;
