/*
  파일명: services/userPlantService.js
  기능: 사용자-식물 관련 API 서비스
*/

import api from './api';
import userService from './userService';

export const userPlantService = {
  // 내 식물 목록 조회
  getMyPlants: async () => {
    const userId = await userService.getCurrentUserId();
    const response = await api.get(`/users/${userId}/plants`);
    return response.data;
  },

  // 식물 추가
  addPlant: async (
    plantId,
    nickname = null,
    image = null,
    aiLabelEn = null,
    aiLabelKo = null,
    wateringPeriod = null
  ) => {
    const userId = await userService.getCurrentUserId();
    const response = await api.post(`/users/${userId}/plants`, {
      plant_id: plantId,
      nickname,
      image,
      ai_label_en: aiLabelEn,
      ai_label_ko: aiLabelKo,
      wateringperiod: wateringPeriod,
    });
    return response.data;
  },

  // 물주기 기록
  recordWatering: async (userPlantId) => {
    const response = await api.put(`/user-plants/${userPlantId}/water`);
    return response;
  },

  // 식물 정보 수정
  updatePlant: async (userPlantId, data) => {
    const response = await api.put(`/user-plants/${userPlantId}`, data);
    return response;
  },

  // 식물 삭제
  deletePlant: async (userPlantId) => {
    const response = await api.delete(`/user-plants/${userPlantId}`);
    return response;
  },
};

export default userPlantService;
