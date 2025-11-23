/*
  파일명: services/weatherService.js
  기능: 날씨 관련 API 서비스
*/

import api from './api';

export const weatherService = {
  // 날씨 정보 조회
  getWeather: async (latitude, longitude) => {
    const response = await api.get(`/weather?lat=${latitude}&lon=${longitude}`);
    return response.data;
  },
};

export default weatherService;
