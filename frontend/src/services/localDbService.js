/*
  파일명: services/localDbService.js
  기능: expo-sqlite를 사용한 로컬 데이터베이스 서비스
*/

import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

const DB_NAME = 'plants.db';

let db = null;

/**
 * 데이터베이스 초기화
 * assets에서 DB 파일을 앱의 documentDirectory로 복사
 */
export const initDatabase = async () => {
  try {
    console.log('[localDbService] 데이터베이스 초기화 시작');

    const dbPath = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
    const dbDir = `${FileSystem.documentDirectory}SQLite`;

    // SQLite 디렉토리 확인 및 생성
    try {
      await FileSystem.readDirectoryAsync(dbDir);
      console.log('[localDbService] SQLite 디렉토리 존재');
    } catch (error) {
      console.log('[localDbService] SQLite 디렉토리 생성');
      await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
    }

    // DB 파일 존재 확인
    let dbExists = false;
    try {
      const files = await FileSystem.readDirectoryAsync(dbDir);
      dbExists = files.includes(DB_NAME);
      console.log('[localDbService] DB 파일 존재:', dbExists);
    } catch (error) {
      console.log('[localDbService] DB 디렉토리 읽기 오류:', error);
    }

    // DB 파일이 없으면 assets에서 복사
    if (!dbExists) {
      console.log('[localDbService] assets에서 DB 복사 시작');
      const asset = Asset.fromModule(require('../../assets/database/plants.db'));
      await asset.downloadAsync();
      console.log('[localDbService] Asset 다운로드 완료:', asset.localUri);

      await FileSystem.copyAsync({
        from: asset.localUri,
        to: dbPath,
      });
      console.log('[localDbService] DB 복사 완료:', dbPath);
    }

    // 데이터베이스 열기
    console.log('[localDbService] 데이터베이스 열기 시도');
    db = await SQLite.openDatabaseAsync(DB_NAME);
    console.log('[localDbService] 데이터베이스 열기 완료');

    return db;
  } catch (error) {
    console.error('[localDbService] 초기화 오류:', error);
    throw error;
  }
};

/**
 * 데이터베이스 인스턴스 가져오기
 */
export const getDatabase = async () => {
  if (!db) {
    await initDatabase();
  }
  return db;
};

// ==================== Plants 관련 ====================

/**
 * 전체 식물 목록 조회
 */
export const getAllPlants = async () => {
  try {
    const database = await getDatabase();
    const result = await database.getAllAsync('SELECT * FROM plants ORDER BY ai_label_ko');
    console.log(`[localDbService] 식물 ${result.length}개 조회`);
    return result;
  } catch (error) {
    console.error('[localDbService] getAllPlants 오류:', error);
    throw error;
  }
};

/**
 * ID로 식물 조회
 */
export const getPlantById = async (plantId) => {
  try {
    const database = await getDatabase();
    const result = await database.getFirstAsync('SELECT * FROM plants WHERE id = ?', [plantId]);
    return result;
  } catch (error) {
    console.error('[localDbService] getPlantById 오류:', error);
    throw error;
  }
};

/**
 * 식물 검색
 */
export const searchPlants = async (keyword) => {
  try {
    const database = await getDatabase();
    const searchTerm = `%${keyword}%`;
    const result = await database.getAllAsync(
      `SELECT * FROM plants
       WHERE ai_label_ko LIKE ? OR ai_label_en LIKE ?
       ORDER BY ai_label_ko`,
      [searchTerm, searchTerm]
    );
    console.log(`[localDbService] 검색어 "${keyword}": ${result.length}개 발견`);
    return result;
  } catch (error) {
    console.error('[localDbService] searchPlants 오류:', error);
    throw error;
  }
};

// ==================== Users 관련 ====================

/**
 * 사용자 생성
 */
export const createUser = async (name) => {
  try {
    const database = await getDatabase();
    const result = await database.runAsync(
      'INSERT INTO users (name) VALUES (?)',
      [name]
    );
    console.log(`[localDbService] 사용자 생성: ID ${result.lastInsertRowId}`);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('[localDbService] createUser 오류:', error);
    throw error;
  }
};

/**
 * 사용자 조회
 */
export const getUserById = async (userId) => {
  try {
    const database = await getDatabase();
    const result = await database.getFirstAsync('SELECT * FROM users WHERE id = ?', [userId]);
    return result;
  } catch (error) {
    console.error('[localDbService] getUserById 오류:', error);
    throw error;
  }
};

// ==================== User Plants 관련 ====================

/**
 * 사용자 식물 추가
 */
export const addUserPlant = async (userId, plantId, nickname, image, aiLabelEn, aiLabelKo, wateringperiod) => {
  try {
    const database = await getDatabase();
    const today = new Date().toISOString().split('T')[0];

    const result = await database.runAsync(
      `INSERT INTO user_plants
       (user_id, plant_id, nickname, image, ai_label_en, ai_label_ko, wateringperiod, last_watered, next_watering)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, plantId, nickname, image, aiLabelEn, aiLabelKo, wateringperiod || 7, today,
       new Date(Date.now() + (wateringperiod || 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]
    );

    console.log(`[localDbService] 사용자 식물 추가: ID ${result.lastInsertRowId}`);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('[localDbService] addUserPlant 오류:', error);
    throw error;
  }
};

/**
 * 사용자의 식물 목록 조회
 */
export const getUserPlants = async (userId) => {
  try {
    const database = await getDatabase();
    const result = await database.getAllAsync(
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
    console.log(`[localDbService] 사용자 식물 ${result.length}개 조회`);
    return result;
  } catch (error) {
    console.error('[localDbService] getUserPlants 오류:', error);
    throw error;
  }
};

/**
 * 사용자 식물 수정
 */
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
      // next_watering 계산
      const nextWateringDate = new Date(lastWatered);
      nextWateringDate.setDate(nextWateringDate.getDate() + (wateringperiod || 7));
      query += 'next_watering = ?, ';
      params.push(nextWateringDate.toISOString().split('T')[0]);
    }
    if (image !== undefined) {
      query += 'image = ?, ';
      params.push(image);
    }

    // 마지막 쉼표 제거
    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(userPlantId);

    await database.runAsync(query, params);
    console.log(`[localDbService] 사용자 식물 ${userPlantId} 수정 완료`);
  } catch (error) {
    console.error('[localDbService] updateUserPlant 오류:', error);
    throw error;
  }
};

/**
 * 물주기 기록
 */
export const recordWatering = async (userPlantId) => {
  try {
    const database = await getDatabase();
    const today = new Date().toISOString().split('T')[0];

    // wateringperiod 조회
    const plant = await database.getFirstAsync(
      'SELECT wateringperiod FROM user_plants WHERE id = ?',
      [userPlantId]
    );

    const nextWateringDate = new Date();
    nextWateringDate.setDate(nextWateringDate.getDate() + (plant.wateringperiod || 7));

    await database.runAsync(
      'UPDATE user_plants SET last_watered = ?, next_watering = ? WHERE id = ?',
      [today, nextWateringDate.toISOString().split('T')[0], userPlantId]
    );

    console.log(`[localDbService] 물주기 기록: ${userPlantId}`);
  } catch (error) {
    console.error('[localDbService] recordWatering 오류:', error);
    throw error;
  }
};

/**
 * 사용자 식물 삭제
 */
export const deleteUserPlant = async (userPlantId) => {
  try {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM user_plants WHERE id = ?', [userPlantId]);
    console.log(`[localDbService] 사용자 식물 ${userPlantId} 삭제 완료`);
  } catch (error) {
    console.error('[localDbService] deleteUserPlant 오류:', error);
    throw error;
  }
};

/**
 * 병충해 정보 업데이트
 */
export const updateDisease = async (userPlantId, disease) => {
  try {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE user_plants SET disease = ? WHERE id = ?',
      [disease, userPlantId]
    );
    console.log(`[localDbService] 병충해 정보 업데이트: ${userPlantId}`);
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
};
