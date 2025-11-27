/*
  파일명: services/weatherService.js
  기능: 날씨 관련 서비스 (기상청 API 직접 호출)
*/

// 기상청 단기예보 API
const WEATHER_API_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
const WEATHER_API_KEY = '5621048a47e5a1f37bdb05a7dd8c567dca6034fbde9af3a9cd320293cfff84dc';

/**
 * 위경도를 기상청 격자 좌표로 변환
 * Lambert Conformal Conic Projection 사용
 */
const convertToGrid = (lat, lon) => {
  const RE = 6371.00877; // 지구 반경(km)
  const GRID = 5.0; // 격자 간격(km)
  const SLAT1 = 30.0; // 표준위도1
  const SLAT2 = 60.0; // 표준위도2
  const OLON = 126.0; // 기준점 경도
  const OLAT = 38.0; // 기준점 위도
  const XO = 43; // 기준점 X좌표
  const YO = 136; // 기준점 Y좌표

  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);

  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;

  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = re * sf / Math.pow(ra, sn);

  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

  return { nx, ny };
};

/**
 * API 호출용 기준 시간 계산
 */
const getBaseTime = () => {
  const now = new Date();
  const baseTimes = ['0200', '0500', '0800', '1100', '1400', '1700', '2000', '2300'];
  const currentTime = now.getHours() * 100 + now.getMinutes();

  // 현재 시간보다 10분 이전 발표시간 찾기
  for (let i = baseTimes.length - 1; i >= 0; i--) {
    if (currentTime >= parseInt(baseTimes[i]) + 10) {
      const baseDate = now.toISOString().split('T')[0].replace(/-/g, '');
      return { baseDate, baseTime: baseTimes[i] };
    }
  }

  // 오늘 첫 발표시간 이전이면 어제 마지막 시간
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const baseDate = yesterday.toISOString().split('T')[0].replace(/-/g, '');
  return { baseDate, baseTime: '2300' };
};

/**
 * 날씨 데이터 파싱
 */
const parseWeatherData = (data, lat, lon, nx, ny) => {
  try {
    const items = data.response.body.items.item;

    // 현재 시간 + 1시간 (예보 데이터 조회용)
    const now = new Date();
    const targetHour = now.getHours() + 1;
    const targetTime = targetHour.toString().padStart(2, '0') + '00';
    const targetDate = now.getFullYear().toString() +
                      (now.getMonth() + 1).toString().padStart(2, '0') +
                      now.getDate().toString().padStart(2, '0');

    const weatherData = {};

    items.forEach(item => {
      if (item.fcstDate === targetDate && item.fcstTime === targetTime) {
        const category = item.category;
        const value = item.fcstValue;

        if (category === 'TMP') {
          weatherData.temp = parseFloat(value);
        } else if (category === 'REH') {
          weatherData.humidity = parseInt(value);
        } else if (category === 'SKY') {
          const skyCodes = { '1': '맑음', '3': '구름많음', '4': '흐림' };
          weatherData.sky = skyCodes[value] || '알수없음';
        } else if (category === 'PTY') {
          const ptyCodes = { '0': '없음', '1': '비', '2': '비/눈', '3': '눈', '4': '소나기' };
          weatherData.precipitation = ptyCodes[value] || '없음';
        } else if (category === 'POP') {
          weatherData.rainProb = parseInt(value);
        }
      }
    });

    return {
      latitude: lat,
      longitude: lon,
      grid_x: nx,
      grid_y: ny,
      temperature: weatherData.temp || 0,
      temp: weatherData.temp || 0,
      humidity: weatherData.humidity || 0,
      sky: weatherData.sky || '알수없음',
      precipitation: weatherData.precipitation || '없음',
      rainProbability: weatherData.rainProb || 0,
      description: `${weatherData.sky || ''} (${weatherData.precipitation || ''})`,
    };
  } catch (error) {
    console.error('[weatherService] 파싱 오류:', error);
    throw new Error('날씨 데이터 파싱 실패');
  }
};

export const weatherService = {
  /**
   * 날씨 정보 조회
   * @param {number} latitude - 위도
   * @param {number} longitude - 경도
   * @returns {Promise<Object>} 날씨 정보
   */
  getWeather: async (latitude = 37.5665, longitude = 126.9780) => {
    try {
      console.log('[weatherService] 날씨 조회 시작:', { latitude, longitude });

      // 좌표 변환
      const { nx, ny } = convertToGrid(latitude, longitude);
      console.log('[weatherService] 격자 좌표:', { nx, ny });

      // 기준 시간 계산
      const { baseDate, baseTime } = getBaseTime();
      console.log('[weatherService] 기준 시간:', { baseDate, baseTime });

      // API 요청 (serviceKey는 이미 인코딩되어 있으므로 직접 포함)
      const url = `${WEATHER_API_URL}?serviceKey=${WEATHER_API_KEY}&pageNo=1&numOfRows=100&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;
      console.log('[weatherService] API 요청:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[weatherService] API 응답 오류:', errorText);
        throw new Error(`기상청 API 오류 (${response.status})`);
      }

      const data = await response.json();
      console.log('[weatherService] API 응답:', data);

      // 응답 코드 확인
      if (data.response.header.resultCode !== '00') {
        throw new Error(`기상청 API 에러: ${data.response.header.resultMsg}`);
      }

      // 데이터 파싱
      const weatherData = parseWeatherData(data, latitude, longitude, nx, ny);
      console.log('[weatherService] 파싱된 날씨 데이터:', weatherData);

      return weatherData;
    } catch (error) {
      console.error('[weatherService] 날씨 조회 실패:', error);
      throw error;
    }
  },
};

export default weatherService;
