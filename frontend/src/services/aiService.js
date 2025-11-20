import { API_URL } from '../config';

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
  console.log('🔵 [analyzeSpecies] 시작');
  console.log('🔵 이미지 URI:', imageUri);
  console.log('🔵 원본 파일명:', originalFileName);
  console.log('🔵 API URL:', API_URL);

  try {
    // FormData 생성
    const formData = new FormData();

    // 파일명 결정: 원본 파일명 우선, 없으면 URI에서 추출
    let filename = originalFileName || imageUri.split('/').pop();

    // 확장자 확인
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // 확장자가 없으면 추가
    if (!match) {
      const ext = type === 'image/png' ? 'png' : 'jpg';
      filename = `${filename}.${ext}`;
    }

    // 라우팅을 위해 plant_ 프리픽스 추가 (이미 있으면 추가 안함)
    if (!filename.startsWith('plant_') && !filename.startsWith('leaf_')) {
      filename = `plant_${filename}`;
    }

    console.log('🔵 사용할 파일명:', filename);
    console.log('🔵 파일 타입:', type);

    // React Native Web의 경우 blob URL을 File 객체로 변환
    if (imageUri.startsWith('blob:')) {
      console.log('🔵 Blob URL 감지, File 객체로 변환 중...');
      const blobResponse = await fetch(imageUri);
      const blob = await blobResponse.blob();
      const file = new File([blob], filename, { type: type });
      console.log('🔵 File 객체 생성 완료:', file.name, file.size, 'bytes');
      formData.append('file', file);
    } else {
      // React Native (모바일)의 경우
      formData.append('file', {
        uri: imageUri,
        name: filename,
        type: type,
      });
    }

    const fullUrl = `${API_URL}/ai/analyze`;
    console.log('🔵 전체 요청 URL:', fullUrl);
    console.log('🔵 요청 전송 중...');

    // API 요청
    // 주의: FormData 사용 시 Content-Type을 명시하면 안 됨 (브라우저가 자동으로 boundary 설정)
    const response = await fetch(fullUrl, {
      method: 'POST',
      body: formData,
    });

    console.log('🔵 응답 상태 코드:', response.status);
    console.log('🔵 응답 OK:', response.ok);

    const data = await response.json();
    console.log('🔵 응답 데이터:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('✅ 분석 성공!');
      return {
        success: true,
        speciesLabel: data.species_label,
        speciesLabelKo: data.species_label_ko,
        confidence: data.confidence,
        plantInfo: data.plant_info, // DB에서 찾은 식물 정보 (plant_id, watering_days 등)
      };
    } else {
      console.log('❌ 분석 실패:', data.error);
      throw new Error(data.error || '식물 분석에 실패했습니다.');
    }
  } catch (error) {
    console.error('❌ [analyzeSpecies] 에러:', error);
    console.error('❌ 에러 메시지:', error.message);
    console.error('❌ 에러 스택:', error.stack);
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
    // FormData 생성
    const formData = new FormData();

    // 이미지 파일 추가
    let filename = originalFileName || imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // 확장자가 없으면 추가 (blob URL의 경우)
    if (!match) {
      const ext = type === 'image/png' ? 'png' : 'jpg';
      filename = `${filename}.${ext}`;
    }

    // 라우팅을 위해 plant_ 프리픽스 추가
    if (!filename.startsWith('plant_') && !filename.startsWith('leaf_')) {
      filename = `plant_${filename}`;
    }

    // React Native Web의 경우 blob URL을 File 객체로 변환
    if (imageUri.startsWith('blob:')) {
      const blobResponse = await fetch(imageUri);
      const blob = await blobResponse.blob();
      const file = new File([blob], filename, { type: type });
      formData.append('file', file);
    } else {
      formData.append('file', {
        uri: imageUri,
        name: filename,
        type: type,
      });
    }

    // 파라미터 추가
    formData.append('user_id', userId.toString());
    if (nickname) {
      formData.append('nickname', nickname);
    }
    formData.append('image_path', imageUri);

    // API 요청
    const response = await fetch(`${API_URL}/ai/identify-species`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        userPlant: data.user_plant,
        aiResult: {
          species: data.ai_result.pred_label,
          speciesKo: data.ai_result.pred_label_ko,
          confidence: data.ai_result.confidence,
        },
      };
    } else {
      throw new Error(data.error || '식물 종류 판별에 실패했습니다.');
    }
  } catch (error) {
    console.error('identifySpecies error:', error);
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
    // FormData 생성
    const formData = new FormData();

    // 파일명이 제공되지 않은 경우 기본값 사용
    if (!filename) {
      filename = `leaf_${Date.now()}.jpg`;
    }

    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    console.log('[diagnoseDisease] 사용할 파일명:', filename);

    // React Native Web의 경우 blob URL을 File 객체로 변환
    if (imageUri.startsWith('blob:')) {
      const blobResponse = await fetch(imageUri);
      const blob = await blobResponse.blob();
      const file = new File([blob], filename, { type: type });
      formData.append('file', file);
    } else {
      formData.append('file', {
        uri: imageUri,
        name: filename,
        type: type,
      });
    }

    // 파라미터 추가
    formData.append('user_plant_id', userPlantId.toString());

    // API 요청
    const response = await fetch(`${API_URL}/ai/diagnose-disease`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        userPlantId: data.user_plant_id,
        disease: data.disease,
        aiResult: {
          disease: data.ai_result.pred_label_ko,
          confidence: data.ai_result.confidence,
        },
      };
    } else {
      throw new Error(data.error || '병충해 판별에 실패했습니다.');
    }
  } catch (error) {
    console.error('diagnoseDisease error:', error);
    throw error;
  }
};

export default {
  analyzeSpecies,
  identifySpecies,
  diagnoseDisease,
};
