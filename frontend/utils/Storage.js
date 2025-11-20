/*
  파일명: Storage.js
  기능: 식물 데이터 API 연동 + 이미지 로컬 저장
*/

import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { userPlantService } from "../src/services";

/* ============================
    내부 저장소 경로 생성
============================ */
const PLANT_DIR = FileSystem.documentDirectory ? FileSystem.documentDirectory + "plants/" : null;
const LEAF_DIR = FileSystem.documentDirectory ? FileSystem.documentDirectory + "leaf/" : null;

// 폴더 생성 (웹 환경에서는 건너뜀)
async function ensureDirs() {
  if (Platform.OS === 'web') {
    console.log('[Storage] 웹 환경: 디렉토리 생성 건너뜀');
    return;
  }

  if (PLANT_DIR) {
    const plantInfo = await FileSystem.getInfoAsync(PLANT_DIR);
    if (!plantInfo.exists) await FileSystem.makeDirectoryAsync(PLANT_DIR);
  }

  if (LEAF_DIR) {
    const leafInfo = await FileSystem.getInfoAsync(LEAF_DIR);
    if (!leafInfo.exists) await FileSystem.makeDirectoryAsync(LEAF_DIR);
  }
}

ensureDirs();

/* ============================
    파일명 생성 함수
============================ */

// plant 이미지 파일명 생성
export const generatePlantImageName = () => {
  const rand = Date.now();
  return `img_plant_${rand}.jpg`;
};

// leaf 이미지 파일명 생성
export const generateLeafImageName = () => {
  const rand = Date.now();
  return `img_leaf_${rand}.jpg`;
};

/* ============================
    이미지 저장
============================ */

// plant 이미지 저장
export const saveImageToStorage = async (uri, fileName) => {
  if (Platform.OS === 'web') {
    console.log('[Storage] 웹 환경: 이미지 base64 변환', uri.substring(0, 50));
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(uri);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.log("saveImageToStorage (웹) Error:", e);
      return uri;
    }
  }

  await ensureDirs();
  const dest = PLANT_DIR + fileName;

  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch (e) {
    console.log("saveImageToStorage Error:", e);
    return uri;
  }
};

// leaf 이미지 저장
export const saveLeafImageToStorage = async (uri, fileName) => {
  if (Platform.OS === 'web') {
    console.log('[Storage] 웹 환경: leaf 이미지 base64 변환', uri.substring(0, 50));
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(uri);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.log("saveLeafImageToStorage (웹) Error:", e);
      return uri;
    }
  }

  await ensureDirs();
  const dest = LEAF_DIR + fileName;

  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch (e) {
    console.log("saveLeafImageToStorage Error:", e);
    return uri;
  }
};

/* ============================
    식물 CRUD (API 연동)
============================ */

// 전체 조회 (내 식물 목록)
export const fetchPlants = async () => {
  try {
    const plants = await userPlantService.getMyPlants();
    // API 응답을 기존 형식에 맞게 변환
    return plants.map(plant => ({
      id: plant.id,
      plantId: plant.plant_id,
      name: plant.nickname || plant.species_label_ko || plant.common_name,
      image: plant.image || null,
      waterDate: plant.last_watered,
      nextWater: plant.next_watering,
      wateringCycle: plant.watering_cycle,
      plantImageName: plant.plantImageName || null,
      leafPhotos: plant.leafPhotos || [],
    }));
  } catch (error) {
    console.log("fetchPlants Error:", error);
    return [];
  }
};

// 추가
export const addPlant = async (plant) => {
  try {
    // plant.plantId가 백엔드 식물 DB의 ID
    // 현재는 커스텀 식물 추가이므로 plantId는 없을 수 있음
    const result = await userPlantService.addPlant(
      plant.plantId || 1,  // 기본값: 식물 ID 1
      plant.name,
      plant.wateringCycle || 3
    );
    return result;
  } catch (error) {
    console.log("addPlant Error:", error);
    throw error;
  }
};

// 업데이트
export const updatePlant = async (updated) => {
  try {
    await userPlantService.updatePlant(updated.id, {
      nickname: updated.name,
      watering_cycle: updated.wateringCycle,
      last_watered: updated.waterDate,
    });
  } catch (error) {
    console.log("updatePlant Error:", error);
    throw error;
  }
};

// 삭제
export const deletePlant = async (id) => {
  try {
    await userPlantService.deletePlant(id);
  } catch (error) {
    console.log("deletePlant Error:", error);
    throw error;
  }
};

/* ============================
    물 준 날짜 갱신
============================ */

export const updateWaterDate = async (id) => {
  try {
    await userPlantService.recordWatering(id);
  } catch (error) {
    console.log("updateWaterDate Error:", error);
    throw error;
  }
};

/* ============================
    잎 사진 저장 기능 (병충해)
    - 로컬 저장만 유지 (AI 서버 연동 시 수정 예정)
============================ */

export const addLeafPhoto = async (plantId, fileName, finalUri) => {
  // TODO: AI 서버 연동 시 구현
  console.log("addLeafPhoto - AI 서버 연동 예정:", plantId, fileName);
};
