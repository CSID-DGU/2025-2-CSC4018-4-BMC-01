/*
  파일명: services/userPlantService.js
  기능: 사용자-식물 관련 서비스 (로컬 DB 사용)
*/

import * as localDb from './localDbService';
import userService from './userService';

export const userPlantService = {
  // 내 식물 목록 조회
  getMyPlants: async () => {
    const userId = await userService.getCurrentUserId();
    const plants = await localDb.getUserPlants(userId);
    return plants;
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
    const userPlantId = await localDb.addUserPlant(
      userId,
      plantId,
      nickname,
      image,
      aiLabelEn,
      aiLabelKo,
      wateringPeriod
    );

    // 생성된 식물 정보 반환
    const plants = await localDb.getUserPlants(userId);
    const newPlant = plants.find(p => p.id === userPlantId);
    return newPlant;
  },

  // 물주기 기록
  recordWatering: async (userPlantId) => {
    await localDb.recordWatering(userPlantId);
    return { success: true };
  },

  // 식물 정보 수정
  updatePlant: async (userPlantId, data) => {
    await localDb.updateUserPlant(
      userPlantId,
      data.nickname,
      data.wateringperiod,
      data.last_watered,
      data.image
    );
    return { success: true };
  },

  // 식물 삭제
  deletePlant: async (userPlantId) => {
    await localDb.deleteUserPlant(userPlantId);
    return { success: true };
  },
};

export default userPlantService;
