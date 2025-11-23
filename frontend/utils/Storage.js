/*
  파일명: Storage.js
  목적:
    - API 기반 식물 정보 로드(fetchPlants)
    - 물 준 날짜 갱신(updateWaterDate)
    - 사용자 확장 데이터(favorite, WateringPeriod) 로컬 저장
    - 식물/잎사귀 이미지 저장(디바이스 로컬 스토리지)
  
  전체 구조:
    - 백엔드(API): 식물 기본 정보, 잎사귀 정보 제공
    - 프론트: WateringPeriod / favorite 등 사용자 커스텀 데이터 저장
    - 날짜 계산(waterDate / nextWater)은 프론트에서 처리
*/

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { userPlantService } from "../src/services";

/* -------------------------------------------------
   [로컬 저장소 경로]
   - PLANT_DIR: 식물 사진 저장 위치
   - LEAF_DIR : 잎사귀(병충해 분석 이미지) 저장 위치
   - Platform 체크(Web 예외처리 포함)
-------------------------------------------------- */
const PLANT_DIR = FileSystem.documentDirectory + "plants/";
const LEAF_DIR = FileSystem.documentDirectory + "leaf/";

async function ensureDirs() {
  if (Platform.OS === "web") return;

  const p = await FileSystem.getInfoAsync(PLANT_DIR);
  if (!p.exists) await FileSystem.makeDirectoryAsync(PLANT_DIR);

  const l = await FileSystem.getInfoAsync(LEAF_DIR);
  if (!l.exists) await FileSystem.makeDirectoryAsync(LEAF_DIR);
}
// 앱 로드시 초기 폴더 생성
ensureDirs();

/* -------------------------------------------------
   [로컬 메타데이터 저장 형식]
   META_KEY = "PLANT_META_DATA"

   구조:
     {
       [plantId]: {
         favorite: boolean,
         WateringPeriod: number
       }
     }

   역할:
     - API에서 제공되지 않는 사용자 맞춤 정보 저장
     - API에서 식물 기본 데이터를 불러온 뒤 merge하여 사용
-------------------------------------------------- */
const META_KEY = "PLANT_META_DATA";

const loadMeta = async () => {
  const json = await AsyncStorage.getItem(META_KEY);
  return json ? JSON.parse(json) : {};
};

const saveMeta = async (obj) => {
  await AsyncStorage.setItem(META_KEY, JSON.stringify(obj));
};

/* -------------------------------------------------
   [이미지 파일명 생성기]
   - 기기 내부 저장소에 저장할 때 고유한 이름을 생성
   - expo-file-system 사용
-------------------------------------------------- */
export const generatePlantImageName = () => `img_plant_${Date.now()}.jpg`;
export const generateLeafImageName = () => `img_leaf_${Date.now()}.jpg`;

/* -------------------------------------------------
   [이미지 저장 - 식물 사진]
-------------------------------------------------- */
export const saveImageToStorage = async (uri, fileName) => {
  if (Platform.OS === "web") return uri;
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

/* -------------------------------------------------
   [이미지 저장 - 잎사귀 사진]
-------------------------------------------------- */
export const saveLeafImageToStorage = async (uri, fileName) => {
  if (Platform.OS === "web") return uri;
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

/* -------------------------------------------------
   날짜 포맷 변환 유틸
   ex) 2025-03-02 형태로 변환
-------------------------------------------------- */
const formatDate = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = ("0" + (dateObj.getMonth() + 1)).slice(-2);
  const d = ("0" + dateObj.getDate()).slice(-2);
  return `${y}-${m}-${d}`;
};

/* -------------------------------------------------
   [식물 목록 조회 fetchPlants()]
   데이터 구성 방식:
     1) API(userPlantService.getMyPlants)로 서버 데이터 수신
     2) 로컬 메타데이터(favorite / WateringPeriod) 불러오기
     3) 두 데이터를 merge하여 최종 객체 구성
     4) waterDate / nextWater는 프론트에서 계산

   주의:
     - WateringPeriod는 기본값 7일
     - 백엔드가 나중에 WateringPeriod 필드를 제공하면 그대로 대체 가능
     - leafPhotos는 API에서 전달받은 리스트 그대로 사용
-------------------------------------------------- */
export const fetchPlants = async () => {
  try {
    const apiPlants = await userPlantService.getMyPlants();
    const meta = await loadMeta();

    return apiPlants.map((p) => {
      const m = meta[p.id] || {};

      /* ---------------------------
         최근 물 준 날짜 (프론트 관리)
      ---------------------------- */
      const waterDate = p.last_watered || null;

      /* ---------------------------
         물주는 주기 (기본값 7)
      ---------------------------- */
      const WateringPeriod = m.WateringPeriod ?? 7;

      /* ---------------------------
         nextWater 계산
      ---------------------------- */
      let nextWater = null;
      if (waterDate) {
        const dt = new Date(waterDate);
        dt.setDate(dt.getDate() + WateringPeriod);
        nextWater = formatDate(dt);
      }

      /* ---------------------------
         최종 식물 데이터 구조
      ---------------------------- */
      return {
        id: p.id,
        plantId: p.plant_id,
        name:
          p.nickname ||
          p.species_label_ko ||
          p.common_name ||
          "이름 없음",
        image: p.image || null,
        waterDate,
        nextWater,
        wateringMethod: p.watering_info ?? null,
        WateringPeriod,
        favorite: m.favorite ?? false,
        leafPhotos: p.leafPhotos || [],
      };
    });
  } catch (e) {
    console.log("fetchPlants Error:", e);
    return [];
  }
};

/* -------------------------------------------------
   [updateWaterDate()]
   목적:
     - 물을 준 시점 기록을 백엔드에 알림
     - 프론트에서 waterDate/nextWater 즉시 계산해 화면에 반영

   흐름:
     1) recordWatering API 호출
     2) meta에서 WateringPeriod 조회
     3) waterDate = 오늘 날짜
     4) nextWater = waterDate + WateringPeriod
     5) 화면(HomeScreen 등)에서 이 값을 바로 반영
-------------------------------------------------- */
export const updateWaterDate = async (plantId) => {
  try {
    await userPlantService.recordWatering(plantId);

    const meta = await loadMeta();
    const WateringPeriod = meta[plantId]?.WateringPeriod ?? 7;

    const now = new Date();
    const waterDate = formatDate(now);

    const next = new Date(now);
    next.setDate(now.getDate() + WateringPeriod);
    const nextWater = formatDate(next);

    return { waterDate, nextWater };
  } catch (e) {
    console.log("updateWaterDate Error:", e);
    throw e;
  }
};

/* -------------------------------------------------
   ★ [추가] favorite 토글 기능
-------------------------------------------------- */
export const toggleFavorite = async (plantId) => {
  try {
    const meta = await loadMeta();

    if (!meta[plantId]) meta[plantId] = {};

    const prev = meta[plantId].favorite ?? false;
    meta[plantId].favorite = !prev;

    await saveMeta(meta);
    return meta[plantId].favorite;
  } catch (err) {
    console.log("toggleFavorite Error:", err);
    return false;
  }
};
