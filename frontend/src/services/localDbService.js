/*
  파일명: services/localDbService.js
  기능:
    - 로컬 SQLite 데이터베이스 제어
    - Native: 실제 SQLite + FileSystem 사용
    - Web: dummy DB 사용하여 앱 크래시 방지
    - 테이블: plants, users, user_plants, watering_logs
    - 성실도(score) 관리:
        · 등록 시 score = 100
        · 물줄 때 점수 갱신 (제때: +2 / 지연: 1일당 -5)
        · 점수 범위: 0~100
        · Web 환경에서는 모든 연산 스킵
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
// 한국 시간 기준 오늘 날짜 (YYYY-MM-DD)
// ------------------------------------------------------------
const getTodayKST = () => {
  const now = new Date();
  // 한국 시간으로 변환 (UTC+9)
  const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return kst.toISOString().split("T")[0];
};

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

    // user_plants.score 컬럼 생성
    // 최초 DB에는 없을 수 있으므로 ALTER TABLE 사용
    // 이미 존재하면 에러 발생 → catch에서 무시
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
   설명: DB 인스턴스 반환, 없으면 초기화
============================================================ */
export const getDatabase = async () => {
  try {
    if (!db) {
      console.log("[getDatabase] DB 초기화 시도");
      await initDatabase();
    }

    if (!db) {
      console.error("[getDatabase] DB 초기화 실패");
      // Web 환경에서는 dummy DB라도 반환
      if (IS_WEB) {
        return dummyDb;
      }
      throw new Error("Database initialization failed");
    }

    return db;
  } catch (error) {
    console.error("[getDatabase] 오류:", error);
    // 최후의 수단: Web 환경이면 dummy DB 반환
    if (IS_WEB) {
      return dummyDb;
    }
    // Native 환경에서는 재초기화 시도
    try {
      console.log("[getDatabase] DB 재초기화 시도");
      db = null;
      await initDatabase();
      return db || dummyDb;
    } catch (retryError) {
      console.error("[getDatabase] 재초기화 실패:", retryError);
      return dummyDb; // 완전 실패 시 dummy DB로 폴백
    }
  }
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
  const today = getTodayKST();

  const kstNow = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
  const next = new Date(kstNow);
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

  // 등록 직후 score = 100 설정
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
  try {
    const database = await getDatabase();
    if (!database) {
      console.error("[getUserPlants] DB가 초기화되지 않았습니다");
      return [];
    }

    const result = await database.getAllAsync(
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
    return result || [];
  } catch (error) {
    console.error("[getUserPlants] 오류:", error);
    return [];
  }
};

/* ============================================================
   recordWatering() — (원본 유지 + score 계산만 추가)
============================================================ */
export const recordWatering = async (userPlantId) => {
  const database = await getDatabase();
  const today = getTodayKST();

  // 점수 계산 (next_watering 업데이트 전에)
  // 규칙:
  //   diff = (오늘 - 예정일)
  //   제때(diff == 0): +2
  //   지연(diff > 0): 1일당 -5
  //   score = clamp(score + delta, 0, 100)
  // 참고:
  //   UI상 물주기 버튼은 nextWater <= today일 때만 표시되므로 조기 물주기는 발생하지 않음
  //   Web 환경은 모든 UPDATE/SELECT가 dummy이므로 에러 없이 스킵됨
  try {
    const info = await database.getFirstAsync(
      "SELECT next_watering, score FROM user_plants WHERE id = ?",
      [userPlantId]
    );

    const due = new Date(info.next_watering);  // 원래 예정일
    const now = new Date(today);
    const diff = Math.floor((now - due) / 86400000);

    let delta = 0;

    if (diff === 0) {
      delta = +2;          // 제때
    } else if (diff > 0) {
      delta = diff * -5;   // 지연 (1일당 -5점)
    }
    // diff < 0 (조기)는 UI상 발생하지 않으므로 처리 안 함

    const current = info.score ?? 100;
    const newScore = Math.max(0, Math.min(100, current + delta));

    await database.runAsync(
      "UPDATE user_plants SET score = ? WHERE id = ?",
      [newScore, userPlantId]
    );
  } catch (e) {
    console.log("[localDbService] score 업데이트 오류:", e);
  }

  // next_watering 업데이트
  const plant = await database.getFirstAsync(
    "SELECT wateringperiod FROM user_plants WHERE id = ?",
    [userPlantId]
  );

  const kstNow = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
  const next = new Date(kstNow);
  next.setDate(next.getDate() + (plant?.wateringperiod || 7));
  const nextDate = next.toISOString().split("T")[0];

  await database.runAsync(
    `UPDATE user_plants
     SET last_watered = ?, next_watering = ?
     WHERE id = ?`,
    [today, nextDate, userPlantId]
  );

  // ----------------------------------------------------------
  // 3. 물준 기록(watering_logs) 추가
  // ----------------------------------------------------------
  await database.runAsync(
    `INSERT INTO watering_logs (user_plant_id, water_date)
     VALUES (?, ?)`,
    [userPlantId, today]
  );
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
/* ============================================================
   사용자 식물 정보 수정
============================================================ */
export const updateUserPlant = async (
  userPlantId,
  nickname,
  wateringperiod,
  last_watered,
  image
) => {
  console.log("[updateUserPlant] 호출:", {
    userPlantId,
    nickname,
    wateringperiod,
    last_watered,
    image
  });

  try {
    // Web 환경 체크 (dummy DB)
    if (IS_WEB) {
      console.log("[updateUserPlant] Web 환경 - 업데이트 스킵");
      return;
    }

    // 업데이트할 필드와 값을 동적으로 구성
    const updates = [];
    const values = [];

    if (nickname !== undefined && nickname !== null) {
      updates.push("nickname = ?");
      values.push(nickname);
    }

    if (wateringperiod !== undefined && wateringperiod !== null) {
      updates.push("wateringperiod = ?");
      values.push(wateringperiod);
    }

    // last_watered가 변경되면 next_watering도 재계산
    if (last_watered !== undefined && last_watered !== null) {
      updates.push("last_watered = ?");
      values.push(last_watered);

      // next_watering 계산: DB 조회 없이 wateringperiod 파라미터나 기본값 사용
      const period = wateringperiod || 7; // DB 조회 없이 파라미터 사용
      const next = new Date(last_watered);
      next.setDate(next.getDate() + period);
      const nextDate = next.toISOString().split("T")[0];

      updates.push("next_watering = ?");
      values.push(nextDate);
    }

    if (image !== undefined && image !== null) {
      updates.push("image = ?");
      values.push(image);
    }

    // 업데이트할 내용이 있으면 실행
    if (updates.length > 0) {
      const database = await getDatabase();
      if (!database) {
        console.error("[updateUserPlant] DB가 초기화되지 않았습니다");
        return;
      }

      values.push(userPlantId);
      const query = `UPDATE user_plants SET ${updates.join(", ")} WHERE id = ?`;

      console.log("[updateUserPlant] 쿼리:", query);
      console.log("[updateUserPlant] 값:", values);

      await database.runAsync(query, values);
      console.log("[updateUserPlant] 업데이트 완료:", userPlantId);
    } else {
      console.log("[updateUserPlant] 업데이트할 필드 없음");
    }
  } catch (error) {
    console.error("[updateUserPlant] 전체 오류:", error);
    // DB 재초기화 시도
    console.log("[updateUserPlant] DB 재초기화 시도");
    db = null;
    throw error;
  }
};

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
  updateUserPlant,
  recordWatering,
  deleteUserPlant,
  updateDisease,
  getWateringHistory,
};
