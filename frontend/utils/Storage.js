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
    이미지 저장
============================ */

// plant 이미지 저장
export const saveImageToStorage = async (uri, fileName) => {
  if (Platform.OS === 'web') {
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
      console.error("saveImageToStorage (웹) Error:", e);
      return uri;
    }
  }

  await ensureDirs();
  const dest = PLANT_DIR + fileName;

  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch (e) {
    console.error("saveImageToStorage Error:", e);
    return uri;
  }
};

// leaf 이미지 저장
export const saveLeafImageToStorage = async (uri, fileName) => {
  if (Platform.OS === 'web') {
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
      console.error("saveLeafImageToStorage (웹) Error:", e);
      return uri;
    }
  }

  await ensureDirs();
  const dest = LEAF_DIR + fileName;

  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch (e) {
    console.error("saveLeafImageToStorage Error:", e);
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
    console.error("fetchPlants Error:", error);
    return [];
  }
};

/* ============================
    물 준 날짜 갱신
============================ */

export const updateWaterDate = async (id) => {
  try {
    await userPlantService.recordWatering(id);
  } catch (error) {
    console.error("updateWaterDate Error:", error);
    throw error;
  }
};
