/*
  파일명: HomeScreen.js
  목적:
    - 홈 화면 UI 및 기능 관리
      · 현재 시간/날씨 표시
      · 대표 화분 슬라이드
      · 오늘 물 줄 화분 리스트
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
import { COLORS, SPACING, SHADOWS, TYPOGRAPHY, RADIUS, OPACITY, TOUCH_TARGET } from "../constants/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH - (SPACING.xl * 2); // 좌우 패딩 24px씩 = 48px

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
      대표 화분 필터
  ---------------------------------------------------------- */
  const favoritePlants = plants.filter((p) => p.favorite === true);

  /* ----------------------------------------------------------
      오늘 물 줄 화분 필터 (한국 시간 기준)
  ---------------------------------------------------------- */
  const getTodayKST = () => {
    const now = new Date();
    const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    return kst.toISOString().split("T")[0];
  };
  const today = getTodayKST();
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

      <TouchableOpacity
        style={styles.waterBtn}
        onPress={() => giveWater(item)}
        activeOpacity={OPACITY.active}
      >
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
      blurRadius={2}
    >
      {/* 흰색 오버레이 */}
      <View style={styles.overlay} />

      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
        <ScrollView
          style={[styles.container, { backgroundColor: "transparent" }]} // ★ 배경 투명화
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ------------------ 날씨 ------------------ */}
          <View style={styles.weatherBox}>
            <Text style={styles.dateText}>{dateText}</Text>
            <Text style={styles.locText}>📍 {locationText}</Text>
            <Text style={styles.tempText}>🌡️ {weatherText}</Text>
            <Text style={styles.msgText}>💡 {generateWeatherMessage(tempValue)}</Text>
          </View>

          {/* ------------------ 대표 화분 ------------------ */}
          <Text style={styles.sectionTitle}>대표 화분</Text>

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
                snapToAlignment="start"
                disableIntervalMomentum={true}
              />

              {/* 오른쪽 화살표 (터치 비활성화 - 표시만) */}
              {currentSlideIndex < favoritePlants.length - 1 && (
                <View style={styles.rightArrow}>
                  <Text style={styles.arrowText}>▶</Text>
                </View>
              )}

              {/* 왼쪽 화살표 (터치 비활성화 - 표시만) */}
              {currentSlideIndex > 0 && (
                <View style={styles.leftArrow}>
                  <Text style={styles.arrowText}>◀</Text>
                </View>
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
              <Text style={styles.emptyFavoriteText}>대표화분을 선택해주세요</Text>
              <Text style={styles.emptyFavoriteSub}>내 화분 목록으로 이동하기</Text>
            </TouchableOpacity>
          )}

          {/* ------------------ 물주기 ------------------ */}
          <Text style={styles.sectionTitle}>오늘 물 줄 화분</Text>

          {mustWaterPlants.length === 0 ? (
            <Text style={styles.doneText}>오늘 물 줄 화분이 없어요!</Text>
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
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(200, 200, 200, 0.2)"
  },

  container: {
    flex: 1,
    paddingHorizontal: SPACING.xl
  },

  /* ------------------ 날씨 박스 ------------------ */
  weatherBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    ...SHADOWS.sm
  },
  dateText: {
    ...TYPOGRAPHY.body,
    fontWeight: "600",
    color: COLORS.text.primary
  },
  locText: {
    ...TYPOGRAPHY.small,
    marginTop: SPACING.xs,
    color: COLORS.text.secondary
  },
  tempText: {
    ...TYPOGRAPHY.body,
    fontWeight: "600",
    marginTop: SPACING.sm,
    color: COLORS.text.primary
  },
  msgText: {
    ...TYPOGRAPHY.small,
    marginTop: SPACING.sm,
    color: COLORS.text.secondary
  },

  /* ------------------ 대표 화분 ------------------ */
  sectionTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    marginBottom: SPACING.md
  },

  emptyFavoriteBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xxxl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm
  },
  emptyFavoriteText: {
    ...TYPOGRAPHY.body,
    fontWeight: "600",
    color: COLORS.text.secondary
  },
  emptyFavoriteSub: {
    ...TYPOGRAPHY.small,
    marginTop: SPACING.sm,
    color: COLORS.text.tertiary
  },

  carouselContainer: {
    position: "relative",
    marginBottom: SPACING.xxl
  },

  slideBox: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    overflow: "hidden",
    ...SHADOWS.md
  },

  slideImg: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: COLORS.border,
    resizeMode: "cover"
  },
  noImage: {
    justifyContent: "center",
    alignItems: "center"
  },
  noImageText: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.disabled
  },

  slideInfo: {
    padding: SPACING.lg
  },
  slideName: {
    ...TYPOGRAPHY.h2,
    fontWeight: "700",
    color: COLORS.text.primary,
    marginBottom: SPACING.sm
  },
  slideDetail: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs
  },

  /* 화살표 */
  rightArrow: {
    position: "absolute",
    right: SPACING.md,
    top: "30%",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: RADIUS.round,
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
    ...SHADOWS.sm
  },
  leftArrow: {
    position: "absolute",
    left: SPACING.md,
    top: "30%",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: RADIUS.round,
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
    ...SHADOWS.sm
  },
  arrowText: {
    fontSize: 18,
    color: COLORS.text.secondary,
    fontWeight: "700"
  },

  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.base
  },
  dot: {
    width: SPACING.sm,
    height: SPACING.sm,
    borderRadius: SPACING.xs,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.xs
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    width: 10,
    height: 10,
    borderRadius: 5
  },

  /* ------------------ 물주기 ------------------ */
  waterBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    ...SHADOWS.sm
  },
  waterName: {
    ...TYPOGRAPHY.body,
    fontWeight: "600",
    color: COLORS.text.primary
  },
  waterSub: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs
  },

  waterBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.sm,
    minHeight: TOUCH_TARGET.min
  },
  waterBtnText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text.inverse
  },

  doneText: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.md,
    textAlign: "center",
    color: COLORS.text.tertiary,
    fontWeight: "600"
  }
});
