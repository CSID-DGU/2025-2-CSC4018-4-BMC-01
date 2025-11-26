/*
  파일명: services/plantService.js
  기능: 식물 관련 서비스 (로컬 DB 사용)
*/

import * as localDb from './localDbService';

export const plantService = {
  // 전체 식물 목록 조회
  getAll: async () => {
    const plants = await localDb.getAllPlants();
    return plants;
  },

  // 특정 식물 조회
  getById: async (plantId) => {
    const plant = await localDb.getPlantById(plantId);
    return plant;
  },

  // 식물 검색
  search: async (keyword) => {
    const plants = await localDb.searchPlants(keyword);
    return plants;
  },
};

export default plantService;
