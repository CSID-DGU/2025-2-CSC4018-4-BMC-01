/*
  파일명: services/localDbService.js
  목적:
    - local SQLite 데이터베이스 제어
    - native 환경에서는 실제 SQLite + FileSystem 사용
    - Web 환경에서는 dummy DB 사용하여 앱이 죽지 않도록 보호
    - 기본 식물 DB + 사용자 식물(user_plants) + 물준기록(watering_logs)
    - 신규 기능: 누적 성실도(score) 기능 추가
        · 등록 시 score = 100
        · 물줄 때 점수 갱신 (+2 / -5 / -3)
        · 점수는 항상 0~100 범위 유지
        · Web(dummy) 환경에서는 모든 연산 안전하게 스킵됨
*/

import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";
import { Asset } from "expo-asset";

const DB_NAME = "plants.db";
let db = null;

// ------------------------------------------------------------
// Web 환경 여부
// ------------------------------------------------------------
const IS_WEB = Platform.OS === "web";

// ------------------------------------------------------------
// Web(dummy) DB — SQLite 비지원 환경 보호
// ------------------------------------------------------------
const dummyDb = {
  runAsync: async () => {},
  getAllAsync: async () => [],
  getFirstAsync: async () => null,
  execAsync: async () => {},
};

/* ============================================================
   initDatabase()
   설명:
     - Native: assets DB 복사 → SQLite open → 테이블 준비
     - Web: dummy DB 사용
   신규:
     - watering_logs 테이블 생성
     - user_plants.score 컬럼 추가 (없으면 생성)
============================================================ */
export const initDatabase = async () => {
  try {
    // --------------------------------------------------------
    // Web 환경은 dummy DB 사용
    // --------------------------------------------------------
    if (IS_WEB) {
      console.warn("[localDbService] Web 환경: SQLite 미지원 → dummy DB 사용");
      db = dummyDb;
      return db;
    }

    console.log("[localDbService] initDatabase 시작 (native)");

    const dbPath = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
    const dbDir = `${FileSystem.documentDirectory}SQLite`;

    // SQLite 폴더 존재 확인
    try {
      await FileSystem.readDirectoryAsync(dbDir);
    } catch (e) {
      await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
    }

    // DB 파일 존재 여부
    let dbExists = false;
    try {
      const files = await FileSystem.readDirectoryAsync(dbDir);
      dbExists = files.includes(DB_NAME);
    } catch (e) {}

    // --------------------------------------------------------
    // assets → DB 복사
    // --------------------------------------------------------
    if (!dbExists) {
      console.log("[localDbService] assets → SQLite DB 복사 중...");
      const asset = Asset.fromModule(require("../../assets/database/plants.db"));
      await asset.downloadAsync();

      await FileSystem.copyAsync({
        from: asset.localUri,
        to: dbPath,
      });

      console.log("[localDbService] DB 복사 완료");
    }

    // --------------------------------------------------------
    // DB 열기
    // --------------------------------------------------------
    db = await SQLite.openDatabaseAsync(DB_NAME);
    console.log("[localDbService] DB open 완료");

    // --------------------------------------------------------
    // 물준 기록 테이블 생성 (기존 유지)
    // --------------------------------------------------------
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS watering_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_plant_id INTEGER,
        water_date TEXT
      );
    `);

    // --------------------------------------------------------
    // NEW: user_plants.score 컬럼 생성
    //  - 최초 DB에는 없을 수 있으므로 ALTER TABLE 사용
    //  - 이미 존재하면 에러 발생 → catch에서 무시
    // --------------------------------------------------------
    try {
      await db.execAsync(`
        ALTER TABLE user_plants ADD COLUMN score INTEGER DEFAULT 100;
      `);
      console.log("[localDbService] score 컬럼 추가 완료");
    } catch (e) {
      console.log("[localDbService] score 컬럼 이미 존재");
    }

    return db;
  } catch (error) {
    console.error("[localDbService] initDatabase 오류:", error);
    throw error;
  }
};

/* ============================================================
   getDatabase()
============================================================ */
export const getDatabase = async () => {
  if (!db) {
    await initDatabase();
  }
  return db;
};

/* ============================================================
   Plants 관련
============================================================ */
export const getAllPlants = async () => {
  const database = await getDatabase();
  return await database.getAllAsync("SELECT * FROM plants ORDER BY ai_label_ko");
};

export const getPlantById = async (plantId) => {
  const database = await getDatabase();
  return await database.getFirstAsync("SELECT * FROM plants WHERE id = ?", [
    plantId,
  ]);
};

export const searchPlants = async (keyword) => {
  const database = await getDatabase();
  const term = `%${keyword}%`;
  return await database.getAllAsync(
    `SELECT * FROM plants
     WHERE ai_label_ko LIKE ? OR ai_label_en LIKE ?
     ORDER BY ai_label_ko`,
    [term, term]
  );
};

/* ============================================================
   Users 관련
============================================================ */
export const createUser = async (name) => {
  const database = await getDatabase();
  const result = await database.runAsync(
    "INSERT INTO users (name) VALUES (?)",
    [name]
  );
  return result.lastInsertRowId;
};

export const getUserById = async (userId) => {
  const database = await getDatabase();
  return await database.getFirstAsync("SELECT * FROM users WHERE id = ?", [
    userId,
  ]);
};

/* ============================================================
   User Plants 관련
============================================================ */
export const addUserPlant = async (
  userId,
  plantId,
  nickname,
  image,
  aiLabelEn,
  aiLabelKo,
  wateringperiod
) => {
  const database = await getDatabase();
  const today = new Date().toISOString().split("T")[0];

  const next = new Date();
  next.setDate(next.getDate() + (wateringperiod || 7));
  const nextDate = next.toISOString().split("T")[0];

  // ----------------------------------------------------------
  // 원본 INSERT 그대로 유지 (수정 없음)
  // ----------------------------------------------------------
  const result = await database.runAsync(
    `INSERT INTO user_plants
     (user_id, plant_id, nickname, image, ai_label_en, ai_label_ko, wateringperiod, last_watered, next_watering)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      plantId,
      nickname,
      image,
      aiLabelEn,
      aiLabelKo,
      wateringperiod || 7,
      today,
      nextDate,
    ]
  );

  const newId = result.lastInsertRowId;

  // ----------------------------------------------------------
  // NEW: 등록 직후 score = 100 설정 (INSERT 를 건드리지 않기 위해)
  // ----------------------------------------------------------
  try {
    await database.runAsync(
      "UPDATE user_plants SET score = 100 WHERE id = ?",
      [newId]
    );
  } catch (e) {
    console.log("[localDbService] score 초기 설정 실패:", e);
  }

  return newId;
};

export const getUserPlants = async (userId) => {
  const database = await getDatabase();
  return await database.getAllAsync(
    `SELECT up.*, p.ai_label_en, p.ai_label_ko,
            p.ideallight_ko, p.toleratedlight_ko, p.watering_ko,
            p.tempmin_celsius, p.tempmax_celsius,
            p.wateringperiod AS plant_wateringperiod
     FROM user_plants up
     LEFT JOIN plants p ON up.plant_id = p.id
     WHERE up.user_id = ?
     ORDER BY up.created_at DESC`,
    [userId]
  );
};

/* ============================================================
   recordWatering() — (원본 유지 + score 계산만 추가)
============================================================ */
export const recordWatering = async (userPlantId) => {
  const database = await getDatabase();
  const today = new Date().toISOString().split("T")[0];

  // ----------------------------------------------------------
  // 기존 로직: 물준 날짜 + next_watering 업데이트
  // ----------------------------------------------------------
  const plant = await database.getFirstAsync(
    "SELECT wateringperiod FROM user_plants WHERE id = ?",
    [userPlantId]
  );

  const next = new Date();
  next.setDate(next.getDate() + (plant?.wateringperiod || 7));
  const nextDate = next.toISOString().split("T")[0];

  await database.runAsync(
    `UPDATE user_plants
     SET last_watered = ?, next_watering = ?
     WHERE id = ?`,
    [today, nextDate, userPlantId]
  );

  // ----------------------------------------------------------
  // 기존 로직: 물준 기록(watering_logs) 추가
  // ----------------------------------------------------------
  await database.runAsync(
    `INSERT INTO watering_logs (user_plant_id, water_date)
     VALUES (?, ?)`,
    [userPlantId, today]
  );

  // ----------------------------------------------------------
  // NEW: 성실도(score) 갱신 로직 (원본 아래에 추가)
  //
  // 규칙:
  //   diff = (오늘 - 예정일)
  //   · 제때(diff == 0): +2
  //   · 지연(diff > 0): 1일당 -5
  //   · 조기(diff < 0): 1일당 -3
  //   · score = clamp(score + delta, 0, 100)
  //
  // Web(dummy) 환경은 모든 UPDATE/SELECT 자체가 dummy이므로
  // 위 로직 존재해도 에러 없이 자연스럽게 스킵됨.
  // ----------------------------------------------------------
  try {
    const info = await database.getFirstAsync(
      "SELECT next_watering, score, wateringperiod FROM user_plants WHERE id = ?",
      [userPlantId]
    );

    const due = new Date(info.next_watering);
    const now = new Date();
    const diff = Math.floor((now - due) / 86400000);

    let delta = 0;

    if (diff === 0) delta = +2;
    else if (diff > 0) delta = diff * -5;
    else delta = Math.abs(diff) * -3;

    const current = info.score ?? 100;
    const newScore = Math.max(0, Math.min(100, current + delta));

    await database.runAsync(
      "UPDATE user_plants SET score = ? WHERE id = ?",
      [newScore, userPlantId]
    );
  } catch (e) {
    console.log("[localDbService] score 업데이트 오류:", e);
  }
};

/* ============================================================
   물준 기록 조회
============================================================ */
export const getWateringHistory = async (userPlantId, days = 30) => {
  const database = await getDatabase();

  const limit = new Date();
  limit.setDate(limit.getDate() - days);
  const limitStr = limit.toISOString().split("T")[0];

  return await database.getAllAsync(
    `SELECT * FROM watering_logs
     WHERE user_plant_id = ?
     AND water_date >= ?
     ORDER BY water_date DESC`,
    [userPlantId, limitStr]
  );
};

/* ============================================================
   기타 기능
============================================================ */
export const deleteUserPlant = async (userPlantId) => {
  const database = await getDatabase();
  await database.runAsync("DELETE FROM user_plants WHERE id = ?", [
    userPlantId,
  ]);
};

export const updateDisease = async (userPlantId, disease) => {
  const database = await getDatabase();
  await database.runAsync(
    "UPDATE user_plants SET disease = ? WHERE id = ?",
    [disease, userPlantId]
  );
};

export default {
  initDatabase,
  getDatabase,
  getAllPlants,
  getPlantById,
  searchPlants,
  createUser,
  getUserById,
  addUserPlant,
  getUserPlants,
  recordWatering,
  deleteUserPlant,
  updateDisease,
  getWateringHistory,
};
