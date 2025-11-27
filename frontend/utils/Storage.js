/*
  파일명: Storage.js
  목적:
    - 식물 관련 사용자 데이터 저장/조회 (로컬)
    - 백엔드 API 데이터를 불러온 뒤 로컬 메타데이터와 결합
    - 물주기 계산(waterDate / nextWater)
    - 식물/잎사귀 이미지 로컬 저장
    - 즐겨찾기(favorite), 알림 설정(__notification) 등 사용자 확장 정보 관리

  전체 구조 요약:
    - API(userPlantService): 식물 기본 정보 제공
    - 로컬 스토리지(AsyncStorage):
        · favorite
        · WateringPeriod
        · __notification
        · 이미지 파일 저장 경로
    - fetchPlants():
        API 데이터 + 로컬 메타데이터 → 최종 구조로 merge
*/

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { userPlantService } from "../src/services";

/* -------------------------------------------------
   [로컬 저장 디렉토리 설정]

   PLANT_DIR : 식물 대표 이미지 저장 폴더
   LEAF_DIR  : 잎사귀(병충해 분석) 이미지 저장 폴더

   ※ 앱 첫 실행 시 ensureDirs()로 폴더 존재 여부 검사 후 자동 생성
-------------------------------------------------- */
const PLANT_DIR = FileSystem.documentDirectory + "plants/";
const LEAF_DIR = FileSystem.documentDirectory + "leaf/";

async function ensureDirs() {
  if (Platform.OS === "web") return;

  const plantInfo = await FileSystem.getInfoAsync(PLANT_DIR);
  if (!plantInfo.exists) await FileSystem.makeDirectoryAsync(PLANT_DIR);

  const leafInfo = await FileSystem.getInfoAsync(LEAF_DIR);
  if (!leafInfo.exists) await FileSystem.makeDirectoryAsync(LEAF_DIR);
}
// 앱 로드시 초기 폴더 생성
ensureDirs();

/* -------------------------------------------------
   [로컬 메타데이터 구조]

   저장 키: META_KEY = "PLANT_META_DATA"

   meta = {
     [plantId]: {
       favorite: boolean,
       WateringPeriod: number
     },
     "__notification": {
       enabled: boolean,
       hour: number,
       minute: number
     }
   }

   역할:
     - 사용자 맞춤 데이터(즐겨찾기, 물주는 주기, 알림설정 등) 저장
     - API에서 내려오지 않는 정보들을 로컬에서 관리
-------------------------------------------------- */
const META_KEY = "PLANT_META_DATA";

export const loadMeta = async () => {
  const raw = await AsyncStorage.getItem(META_KEY);
  return raw ? JSON.parse(raw) : {};
};

export const saveMeta = async (obj) => {
  await AsyncStorage.setItem(META_KEY, JSON.stringify(obj));
};

/* -------------------------------------------------
   [이미지 파일명 생성기]
   - 기기 내부 저장소에 JPEG로 저장할 때 고유 파일명 생성
-------------------------------------------------- */
export const generatePlantImageName = () => `img_plant_${Date.now()}.jpg`;
export const generateLeafImageName = () => `img_leaf_${Date.now()}.jpg`;

/* -------------------------------------------------
   [이미지 저장 - 식물 대표 사진]
-------------------------------------------------- */
export const saveImageToStorage = async (uri, fileName) => {
  if (Platform.OS === "web") return uri;
  await ensureDirs();

  const dest = PLANT_DIR + fileName;
  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch (e) {
    console.error("[Storage] saveImageToStorage 오류:", e);
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
    console.error("[Storage] saveLeafImageToStorage 오류:", e);
    return uri;
  }
};

/* -------------------------------------------------
   날짜 포맷 변환 유틸 (YYYY-MM-DD)
-------------------------------------------------- */
const formatDate = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = ("0" + (dateObj.getMonth() + 1)).slice(-2);
  const d = ("0" + dateObj.getDate()).slice(-2);
  return `${y}-${m}-${d}`;
};

/* -------------------------------------------------
   [fetchPlants()]
   목적:
     - 백엔드 API 데이터(userPlantService.getMyPlants)와
       로컬 메타데이터(favorite / WateringPeriod)를 결합하여
       화면에서 사용하는 최종 식물 객체 생성

   처리 흐름:
     1) API에서 식물 리스트 수신
     2) META_KEY에서 favorite, WateringPeriod 불러오기
     3) waterDate(최근 물 준 날) 기반 nextWater 계산
     4) 모든 데이터를 하나의 객체로 merge한 뒤 반환

   주의:
     - WateringPeriod 기본값 = 7일
     - nextWater는 프론트에서 계산
-------------------------------------------------- */
export const fetchPlants = async () => {
  try {
    const apiPlants = await userPlantService.getMyPlants();
    const meta = await loadMeta();

    return apiPlants.map((p) => {
      const m = meta[p.id] || {};

      const waterDate = p.last_watered || null;
      const WateringPeriod = m.WateringPeriod ?? p.wateringperiod ?? 7;

      // DB의 next_watering 값이 있으면 우선 사용, 없으면 계산
      let nextWater = p.next_watering || null;
      if (!nextWater && waterDate) {
        const dt = new Date(waterDate);
        dt.setDate(dt.getDate() + WateringPeriod);
        nextWater = formatDate(dt);
      }

      // 원본 API 데이터를 모두 유지하면서 추가 필드만 병합
      return {
        ...p, // 모든 API 필드 유지 (nickname, ai_label_ko, last_watered, next_watering, watering, wateringperiod, tempmax_celsius, ideallight 등)
        // 호환성을 위한 추가 필드
        name: p.nickname || p.ai_label_ko || "이름 없음",
        waterDate,
        nextWater,
        wateringMethod: p.watering ?? null,
        WateringPeriod,
        favorite: m.favorite ?? false,
        leafPhotos: p.leafPhotos || []
      };
    });
  } catch (e) {
    console.error("[Storage] fetchPlants 오류:", e);
    return [];
  }
};

/* -------------------------------------------------
   [updateWaterDate()]
   목적:
     - 서버에 “물 줬다” 이벤트를 기록(recordWatering)
     - 프론트에서 waterDate / nextWater 즉시 계산해 반환

   반환값:
     {
       waterDate: "YYYY-MM-DD",
       nextWater: "YYYY-MM-DD"
     }
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
    console.error("[Storage] updateWaterDate 오류:", e);
    throw e;
  }
};

/* -------------------------------------------------
   [toggleFavorite()]
   목적:
     - plantId 기준 favorite true/false 전환
     - 로컬 메타데이터에 즉시 저장
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
    console.error("[Storage] toggleFavorite 오류:", err);
    return false;
  }
};

/* -------------------------------------------------
   [알림 설정]
   meta.__notification = {
     enabled: boolean,
     hour: number,
     minute: number
   }

   - 알림 설정 화면(NotificationSettingScreen)과 연동
-------------------------------------------------- */
export const loadNotificationData = async () => {
  const meta = await loadMeta();
  return meta["__notification"] || null;
};

export const saveNotificationData = async (obj) => {
  const meta = await loadMeta();
  meta["__notification"] = obj;
  await saveMeta(meta);
};
