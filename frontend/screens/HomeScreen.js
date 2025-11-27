/*
  파일명: HomeScreen.js
  목적:
    - 홈 화면 UI 및 기능 관리
      · 현재 시간/날씨 표시
      · 대표 식물 슬라이드
      · 오늘 물 줄 식물 리스트
    - (신규) 고정 배경 이미지 적용
      → ImageBackground로 전체 화면만 감싸고
        ScrollView는 투명 처리하여 배경이 스크롤되지 않도록 유지
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
  Platform,
  ImageBackground // ★ 추가: 배경 이미지 적용
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";

import { fetchPlants, updateWaterDate } from "../utils/Storage";
import { weatherService } from "../src/services";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH - 40;

/* ----------------------------------------------------------
    메인 함수
---------------------------------------------------------- */
export default function HomeScreen({ navigation }) {
  const [plants, setPlants] = useState([]);
  const [weatherText, setWeatherText] = useState("날씨 정보를 불러오는 중...");
  const [locationText, setLocationText] = useState("위치 확인 중...");
  const [dateText, setDateText] = useState("");
  const [tempValue, setTempValue] = useState(null);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const flatListRef = useRef(null);

  /* ----------------------------------------------------------
      [UI] 날짜 변경
  ---------------------------------------------------------- */
  const updateDateTime = () => {
    const now = new Date();
    const week = ["일", "월", "화", "수", "목", "금", "토"];

    const Y = now.getFullYear();
    const M = ("0" + (now.getMonth() + 1)).slice(-2);
    const D = ("0" + now.getDate()).slice(-2);
    const HH = ("0" + now.getHours()).slice(-2);
    const MM = ("0" + now.getMinutes()).slice(-2);

    setDateText(`${Y}.${M}.${D} ${HH}:${MM} (${week[now.getDay()]})`);
  };

  /* ----------------------------------------------------------
      [데이터] 식물 로드
  ---------------------------------------------------------- */
  const loadPlantData = async () => {
    const list = await fetchPlants();
    setPlants(list);
  };

  /* ----------------------------------------------------------
      [UI] 온도에 따른 안내 문구
  ---------------------------------------------------------- */
  const generateWeatherMessage = (t) => {
    if (t == null) return "";
    if (t >= 27) return "더운 날씨! 물 자주 확인 추천!";
    if (t >= 20) return "따뜻한 날씨! 관리하기 좋은 환경입니다.";
    if (t >= 10) return "선선한 날씨! 햇빛은 적당히~";
    return "많이 추워요! 실내 보온 필요!";
  };

  /* ----------------------------------------------------------
      [날씨] 위치 기반 날씨 불러오기
  ---------------------------------------------------------- */
  const loadWeather = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationText("위치 권한 없음");
        setWeatherText("날씨 데이터를 불러올 수 없습니다.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;

      /* ----- 위치명 ----- */
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ko`,
          { headers: { "User-Agent": "PlantApp/1.0" } }
        );
        const data = await res.json();

        if (data?.address) {
          const a = data.address;
          const locName =
            `${a.city || a.county || a.state || ""} ${a.suburb || a.town || a.village || ""}`.trim();

          setLocationText(locName || "위치 확인됨");
        } else {
          setLocationText(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        }
      } catch (geoErr) {
        console.log("역지오코딩 실패:", geoErr);
        setLocationText(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
      }

      /* ----- 날씨 ----- */
      const weather = await weatherService.getWeather(latitude, longitude);
      let t = weather?.temperature ?? weather?.temp ?? null;

      if (t != null) {
        t = Math.round(t);
        setTempValue(t);
        setWeatherText(`현재온도: ${t}°C`);
      } else {
        setWeatherText("날씨 정보 없음");
      }
    } catch (err) {
      console.log("날씨 오류:", err);
      setWeatherText("날씨 정보를 가져올 수 없습니다.");
    }
  };

  /* ----------------------------------------------------------
      물주기 실행
  ---------------------------------------------------------- */
  const giveWater = async (plant) => {
    await updateWaterDate(plant.id);
    loadPlantData();
  };

  /* ----------------------------------------------------------
      초기 로드
  ---------------------------------------------------------- */
  useEffect(() => {
    updateDateTime();
    loadWeather();
    loadPlantData();
  }, []);

  /* ----------------------------------------------------------
      홈 탭 재진입 시 자동 새로고침
  ---------------------------------------------------------- */
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      updateDateTime();
      loadPlantData();
    });
    return unsub;
  }, [navigation]);

  /* ----------------------------------------------------------
      대표 식물 필터
  ---------------------------------------------------------- */
  const favoritePlants = plants.filter((p) => p.favorite === true);

  /* ----------------------------------------------------------
      오늘 물 줄 식물 필터
  ---------------------------------------------------------- */
  const today = new Date().toISOString().split("T")[0];
  const mustWaterPlants = plants.filter((p) => !p.nextWater || p.nextWater <= today);

  /* ----------------------------------------------------------
      슬라이드 렌더링
  ---------------------------------------------------------- */
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
          <Text style={styles.slideDetail}>다음 물 줄 날: {item.nextWater}</Text>
        )}
      </View>
    </View>
  );

  /* ----------------------------------------------------------
      슬라이드 스크롤 이벤트
  ---------------------------------------------------------- */
  const onScroll = (event) => {
    const slideSize = CARD_WIDTH;
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / slideSize);
    setCurrentSlideIndex(index);
  };

  /* ----------------------------------------------------------
      슬라이드 화살표 컨트롤 (웹 호환)
  ---------------------------------------------------------- */
  const goToNextSlide = () => {
    if (currentSlideIndex < favoritePlants.length - 1) {
      const nextId = currentSlideIndex + 1;
      const offset = nextId * CARD_WIDTH;
      flatListRef.current?.scrollToOffset({ offset, animated: true });
      setCurrentSlideIndex(nextId);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlideIndex > 0) {
      const prev = currentSlideIndex - 1;
      const offset = prev * CARD_WIDTH;
      flatListRef.current?.scrollToOffset({ offset, animated: true });
      setCurrentSlideIndex(prev);
    }
  };

  /* ----------------------------------------------------------
      물주기 리스트 아이템
  ---------------------------------------------------------- */
  const renderWaterItem = ({ item }) => (
    <View style={styles.waterBox}>
      <View>
        <Text style={styles.waterName}>{item.name}</Text>
        <Text style={styles.waterSub}>
          {item.waterDate ? `마지막 물 준 날: ${item.waterDate}` : "기록 없음"}
        </Text>
      </View>

      <TouchableOpacity style={styles.waterBtn} onPress={() => giveWater(item)}>
        <Text style={styles.waterBtnText}>물 줬어요</Text>
      </TouchableOpacity>
    </View>
  );

  /* ----------------------------------------------------------
      화면 구조 — A안 완성본
      · ImageBackground = 고정 배경 (스크롤되지 않음)
      · ScrollView = 배경색 제거하여 투명 처리
  ---------------------------------------------------------- */
  return (
    <ImageBackground
      source={require("../assets/bg_full_home.png")} // ★ 홈 배경 이미지
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
        <ScrollView
          style={[styles.container, { backgroundColor: "transparent" }]} // ★ 배경 투명화
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ------------------ 날씨 ------------------ */}
          <View style={styles.weatherBox}>
            <Text style={styles.dateText}>{dateText}</Text>
            <Text style={styles.locText}>{locationText}</Text>
            <Text style={styles.tempText}>{weatherText}</Text>
            <Text style={styles.msgText}>{generateWeatherMessage(tempValue)}</Text>
          </View>

          {/* ------------------ 대표 식물 ------------------ */}
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

              {/* 오른쪽 화살표 */}
              {currentSlideIndex < favoritePlants.length - 1 && (
                <TouchableOpacity
                  style={styles.rightArrow}
                  onPress={goToNextSlide}
                  activeOpacity={0.7}
                >
                  <Text style={styles.arrowText}>▶</Text>
                </TouchableOpacity>
              )}

              {/* 왼쪽 화살표 */}
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
                  {favoritePlants.map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.dot,
                        idx === currentSlideIndex && styles.activeDot
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptyFavoriteBox}
              onPress={() => navigation.navigate("Plants")}
            >
              <Text style={styles.emptyFavoriteText}>대표식물을 선택해주세요</Text>
              <Text style={styles.emptyFavoriteSub}>내 화분 목록으로 이동하기</Text>
            </TouchableOpacity>
          )}

          {/* ------------------ 물주기 ------------------ */}
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
    </ImageBackground>
  );
}

/* ----------------------------------------------------------
    스타일
---------------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20
    // backgroundColor 제거됨 → ScrollView 투명 처리
  },

  /* ------------------ 날씨 박스 ------------------ */
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

  /* ------------------ 대표 식물 ------------------ */
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12
  },

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
    ...(Platform.OS === "web"
      ? { cursor: "pointer", backdropFilter: "blur(4px)" }
      : { elevation: 3 }),
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
    ...(Platform.OS === "web"
      ? { cursor: "pointer", backdropFilter: "blur(4px)" }
      : { elevation: 3 }),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },
  arrowText: {
    fontSize: 20,
    color: "#555"
  },

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
  waterName: {
    fontSize: 16,
    fontWeight: "600"
  },
  waterSub: {
    fontSize: 13,
    color: "#777",
    marginTop: 4
  },

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
