/*
  파일명: services/plantService.js
  기능: 식물 관련 API 서비스
*/

import api from './api';

export const plantService = {
  // 전체 식물 목록 조회
  getAll: async () => {
    const response = await api.get('/plants');
    return response.data;
  },

  // 특정 식물 조회
  getById: async (plantId) => {
    const response = await api.get(`/plants/${plantId}`);
    return response.data;
  },

  // 식물 검색
  search: async (keyword) => {
    const response = await api.get(`/plants/search?q=${encodeURIComponent(keyword)}`);
    return response.data;
  },
};

export default plantService;
