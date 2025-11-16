/*
  파일명: HomeScreen.js
  기능: 홈 화면 (날씨 + 슬라이드 + 물주기 버튼형 목록)
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

/* [ Storage ] */
import {
  fetchPlants,
  updateWaterDate,
} from "../utils/Storage";

export default function HomeScreen({ navigation }) {
  const [plants, setPlants] = useState([]);
  const [weatherText, setWeatherText] = useState("날씨 정보를 불러오는 중...");
  const [locationText, setLocationText] = useState("위치 확인 중...");
  const [dateText, setDateText] = useState("");

  const [tempValue, setTempValue] = useState(null);

  /* ---------------- 날짜 업데이트 ---------------- */
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

  /* ---------------- 식물 목록 불러오기 ---------------- */
  const loadPlantData = async () => {
    const list = await fetchPlants();
    setPlants(list);
  };

  /* ---------------- 날씨 안내 문구 ---------------- */
  const generateWeatherMessage = (t) => {
    if (t == null) return "";
    if (t >= 27) return "🔥 더운 날씨! 물 자주 확인 추천!";
    if (t >= 20) return "🌿 따뜻한 날씨! 관리하기 좋은 환경입니다.";
    if (t >= 10) return "🍃 선선한 날씨! 햇빛은 적당히~";
    return "❄ 많이 추워요! 실내 보온 필요!";
  };

  /* ---------------- 날씨 API ---------------- */
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

      let geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo.length > 0) {
        const g = geo[0];
        setLocationText(`${g.region} ${g.city}`);
      }

      const apiKey = "bb181b8c9659e3cdc779155d99dd236a";
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=kr`;

      const res = await fetch(url);
      const data = await res.json();

      if (data?.main?.temp != null) {
        const t = Math.round(data.main.temp);
        setTempValue(t);
        setWeatherText(`현재온도: ${t}°C`);
      }
    } catch (err) {
      setWeatherText("날씨 정보 오류");
    }
  };

  /* ---------------- 물 주기 처리 ---------------- */
  const giveWater = async (plant) => {
    await updateWaterDate(plant.id);
    loadPlantData();
  };

  /* ---------------- 초기 로드 ---------------- */
  useEffect(() => {
    updateDateTime();
    loadWeather();
    loadPlantData();
  }, []);

  /* ---------------- 홈 탭 포커스 시 갱신 ---------------- */
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      updateDateTime();
      loadPlantData();
    });
    return unsub;
  }, [navigation]);

  /* ---------------- 물 줘야 하는 식물 ---------------- */
  const today = new Date().toISOString().split("T")[0];
  const mustWaterPlants = plants.filter((p) => {
    if (!p.nextWater) return true;
    return p.nextWater <= today;
  });

  /* ---------------- 슬라이드 ---------------- */
  const renderSlide = ({ item }) => (
    <View style={styles.slideBox}>
      <Image source={{ uri: item.image }} style={styles.slideImg} />
      <Text style={styles.slideName}>{item.name}</Text>
    </View>
  );

  /* ---------------- 물주기 버튼 ---------------- */
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

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
      edges={["top", "bottom", "left", "right"]}   // ★ A안
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}   // 하단 여백 강화
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
        <FlatList
          data={plants}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(i) => i.id.toString()}
          renderItem={renderSlide}
          style={{ marginBottom: 20 }}
        />

        {/* ----------------- 물주기 ----------------- */}
        <Text style={styles.sectionTitle}>물주기</Text>
        {mustWaterPlants.length === 0 ? (
          <Text style={styles.doneText}>🌿 모든 화분에 물을 다 줬어요!</Text>
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
    paddingHorizontal: 20   // 좌우 여백 강화
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
  }
});
