/*
  파일명: storage.js
  기능: AsyncStorage를 이용하여 화분 및 물주기 데이터를 저장, 로드, 수정, 삭제
*/

import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native"; // ✅ 추가 (캘린더 갱신용)

// ✅ 데이터 키 정의
const PLANTS_KEY = "MY_PLANTS";
const CALENDAR_KEY = "CALENDAR_DATA";

/*
  기능: 한국 표준시(KST) 기준 날짜 문자열 반환
*/
const getLocalDate = (d = new Date()) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
};

/*
  기능: 식물 데이터 전체 불러오기
  반환값: [{id, name, image, waterDate, nextWater}, ...]
*/
export const loadPlants = async () => {
  try {
    const data = await AsyncStorage.getItem(PLANTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("[loadPlants]", e);
    return [];
  }
};

/*
  기능: 식물 리스트 전체 저장
*/
export const savePlantList = async (plants) => {
  try {
    await AsyncStorage.setItem(PLANTS_KEY, JSON.stringify(plants));
  } catch (e) {
    console.error("[savePlantList]", e);
  }
};

/*
  기능: 새로운 식물 추가
  매개변수: plant 객체
*/
export const addPlant = async (plant) => {
  try {
    const list = await loadPlants();
    const updated = [...list, plant];
    await savePlantList(updated);
  } catch (e) {
    console.error("[addPlant]", e);
  }
};

/*
  기능: 특정 ID로 식물 삭제
*/
export const deletePlantById = async (id) => {
  try {
    const list = await loadPlants();
    const filtered = list.filter((p) => p.id !== id);
    await savePlantList(filtered);
  } catch (e) {
    console.error("[deletePlantById]", e);
  }
};

/*
  기능: 물준 날짜 업데이트 (KST 기준)
  - 오늘 날짜 waterDate로 갱신
  - 다음 물주는 날짜 nextWater로 +3일 계산
  - CALENDAR_DATA에 해당 날짜 기록 저장
  - ✅ DeviceEventEmitter로 'CALENDAR_UPDATE' 신호 발송
*/
export const updateWaterDate = async (id) => {
  try {
    const plants = await loadPlants();
    const today = getLocalDate();
    const next = getLocalDate(new Date(Date.now() + 3 * 86400000));

    const updated = plants.map((p) =>
      p.id === id ? { ...p, waterDate: today, nextWater: next } : p
    );
    await savePlantList(updated);

    // ✅ 캘린더 데이터 업데이트
    const calendarData = (await AsyncStorage.getItem(CALENDAR_KEY)) || "{}";
    const parsed = JSON.parse(calendarData);

    const newData = {
      ...parsed,
      [today]: { marked: true, dotColor: "#27AE60" },
    };

    await AsyncStorage.setItem(CALENDAR_KEY, JSON.stringify(newData));

    // ✅ 캘린더 새로고침 트리거 (이벤트 브로드캐스트)
    DeviceEventEmitter.emit("CALENDAR_UPDATE");
  } catch (e) {
    console.error("[updateWaterDate]", e);
  }
};

/*
  기능: 화분 순서 재정렬 후 저장
*/
export const reorderPlants = async (newOrder) => {
  try {
    await savePlantList(newOrder);
  } catch (e) {
    console.error("[reorderPlants]", e);
  }
};

/*
  기능: 캘린더에 표시할 데이터 불러오기
*/
export const getCalendarData = async () => {
  try {
    const data = await AsyncStorage.getItem(CALENDAR_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error("[getCalendarData]", e);
    return {};
  }
};

/*
  기능: 기존 화분 데이터 수정 (사진편집용)
*/
export const updatePlant = async (updatedPlant) => {
  try {
    const plants = await loadPlants();
    const newList = plants.map((p) =>
      p.id === updatedPlant.id ? updatedPlant : p
    );
    await savePlantList(newList);
  } catch (e) {
    console.error("[updatePlant]", e);
  }
};
