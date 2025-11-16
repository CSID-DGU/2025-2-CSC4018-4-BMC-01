/*
  파일명: Storage.js
  기능: 식물 데이터 CRUD + 이미지 저장(plant/leaf) + 물주기 날짜 계산
*/

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

/* ============================
    내부 저장소 경로 생성
============================ */
const PLANT_DIR = FileSystem.documentDirectory + "plants/";
const LEAF_DIR = FileSystem.documentDirectory + "leaf/";

// 폴더 생성
async function ensureDirs() {
  const plantInfo = await FileSystem.getInfoAsync(PLANT_DIR);
  if (!plantInfo.exists) await FileSystem.makeDirectoryAsync(PLANT_DIR);

  const leafInfo = await FileSystem.getInfoAsync(LEAF_DIR);
  if (!leafInfo.exists) await FileSystem.makeDirectoryAsync(LEAF_DIR);
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
  await ensureDirs();
  const dest = PLANT_DIR + fileName;

  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest; // 저장된 최종 경로 반환
  } catch (e) {
    console.log("saveImageToStorage Error:", e);
    return uri; // 실패 시 원본 URI라도 사용
  }
};

// leaf 이미지 저장
export const saveLeafImageToStorage = async (uri, fileName) => {
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
    식물 CRUD
============================ */

const STORAGE_KEY = "PLANT_DATA";

// 전체 조회
export const fetchPlants = async () => {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
};

// 저장
const savePlants = async (list) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

// 추가
export const addPlant = async (plant) => {
  const list = await fetchPlants();
  const nextId = list.length > 0 ? list[list.length - 1].id + 1 : 1;

  const newPlant = {
    id: nextId,
    name: plant.name,
    image: plant.image,
    plantImageName: plant.plantImageName,
    waterDate: null,
    nextWater: null,
    leafPhotos: [] // 새로 추가
  };

  list.push(newPlant);
  await savePlants(list);
};

// 업데이트
export const updatePlant = async (updated) => {
  const list = await fetchPlants();
  const newList = list.map((p) => (p.id === updated.id ? updated : p));
  await savePlants(newList);
};

// 삭제
export const deletePlant = async (id) => {
  const list = await fetchPlants();
  const newList = list.filter((p) => p.id !== id);
  await savePlants(newList);
};

/* ============================
    물 준 날짜 갱신
============================ */

export const updateWaterDate = async (id) => {
  const list = await fetchPlants();
  const today = new Date();

  const y = today.getFullYear();
  const m = ("0" + (today.getMonth() + 1)).slice(-2);
  const d = ("0" + today.getDate()).slice(-2);

  const waterDate = `${y}-${m}-${d}`;

  const next = new Date();
  next.setDate(today.getDate() + 3);

  const ny = next.getFullYear();
  const nm = ("0" + (next.getMonth() + 1)).slice(-2);
  const nd = ("0" + next.getDate()).slice(-2);

  const nextWater = `${ny}-${nm}-${nd}`;

  const newList = list.map((p) => {
    if (p.id === id) {
      return {
        ...p,
        waterDate,
        nextWater
      };
    }
    return p;
  });

  await savePlants(newList);
};

/* ============================
    잎 사진 저장 기능 (병충해)
============================ */

// leafPhotos 배열에 추가하기
export const addLeafPhoto = async (plantId, fileName, finalUri) => {
  const list = await fetchPlants();

  const newList = list.map((p) => {
    if (p.id !== plantId) return p;

    const photos = p.leafPhotos || [];
    return {
      ...p,
      leafPhotos: [...photos, { fileName, uri: finalUri }]
    };
  });

  await savePlants(newList);
};
