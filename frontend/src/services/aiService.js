import { Platform } from 'react-native';
import * as localDb from './localDbService';
import userService from './userService';

// Google Cloud AI API URL (백엔드와 동일)
const AI_API_URL = 'https://smartpot-api-551846265142.asia-northeast3.run.app/infer';

/**
 * AI 이미지 분석 서비스
 * - 식물 종류 판별 (mode="plant")
 * - 병충해 판별 (mode="disease")
 */

/**
 * 식물 종류 분석만 수행 (저장하지 않음)
 * @param {string} imageUri - 이미지 파일 경로 (file://)
 * @param {string} originalFileName - 원본 파일명 (선택, 없으면 자동 생성)
 * @returns {Promise<Object>} - AI 분석 결과 + plants DB 정보
 */
export const analyzeSpecies = async (imageUri, originalFileName = null) => {
  try {
    console.log('[analyzeSpecies] 시작:', { imageUri, originalFileName, platform: Platform.OS });

    // 파일명 결정
    let filename = originalFileName || imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    if (!match) {
      const ext = type === 'image/png' ? 'png' : 'jpg';
      filename = `${filename}.${ext}`;
    }

    if (!filename.startsWith('plant_') && !filename.startsWith('leaf_')) {
      filename = `plant_${filename}`;
    }

    // FormData 생성
    const formData = new FormData();

    // 플랫폼별 처리
    if (Platform.OS === 'web') {
      if (imageUri.startsWith('blob:') || imageUri.startsWith('http')) {
        const blobResponse = await fetch(imageUri);
        const blob = await blobResponse.blob();
        const file = new File([blob], filename, { type: type });
        formData.append('file', file);
      } else {
        throw new Error('Web에서는 blob URL이 필요합니다');
      }
    } else {
      formData.append('file', {
        uri: imageUri,
        name: filename,
        type: type,
      });
    }

    console.log('[analyzeSpecies] Google Cloud AI API 호출 시작');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // Google Cloud AI API 호출
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('[analyzeSpecies] AI API 응답 상태:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[analyzeSpecies] AI API 오류:', errorText);
        throw new Error(`AI API 오류 (${response.status})`);
      }

      const aiData = await response.json();
      console.log('[analyzeSpecies] AI 분석 결과:', aiData);

      const predLabelEn = aiData.pred_label;
      const predLabelKo = aiData.pred_label_ko;

      // 로컬 DB에서 식물 정보 검색
      const plants = await localDb.searchPlants(predLabelKo);
      let plantInfo = null;

      if (plants && plants.length > 0) {
        const plant = plants[0];
        plantInfo = {
          plant_id: plant.id,
          ai_label_en: plant.ai_label_en,
          ai_label_ko: plant.ai_label_ko,
          wateringperiod: plant.wateringperiod || 7,
          ideallight: plant.ideallight,
          toleratedlight: plant.toleratedlight,
          watering: plant.watering,
          tempmin_celsius: plant.tempmin_celsius,
          tempmax_celsius: plant.tempmax_celsius,
        };
      }

      return {
        success: true,
        aiLabelEn: predLabelEn,
        aiLabelKo: predLabelKo,
        confidence: aiData.confidence,
        plantInfo: plantInfo,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('요청 시간 초과 (30초)');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('[analyzeSpecies] 에러:', error);
    throw error;
  }
};

/**
 * 식물 종류 판별 (카메라로 찍은 식물 사진 분석)
 * @param {number} userId - 사용자 ID
 * @param {string} imageUri - 이미지 파일 경로 (file://)
 * @param {string} nickname - 식물 닉네임 (선택)
 * @param {string} originalFileName - 원본 파일명 (선택)
 * @returns {Promise<Object>} - AI 분석 결과 및 생성된 user_plant 정보
 */
export const identifySpecies = async (userId, imageUri, nickname = null, originalFileName = null) => {
  try {
    console.log('[identifySpecies] 시작:', { userId, imageUri, nickname, platform: Platform.OS });

    // 파일명 결정
    let filename = originalFileName || imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    if (!match) {
      const ext = type === 'image/png' ? 'png' : 'jpg';
      filename = `${filename}.${ext}`;
    }

    if (!filename.startsWith('plant_') && !filename.startsWith('leaf_')) {
      filename = `plant_${filename}`;
    }

    // FormData 생성
    const formData = new FormData();

    // 플랫폼별 처리
    if (Platform.OS === 'web') {
      if (imageUri.startsWith('blob:') || imageUri.startsWith('http')) {
        const blobResponse = await fetch(imageUri);
        const blob = await blobResponse.blob();
        const file = new File([blob], filename, { type: type });
        formData.append('file', file);
      } else {
        throw new Error('Web에서는 blob URL이 필요합니다');
      }
    } else {
      formData.append('file', {
        uri: imageUri,
        name: filename,
        type: type,
      });
    }

    console.log('[identifySpecies] Google Cloud AI API 호출 시작');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // Google Cloud AI API 직접 호출
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('[identifySpecies] AI API 응답 상태:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[identifySpecies] AI API 오류:', errorText);
        throw new Error(`AI API 오류 (${response.status})`);
      }

      const aiData = await response.json();
      console.log('[identifySpecies] AI 분석 결과:', aiData);

      const predLabelEn = aiData.pred_label;
      const predLabelKo = aiData.pred_label_ko;

      // 로컬 DB에서 식물 검색
      const plants = await localDb.searchPlants(predLabelKo);
      let plantId = null;
      let wateringPeriod = 7;

      if (plants && plants.length > 0) {
        plantId = plants[0].id;
        wateringPeriod = plants[0].wateringperiod || 7;
      }

      // 사용자 식물 추가
      const userPlantId = await localDb.addUserPlant(
        userId,
        plantId,
        nickname || predLabelKo,
        imageUri,
        predLabelEn,
        predLabelKo,
        wateringPeriod
      );

      // 생성된 식물 조회
      const userPlants = await localDb.getUserPlants(userId);
      const createdPlant = userPlants.find(p => p.id === userPlantId);

      return {
        success: true,
        userPlant: createdPlant,
        aiResult: {
          species: predLabelEn,
          speciesKo: predLabelKo,
          confidence: aiData.confidence,
        },
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('요청 시간 초과 (30초)');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('[identifySpecies] 에러:', error);
    throw error;
  }
};

/**
 * 병충해 판별 (식물 잎사귀 사진 분석)
 * @param {number} userPlantId - 사용자 식물 ID
 * @param {string} imageUri - 이미지 파일 경로 (file://)
 * @param {string} filename - 파일명 (leaf_ 프리픽스 포함되어 전달됨)
 * @returns {Promise<Object>} - 병충해 진단 결과
 */
export const diagnoseDisease = async (userPlantId, imageUri, filename) => {
  try {
    console.log('[diagnoseDisease] 시작:', { userPlantId, imageUri, filename, platform: Platform.OS });

    // 파일명이 제공되지 않은 경우 기본값 사용
    if (!filename) {
      filename = `leaf_${Date.now()}.jpg`;
    }

    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // FormData 생성
    const formData = new FormData();

    // 플랫폼별로 다르게 처리
    if (Platform.OS === 'web') {
      console.log('[diagnoseDisease] Web 플랫폼 처리');
      if (imageUri.startsWith('blob:') || imageUri.startsWith('http')) {
        const blobResponse = await fetch(imageUri);
        const blob = await blobResponse.blob();
        const file = new File([blob], filename, { type: type });
        formData.append('file', file);
      } else {
        throw new Error('Web에서는 blob URL이 필요합니다');
      }
    } else {
      console.log('[diagnoseDisease] React Native 플랫폼 처리');
      formData.append('file', {
        uri: imageUri,
        name: filename,
        type: type,
      });
    }

    console.log('[diagnoseDisease] Google Cloud AI API 호출 시작');

    // Google Cloud AI API 직접 호출 with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[diagnoseDisease] 30초 타임아웃');
      controller.abort();
    }, 30000);

    try {
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('[diagnoseDisease] AI API 응답 상태:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[diagnoseDisease] AI API 오류:', errorText);
        throw new Error(`AI API 오류 (${response.status})`);
      }

      const aiData = await response.json();
      console.log('[diagnoseDisease] AI 분석 결과:', aiData);

      const disease = aiData.pred_label_ko || aiData.pred_label;

      // 로컬 DB에 병충해 정보 저장
      await localDb.updateDisease(userPlantId, disease);

      return {
        success: true,
        userPlantId: userPlantId,
        disease: disease,
        aiResult: {
          disease: disease,
          confidence: aiData.confidence,
        },
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[diagnoseDisease] 타임아웃 발생');
        throw new Error('요청 시간 초과 (30초). 네트워크 연결을 확인해주세요.');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('[diagnoseDisease] 최종 에러:', error);
    throw error;
  }
};

export default {
  analyzeSpecies,
  identifySpecies,
  diagnoseDisease,
};
