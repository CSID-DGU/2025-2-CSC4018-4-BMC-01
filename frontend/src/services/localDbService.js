/*
  파일명: services/localDbService.js
  기능:
    - expo-sqlite를 이용한 로컬 DB 관리
    - 앱(native) 환경에서는 SQLite + FileSystem 사용
    - Web 환경에서는 SQLite 미지원 → 안전한 더미 DB로 우회
    - plants / users / user_plants CRUD
    - 물준 기록(watering_logs) 기록 및 조회
*/

import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

const DB_NAME = 'plants.db';
let db = null;

// Web / Native 공통에서 사용할 플래그 & 더미 DB 객체
const IS_WEB = Platform.OS === 'web';

/* ============================================================
   Web 환경용 더미 DB
   - Expo Web은 FileSystem 접근이 제한적이므로
   - SQLite / FileSystem 사용 구문을 실제로 호출하지 않도록 우회
============================================================ */
const dummyDb = {
  runAsync: async () => {},
  getAllAsync: async () => [],
  getFirstAsync: async () => null,
  execAsync: async () => {},
};

/* ============================================================
   DB 초기화: Web / Native 분기 처리
   - Web:
       · FileSystem, Asset 복사 사용하지 않음
       · dummyDb 할당 후 반환
   - Native:
       · assets/database/plants.db 를 로컬로 복사
       · SQLite.openDatabaseAsync 로 DB 오픈
       · watering_logs 테이블 생성
============================================================ */
export const initDatabase = async () => {
  try {
    if (IS_WEB) {
      console.warn('[localDbService] Web 환경: SQLite 기능이 비활성화됩니다.');
      // 웹에서는 실제 파일 복사 없이 더미 DB 사용
      db = dummyDb;
      return db;
    }

    console.log('[localDbService] 데이터베이스 초기화 시작 (native)');

    const dbPath = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
    const dbDir = `${FileSystem.documentDirectory}SQLite`;

    // SQLite 폴더 생성 여부 확인
    try {
      await FileSystem.readDirectoryAsync(dbDir);
      console.log('[localDbService] SQLite 디렉토리 존재');
    } catch (error) {
      console.log('[localDbService] SQLite 디렉토리 생성');
      await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
    }

    // DB 파일 존재 여부 확인
    let dbExists = false;
    try {
      const files = await FileSystem.readDirectoryAsync(dbDir);
      dbExists = files.includes(DB_NAME);
      console.log('[localDbService] DB 파일 존재:', dbExists);
    } catch (error) {
      console.log('[localDbService] DB 디렉토리 읽기 오류:', error);
    }

    // DB 복사
    if (!dbExists) {
      console.log('[localDbService] assets에서 plants.db 복사 시작');
      const asset = Asset.fromModule(require('../../assets/database/plants.db'));
      await asset.downloadAsync();

      await FileSystem.copyAsync({
        from: asset.localUri,
        to: dbPath,
      });
      console.log('[localDbService] DB 복사 완료:', dbPath);
    }

    // DB 열기
    db = await SQLite.openDatabaseAsync(DB_NAME);
    console.log('[localDbService] 데이터베이스 열기 완료');

    // --------------------------
    // 물준 기록 테이블 생성
    // --------------------------
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS watering_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_plant_id INTEGER,
        water_date TEXT
      );
    `);
    console.log('[localDbService] watering_logs 생성 완료');

    return db;
  } catch (error) {
    console.error('[localDbService] initDatabase 오류:', error);
    throw error;
  }
};

/* ============================================================
   DB 핸들 가져오기
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
  try {
    const database = await getDatabase();
    const result = await database.getAllAsync('SELECT * FROM plants ORDER BY ai_label_ko');
    return result;
  } catch (error) {
    console.error('[localDbService] getAllPlants 오류:', error);
    throw error;
  }
};

export const getPlantById = async (plantId) => {
  try {
    const database = await getDatabase();
    return await database.getFirstAsync('SELECT * FROM plants WHERE id = ?', [plantId]);
  } catch (error) {
    console.error('[localDbService] getPlantById 오류:', error);
    throw error;
  }
};

export const searchPlants = async (keyword) => {
  try {
    const database = await getDatabase();
    const searchTerm = `%${keyword}%`;
    return await database.getAllAsync(
      `SELECT * FROM plants
       WHERE ai_label_ko LIKE ? OR ai_label_en LIKE ?
       ORDER BY ai_label_ko`,
      [searchTerm, searchTerm]
    );
  } catch (error) {
    console.error('[localDbService] searchPlants 오류:', error);
    throw error;
  }
};

/* ============================================================
   Users 관련
============================================================ */
export const createUser = async (name) => {
  try {
    const database = await getDatabase();
    const result = await database.runAsync(
      'INSERT INTO users (name) VALUES (?)',
      [name]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('[localDbService] createUser 오류:', error);
    throw error;
  }
};

export const getUserById = async (userId) => {
  try {
    const database = await getDatabase();
    return await database.getFirstAsync('SELECT * FROM users WHERE id = ?', [userId]);
  } catch (error) {
    console.error('[localDbService] getUserById 오류:', error);
    throw error;
  }
};

/* ============================================================
   User Plants 관련
============================================================ */
export const addUserPlant = async (userId, plantId, nickname, image, aiLabelEn, aiLabelKo, wateringperiod) => {
  try {
    const database = await getDatabase();
    const today = new Date().toISOString().split('T')[0];

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
        new Date(Date.now() + (wateringperiod || 7) * 86400000).toISOString().split('T')[0],
      ]
    );

    return result.lastInsertRowId;
  } catch (error) {
    console.error('[localDbService] addUserPlant 오류:', error);
    throw error;
  }
};

export const getUserPlants = async (userId) => {
  try {
    const database = await getDatabase();
    return await database.getAllAsync(
      `SELECT up.*, p.ai_label_en, p.ai_label_ko,
               p.ideallight_ko, p.toleratedlight_ko, p.watering_ko,
               p.tempmin_celsius, p.tempmax_celsius,
               p.wateringperiod as plant_wateringperiod
       FROM user_plants up
       LEFT JOIN plants p ON up.plant_id = p.id
       WHERE up.user_id = ?
       ORDER BY up.created_at DESC`,
      [userId]
    );
  } catch (error) {
    console.error('[localDbService] getUserPlants 오류:', error);
    throw error;
  }
};

export const updateUserPlant = async (userPlantId, nickname, wateringperiod, lastWatered, image) => {
  try {
    const database = await getDatabase();

    let query = 'UPDATE user_plants SET ';
    const params = [];

    if (nickname !== undefined) {
      query += 'nickname = ?, ';
      params.push(nickname);
    }
    if (wateringperiod !== undefined) {
      query += 'wateringperiod = ?, ';
      params.push(wateringperiod);
    }
    if (lastWatered !== undefined) {
      query += 'last_watered = ?, ';
      params.push(lastWatered);

      const next = new Date(lastWatered);
      next.setDate(next.getDate() + (wateringperiod || 7));
      query += 'next_watering = ?, ';
      params.push(next.toISOString().split('T')[0]);
    }
    if (image !== undefined) {
      query += 'image = ?, ';
      params.push(image);
    }

    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(userPlantId);

    await database.runAsync(query, params);
  } catch (error) {
    console.error('[localDbService] updateUserPlant 오류:', error);
    throw error;
  }
};

/* ============================================================
   물주기 기록 + 로그 저장
============================================================ */
export const recordWatering = async (userPlantId) => {
  try {
    const database = await getDatabase();
    const today = new Date().toISOString().split('T')[0];

    const plant = await database.getFirstAsync(
      'SELECT wateringperiod FROM user_plants WHERE id = ?',
      [userPlantId]
    );

    const next = new Date();
    next.setDate(next.getDate() + (plant?.wateringperiod || 7));

    await database.runAsync(
      `UPDATE user_plants
       SET last_watered = ?, next_watering = ?
       WHERE id = ?`,
      [today, next.toISOString().split('T')[0], userPlantId]
    );

    // 물준 기록 로그 저장
    await database.runAsync(
      `INSERT INTO watering_logs (user_plant_id, water_date)
       VALUES (?, ?)`,
      [userPlantId, today]
    );

    console.log(`[localDbService] 물주기 + 로그 저장 완료: ${userPlantId}`);
  } catch (error) {
    console.error('[localDbService] recordWatering 오류:', error);
    throw error;
  }
};

/* ============================================================
   물준 기록 조회 (리포트용)
============================================================ */
export const getWateringHistory = async (userPlantId, days = 30) => {
  try {
    const database = await getDatabase();

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    const limitStr = dateLimit.toISOString().split('T')[0];

    return await database.getAllAsync(
      `SELECT * FROM watering_logs
       WHERE user_plant_id = ?
       AND water_date >= ?
       ORDER BY water_date DESC`,
      [userPlantId, limitStr]
    );
  } catch (error) {
    console.error('[localDbService] getWateringHistory 오류:', error);
    throw error;
  }
};

/* ============================================================
   기타 기능
============================================================ */
export const deleteUserPlant = async (userPlantId) => {
  try {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM user_plants WHERE id = ?', [userPlantId]);
  } catch (error) {
    console.error('[localDbService] deleteUserPlant 오류:', error);
    throw error;
  }
};

export const updateDisease = async (userPlantId, disease) => {
  try {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE user_plants SET disease = ? WHERE id = ?',
      [disease, userPlantId]
    );
  } catch (error) {
    console.error('[localDbService] updateDisease 오류:', error);
    throw error;
  }
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
