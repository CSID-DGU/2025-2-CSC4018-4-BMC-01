/*
  파일명: HomeScreen.js
  목적: 홈 화면 UI 및 기능 관리
        - 현재 날씨 표시
        - 사용자가 등록한 화분(슬라이드) 표시
        - 오늘 물을 줘야 하는 화분 리스트 표시
        - 물주기 작업 처리(updateWaterDate)
  
  주요 의존성:
    - Storage.js (식물 데이터 조회 / 물준 날짜 갱신)
    - weatherService (백엔드 경유 날씨 API)
    - expo-location (사용자 위치 좌표)
*/

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";

/*  
  Storage.js:
    - fetchPlants: 식물 목록 조회 (API + 로컬 메타데이터 통합)
    - updateWaterDate: 물 준 날짜 갱신 + nextWater 재계산
*/
import {
  fetchPlants,
  updateWaterDate,
} from "../utils/Storage";

/*
  weatherService:
    - getWeather(lat, lon): 백엔드에서 기상청 API 요청한 결과 전달
*/
import { weatherService } from "../src/services";

export default function HomeScreen({ navigation }) {
  /* ----------------------------------------------------------
      상태값
      plants: 식물 목록
      weatherText: 온도 관련 문구
      locationText: 위치 표시 (시/도 + 시/군/구)
      dateText: 화면 최상단 날짜/시간
      tempValue: 온도 값 (문구 생성용)
  ----------------------------------------------------------- */
  const [plants, setPlants] = useState([]);
  const [weatherText, setWeatherText] = useState("날씨 정보를 불러오는 중...");
  const [locationText, setLocationText] = useState("위치 확인 중...");
  const [dateText, setDateText] = useState("");

  const [tempValue, setTempValue] = useState(null);

  /* ----------------------------------------------------------
      [UI] 날짜/시간 갱신
      - 앱 실행 시 / 홈 탭 재진입 시 업데이트
  ----------------------------------------------------------- */
  const updateDateTime = () => {
    const now = new Date();
    const weekKor = ["일", "월", "화", "수", "목", "금", "토"];

    const y = now.getFullYear();
    const m = ("0" + (now.getMonth() + 1)).slice(-2);
    const d = ("0" + now.getDate()).slice(-2);
    const hh = ("0" + now.getHours()).slice(-2);
    const mm = ("0" + now.getMinutes()).slice(-2);

    setDateText(`${y}.${m}.${d} ${hh}:${mm} (${weekKor[now.getDay()]})`);
  };

  /* ----------------------------------------------------------
      [데이터] 식물 목록 불러오기
      - fetchPlants()는 Storage.js에서
        API + 로컬 meta(favorite, WateringPeriod) + 날짜계산(nextWater)까지 포함
  ----------------------------------------------------------- */
  const loadPlantData = async () => {
    const list = await fetchPlants();
    setPlants(list);
  };

  /* ----------------------------------------------------------
      [UI] 온도 기반 안내 문구
  ----------------------------------------------------------- */
  const generateWeatherMessage = (t) => {
    if (t == null) return "";
    if (t >= 27) return "더운 날씨! 물 자주 확인 추천!";
    if (t >= 20) return "따뜻한 날씨! 관리하기 좋은 환경입니다.";
    if (t >= 10) return "선선한 날씨! 햇빛은 적당히~";
    return "많이 추워요! 실내 보온 필요!";
  };

  /* ----------------------------------------------------------
      [날씨] 현재 위치 기반 정보 로드
      - expo-location: 좌표 획득
      - Nominatim: 좌표 → 주소 변환
      - weatherService: 백엔드 경유 기상청 API 호출
  ----------------------------------------------------------- */
  const loadWeather = async () => {
    try {
      // 위치 권한 요청
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationText("위치 권한 없음");
        setWeatherText("날씨 정보를 가져올 수 없습니다");
        return;
      }

      // 현재 좌표
      let loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;

      /* -----------------------------------------
         좌표 → 주소 변환 (Nominatim)
         - 한국 주소 형식: 시/도 + 시/군/구
      ------------------------------------------ */
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ko`,
          {
            headers: { "User-Agent": "PlantCareApp/1.0" }
          }
        );

        const data = await response.json();

        if (data && data.address) {
          const addr = data.address;

          const locationStr = `${addr.city || addr.province || addr.state || ''} ${addr.borough || addr.suburb || addr.town || ''}`.trim();

          setLocationText(locationStr || data.display_name?.split(',')[0] || "위치 확인됨");
        } else {
          setLocationText(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        }
      } catch (geoError) {
        console.error("[HomeScreen] Nominatim 오류:", geoError);
        setLocationText(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
      }

      /* -----------------------------------------
         기상청 API 응답 (백엔드 weatherService 경유)
         weather.temperature 또는 weather.temp 사용
      ------------------------------------------ */
      const weather = await weatherService.getWeather(latitude, longitude);

      if (weather?.temperature != null) {
        const t = Math.round(weather.temperature);
        setTempValue(t);
        setWeatherText(`현재온도: ${t}°C`);
      } else if (weather?.temp != null) {
        // 일부 기상청 API 응답 형식 temp 사용
        const t = Math.round(weather.temp);
        setTempValue(t);
        setWeatherText(`현재온도: ${t}°C`);
      } else {
        setWeatherText("날씨 정보 없음");
      }
    } catch (err) {
      console.error("Weather Error:", err);
      setWeatherText("날씨 정보 오류");
    }
  };

  /* ----------------------------------------------------------
      [동작] 물 주기 처리
      - updateWaterDate(): API + 프론트 날짜 계산(nextWater) 처리
      - 처리 후 plant 리스트 재로딩
  ----------------------------------------------------------- */
  const giveWater = async (plant) => {
    await updateWaterDate(plant.id);
    loadPlantData();
  };

  /* ----------------------------------------------------------
      초기 로드: 날짜/날씨/식물
  ----------------------------------------------------------- */
  useEffect(() => {
    updateDateTime();
    loadWeather();
    loadPlantData();
  }, []);

  /* ----------------------------------------------------------
      홈 탭 재진입 시 자동 새로고침
  ----------------------------------------------------------- */
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      updateDateTime();
      loadPlantData();
    });
    return unsub;
  }, [navigation]);

  /* ----------------------------------------------------------
      오늘 물 줘야 하는 화분 필터링
      - nextWater 값이 오늘보다 이전 or null → 물주기 필요
  ----------------------------------------------------------- */
  const today = new Date().toISOString().split("T")[0];
  const mustWaterPlants = plants.filter((p) => {
    if (!p.nextWater) return true;
    return p.nextWater <= today;
  });

  /* ----------------------------------------------------------
      [UI] 슬라이드 렌더링
  ----------------------------------------------------------- */
  const renderSlide = ({ item }) => (
    <View style={styles.slideBox}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.slideImg} />
      ) : (
        <View style={[styles.slideImg, styles.noImage]}>
          <Text style={styles.noImageText}>No Image</Text>
        </View>
      )}
      <Text style={styles.slideName}>{item.name}</Text>
    </View>
  );

  /* ----------------------------------------------------------
      [UI] 물주기 리스트 렌더링
  ----------------------------------------------------------- */
  const renderWaterItem = ({ item }) => (
    <View style={styles.waterBox}>
      <View>
        <Text style={styles.waterName}>{item.name}</Text>
        <Text style={styles.waterSub}>
          {item.waterDate ? `마지막 물 준 날: ${item.waterDate}` : "기록 없음"}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.waterBtn}
        onPress={() => giveWater(item)}
      >
        <Text style={styles.waterBtnText}>물 줬어요</Text>
      </TouchableOpacity>
    </View>
  );

  /* ----------------------------------------------------------
      화면 구조
  ----------------------------------------------------------- */
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
      edges={["top", "bottom", "left", "right"]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ----------------- 날씨 ----------------- */}
        <View style={styles.weatherBox}>
          <Text style={styles.dateText}>{dateText}</Text>
          <Text style={styles.locText}>{locationText}</Text>
          <Text style={styles.tempText}>{weatherText}</Text>
          <Text style={styles.msgText}>{generateWeatherMessage(tempValue)}</Text>
        </View>

        {/* ----------------- 슬라이드 ----------------- */}
        <Text style={styles.sectionTitle}>내 화분</Text>
        {plants.length > 0 ? (
          <FlatList
            data={plants}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(i) => i.id.toString()}
            renderItem={renderSlide}
            style={{ marginBottom: 20 }}
          />
        ) : (
          <Text style={styles.emptyText}>등록된 화분이 없습니다.</Text>
        )}

        {/* ----------------- 물주기 ----------------- */}
        <Text style={styles.sectionTitle}>물주기</Text>
        {mustWaterPlants.length === 0 ? (
          <Text style={styles.doneText}>모든 화분에 물을 다 줬어요!</Text>
        ) : (
          <FlatList
            data={mustWaterPlants}
            keyExtractor={(i) => i.id.toString()}
            renderItem={renderWaterItem}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------------------- 스타일 ---------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 20
  },

  weatherBox: {
    backgroundColor: "#FFF",
    padding: 18,
    borderRadius: 15,
    marginBottom: 25
  },

  dateText: { fontSize: 16, fontWeight: "600" },
  locText: { fontSize: 15, marginTop: 2 },
  tempText: { fontSize: 16, fontWeight: "600", marginTop: 5 },
  msgText: { marginTop: 5, color: "#444" },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12
  },

  slideBox: {
    width: 160,
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 15,
    marginRight: 15
  },

  slideImg: {
    width: "100%",
    height: 100,
    borderRadius: 10
  },

  noImage: {
    backgroundColor: "#E8E8E8",
    justifyContent: "center",
    alignItems: "center"
  },

  noImageText: {
    color: "#999",
    fontSize: 12
  },

  slideName: {
    marginTop: 10,
    fontWeight: "600",
    fontSize: 16
  },

  waterBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12
  },

  waterName: { fontSize: 16, fontWeight: "600" },
  waterSub: { fontSize: 13, color: "#777", marginTop: 4 },

  waterBtn: {
    backgroundColor: "#8CCB7F",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8
  },

  waterBtnText: {
    color: "#FFF",
    fontWeight: "600"
  },

  doneText: {
    marginTop: 10,
    textAlign: "center",
    color: "#777",
    fontWeight: "600"
  },

  emptyText: {
    textAlign: "center",
    color: "#999",
    marginBottom: 20
  }
});
