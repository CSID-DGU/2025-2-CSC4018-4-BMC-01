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
    speciesLabel = null,
    speciesLabelKo = null,
    wateringCycle = null
  ) => {
    const userId = await userService.getCurrentUserId();
    const response = await api.post(`/users/${userId}/plants`, {
      plant_id: plantId,
      nickname,
      image,
      species_label: speciesLabel,
      species_label_ko: speciesLabelKo,
      watering_cycle: wateringCycle,
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
    console.log('[userPlantService] 삭제 요청:', userPlantId);
    console.log('[userPlantService] 삭제 URL:', `/user-plants/${userPlantId}`);
    const response = await api.delete(`/user-plants/${userPlantId}`);
    console.log('[userPlantService] 삭제 응답:', response);
    return response;
  },
};

export default userPlantService;
