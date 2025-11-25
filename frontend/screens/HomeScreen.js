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

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform
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

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH - 40; // 좌우 패딩 20씩

export default function HomeScreen({ navigation }) {
  /* ----------------------------------------------------------
      상태값
  ----------------------------------------------------------- */
  const [plants, setPlants] = useState([]);
  const [weatherText, setWeatherText] = useState("날씨 정보를 불러오는 중...");
  const [locationText, setLocationText] = useState("위치 확인 중...");
  const [dateText, setDateText] = useState("");

  const [tempValue, setTempValue] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const flatListRef = useRef(null);

  /* ----------------------------------------------------------
      [UI] 날짜/시간 갱신
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
      - fetchPlants(): favorite, WateringPeriod 반영 완료된 모델
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
  ----------------------------------------------------------- */
  const loadWeather = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationText("위치 권한 없음");
        setWeatherText("날씨 정보를 가져올 수 없습니다");
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;

      /* 좌표 → 주소 변환 */
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

      /* 날씨 가져오기 */
      const weather = await weatherService.getWeather(latitude, longitude);

      if (weather?.temperature != null) {
        const t = Math.round(weather.temperature);
        setTempValue(t);
        setWeatherText(`현재온도: ${t}°C`);
      } else if (weather?.temp != null) {
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
  ----------------------------------------------------------- */
  const giveWater = async (plant) => {
    await updateWaterDate(plant.id);
    loadPlantData();
  };

  /* ----------------------------------------------------------
      초기 로드
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
      [중요] 대표식물(favorite=true)만 필터링
  ----------------------------------------------------------- */
  const favoritePlants = plants.filter((p) => p.favorite === true);

  /* ----------------- 물주기 리스트 필터 (모든 식물 대상) ------------------ */
  const today = new Date().toISOString().split("T")[0];
  const mustWaterPlants = plants.filter((p) => {
    if (!p.nextWater) return true;
    return p.nextWater <= today;
  });

  /* ----------------------------------------------------------
      [UI] 슬라이드 렌더링 (대표식물만 표시 - 큰 카드)
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
      <View style={styles.slideInfo}>
        <Text style={styles.slideName}>{item.name}</Text>
        <Text style={styles.slideDetail}>
          {item.waterDate ? `마지막 물 준 날: ${item.waterDate}` : "물 준 기록 없음"}
        </Text>
        {item.nextWater && (
          <Text style={styles.slideDetail}>
            다음 물 줄 날: {item.nextWater}
          </Text>
        )}
      </View>
    </View>
  );

  /* ----------------------------------------------------------
      슬라이드 스크롤 이벤트 핸들러
  ----------------------------------------------------------- */
  const onScroll = (event) => {
    const slideSize = CARD_WIDTH;
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / slideSize);
    setCurrentSlideIndex(index);
  };

  /* ----------------------------------------------------------
      화살표 버튼 클릭 핸들러 (웹 호환)
  ----------------------------------------------------------- */
  const goToNextSlide = () => {
    if (currentSlideIndex < favoritePlants.length - 1) {
      const nextIndex = currentSlideIndex + 1;
      const offset = nextIndex * CARD_WIDTH;
      flatListRef.current?.scrollToOffset({ offset, animated: true });
      setCurrentSlideIndex(nextIndex);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlideIndex > 0) {
      const prevIndex = currentSlideIndex - 1;
      const offset = prevIndex * CARD_WIDTH;
      flatListRef.current?.scrollToOffset({ offset, animated: true });
      setCurrentSlideIndex(prevIndex);
    }
  };

  /* ----------------------------------------------------------
      [UI] 물주기 렌더링
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

        {/* ----------------- 대표식물 슬라이드 ----------------- */}
        <Text style={styles.sectionTitle}>대표 식물</Text>

        {favoritePlants.length > 0 ? (
          <View style={styles.carouselContainer}>
            <FlatList
              ref={flatListRef}
              data={favoritePlants}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(i) => i.id.toString()}
              renderItem={renderSlide}
              snapToInterval={CARD_WIDTH}
              decelerationRate="fast"
              onScroll={onScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingRight: 20 }}
            />

            {/* 화살표 버튼 */}
            {currentSlideIndex < favoritePlants.length - 1 && (
              <TouchableOpacity
                style={styles.rightArrow}
                onPress={goToNextSlide}
                activeOpacity={0.7}
              >
                <Text style={styles.arrowText}>▶</Text>
              </TouchableOpacity>
            )}

            {currentSlideIndex > 0 && (
              <TouchableOpacity
                style={styles.leftArrow}
                onPress={goToPrevSlide}
                activeOpacity={0.7}
              >
                <Text style={styles.arrowText}>◀</Text>
              </TouchableOpacity>
            )}

            {/* 페이지 인디케이터 */}
            {favoritePlants.length > 1 && (
              <View style={styles.pagination}>
                {favoritePlants.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      currentSlideIndex === index && styles.activeDot
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          /* --------------- B 타입 박스 --------------- */
          <TouchableOpacity
            style={styles.emptyFavoriteBox}
            onPress={() => navigation.navigate("Plants")}
          >
            <Text style={styles.emptyFavoriteText}>대표식물을 선택해주세요</Text>
            <Text style={styles.emptyFavoriteSub}>내 화분 목록으로 이동하기</Text>
          </TouchableOpacity>
        )}

        {/* ----------------- 물주기 ----------------- */}
        <Text style={styles.sectionTitle}>오늘 물 줄 식물</Text>

        {mustWaterPlants.length === 0 ? (
          <Text style={styles.doneText}>오늘 물 줄 식물이 없어요!</Text>
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

  /* ------------------ 대표식물 없음 B타입 박스 ------------------ */
  emptyFavoriteBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0"
  },

  emptyFavoriteText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444"
  },

  emptyFavoriteSub: {
    fontSize: 13,
    marginTop: 6,
    color: "#777"
  },

  /* ------------------ 슬라이드 캐러셀 ------------------ */
  carouselContainer: {
    position: "relative",
    marginBottom: 30
  },

  slideBox: {
    width: CARD_WIDTH,
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },

  slideImg: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#E8E8E8",
    resizeMode: "cover"
  },

  noImage: {
    justifyContent: "center",
    alignItems: "center"
  },

  noImageText: {
    color: "#999",
    fontSize: 14
  },

  slideInfo: {
    padding: 20
  },

  slideName: {
    fontWeight: "700",
    fontSize: 22,
    marginBottom: 8
  },

  slideDetail: {
    fontSize: 14,
    color: "#777",
    marginTop: 4
  },

  /* 화살표 */
  rightArrow: {
    position: "absolute",
    right: 20,
    top: "35%",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === "web" ? {
      cursor: "pointer",
      backdropFilter: "blur(4px)"
    } : {
      elevation: 3
    }),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },

  leftArrow: {
    position: "absolute",
    left: 0,
    top: "35%",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === "web" ? {
      cursor: "pointer",
      backdropFilter: "blur(4px)"
    } : {
      elevation: 3
    }),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },

  arrowText: {
    fontSize: 20,
    color: "#555"
  },

  /* 페이지 인디케이터 */
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CCC",
    marginHorizontal: 4
  },

  activeDot: {
    backgroundColor: "#8CCB7F",
    width: 10,
    height: 10,
    borderRadius: 5
  },

  /* ------------------ 물주기 ------------------ */
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
  }
});
