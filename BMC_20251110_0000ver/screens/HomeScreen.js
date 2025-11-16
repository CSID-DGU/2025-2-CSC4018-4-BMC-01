/*
  파일명: HomeScreen.js
  기능: 메인 홈 화면 (날씨, 식물 자동슬라이드, 사진 편집 등)
  수정내용:
    - (2025.11.15) 식물 프로필 중앙정렬 및 슬라이드 정렬 안정화
    - (2025.11.15) FlatList 걸림 현상 수정
    - 기존 주석 유지
*/

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import { useIsFocused } from "@react-navigation/native";
import { loadPlants, updateWaterDate } from "../utils/storage";
import EditImageModal from "../utils/EditImageModal";

const { width } = Dimensions.get("window");
const API_KEY = "bb181b8c9659e3cdc779155d99dd236a";

const getNow = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  const day = ["일", "월", "화", "수", "목", "금", "토"][local.getDay()];
  const hh = local.getHours().toString().padStart(2, "0");
  const mm = local.getMinutes().toString().padStart(2, "0");
  return `${local.getMonth() + 1}.${local.getDate()} (${day}) ${hh}:${mm}`;
};

const getWeatherEmoji = (main, isNight = false) => {
  const icons = {
    Clear: isNight ? "🌙" : "☀️",
    Clouds: isNight ? "☁️" : "🌤",
    Rain: "🌧",
    Drizzle: "🌦",
    Thunderstorm: "🌩",
    Snow: "❄️",
    Mist: "🌫",
    Fog: "🌫️",
    Haze: "🌁",
  };
  return icons[main] || "☀️";
};

export default function HomeScreen({ navigation }) {
  const [plants, setPlants] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [now, setNow] = useState(getNow());
  const flatListRef = useRef(null);
  const isFocused = useIsFocused();
  const scrollLock = useRef(false); // ✅ 슬라이드 중복 방지용

  useEffect(() => {
    const t = setInterval(() => setNow(getNow()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (isFocused) {
      fetchPlants();
      fetchWeather();
      setNow(getNow());
    }
  }, [isFocused]);

  const fetchWeather = async () => {
    try {
      setLoadingWeather(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setWeather(null);
        setLoadingWeather(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      const resp = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=kr`
      );
      const data = await resp.json();

      if (data?.weather?.[0] && data?.main) {
        const main = data.weather[0].main;
        const isNight = data.weather[0].icon?.includes("n");
        const emoji = getWeatherEmoji(main, isNight);
        setWeather({
          temp: Math.round(data.main.temp),
          desc: data.weather[0].description,
          city: data.name,
          emoji,
        });
      } else setWeather(null);
    } catch (e) {
      console.error("[Weather API Error]", e);
      setWeather(null);
    } finally {
      setLoadingWeather(false);
    }
  };

  const fetchPlants = async () => {
    const data = await loadPlants();
    setPlants(data || []);
    setFiltered(data || []);
  };

  const handleSearch = (text) => {
    setSearch(text);
    if (!text.trim()) return setFiltered(plants);
    const lower = text.toLowerCase();
    setFiltered(plants.filter((p) => (p.name || "").toLowerCase().includes(lower)));
  };

  const handleWater = async (id) => {
    await updateWaterDate(id);
    fetchPlants();
  };

  // ✅ 자동 슬라이드 안정화
  useEffect(() => {
    if (filtered.length < 2 || scrollLock.current) return;
    const timer = setInterval(() => {
      scrollLock.current = true;
      const nextIndex = (currentIndex + 1) % filtered.length;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
      setTimeout(() => (scrollLock.current = false), 800);
    }, 4000);
    return () => clearInterval(timer);
  }, [currentIndex, filtered]);

  const handleArrow = (dir) => {
    if (filtered.length === 0) return;
    let nextIndex = currentIndex + (dir === "right" ? 1 : -1);
    if (nextIndex >= filtered.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = filtered.length - 1;
    flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentIndex(nextIndex);
  };

  const renderItem = ({ item }) => (
    <View style={styles.cardWrapper}>
      <View style={styles.card}>
        <Image source={{ uri: item.image }} style={styles.image} />
        <Text style={styles.name}>{item.name ?? "이름없음"}</Text>
        <Text style={styles.date}>마지막 물: {item.waterDate || "기록 없음"}</Text>
        <Text style={styles.date}>다음 물주기: {item.nextWater || "미정"}</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#6FCF97" }]}
            onPress={() => {
              setSelectedPlant(item);
              setIsModalVisible(true);
            }}
          >
            <Text style={styles.buttonText}>사진 편집</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#F2C94C" }]}
            onPress={() => navigation.navigate("DiseaseResult")}
          >
            <Text style={styles.buttonText}>병충해 식별</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.waterButton, { backgroundColor: "#56CCF2" }]}
          onPress={() => handleWater(item.id)}
        >
          <Text style={styles.buttonText}>💧 물 줬어요</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={{ height: Platform.OS === "android" ? 55 : 70 }} />

      {/* ✅ 날씨 표시 (2줄 구성) */}
      <View style={styles.weatherBar}>
        {loadingWeather ? (
          <ActivityIndicator size="small" color="#6FCF97" />
        ) : weather ? (
          <>
            <View style={styles.weatherTop}>
              <Text style={styles.dateText}>{now}</Text>
              <Text style={styles.cityText}>{weather.city}</Text>
            </View>
            <View style={styles.weatherBottom}>
              <Text style={styles.emoji}>{weather.emoji}</Text>
              <Text style={styles.weatherText}>
                {weather.desc} · {weather.temp}°C
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.weatherText}>{now} · 날씨 정보를 불러올 수 없습니다</Text>
        )}
      </View>

      <TextInput
        style={styles.search}
        placeholder="식물 이름 검색..."
        value={search}
        onChangeText={handleSearch}
      />

      {filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>등록된 화분이 없습니다.</Text>
        </View>
      ) : (
        <View style={styles.sliderBox}>
          <TouchableOpacity onPress={() => handleArrow("left")} style={styles.arrowLeft}>
            <Text style={styles.arrowText}>←</Text>
          </TouchableOpacity>

          <FlatList
            ref={flatListRef}
            data={filtered}
            renderItem={renderItem}
            keyExtractor={(item, i) => String(item?.id ?? i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentIndex(idx);
            }}
            snapToAlignment="center"
            contentContainerStyle={{
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: (width - width * 0.75) / 2,
            }}
          />

          <TouchableOpacity onPress={() => handleArrow("right")} style={styles.arrowRight}>
            <Text style={styles.arrowText}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("AddPlant")}
      >
        <Text style={styles.addButtonText}>식물 추가</Text>
      </TouchableOpacity>

      {isModalVisible && (
        <EditImageModal
          visible={isModalVisible}
          plant={selectedPlant}
          onClose={() => {
            setIsModalVisible(false);
            fetchPlants();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FFF5", alignItems: "center" },
  weatherBar: {
    backgroundColor: "#EAF7E2",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  weatherTop: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  weatherBottom: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 4 },
  cityText: { fontSize: 14, fontWeight: "600", color: "#333" },
  emoji: { fontSize: 28, marginHorizontal: 4 },
  weatherText: { fontSize: 15, fontWeight: "600", color: "#333" },
  search: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 15,
    marginBottom: 12,
  },
  sliderBox: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  arrowLeft: { position: "absolute", left: 15, zIndex: 2, padding: 10 },
  arrowRight: { position: "absolute", right: 15, zIndex: 2, padding: 10 },
  arrowText: { fontSize: 28, color: "#666" },
  cardWrapper: { justifyContent: "center", alignItems: "center", width },
  card: {
    width: width * 0.75,
    height: 440,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  image: { width: "85%", height: 220, borderRadius: 15 },
  name: { fontSize: 20, fontWeight: "700", marginTop: 10, color: "#333" },
  date: { fontSize: 14, color: "#666", marginTop: 3 },
  buttonRow: { flexDirection: "row", justifyContent: "space-around", width: "85%", marginTop: 15 },
  button: { flex: 1, marginHorizontal: 5, borderRadius: 10, paddingVertical: 10 },
  waterButton: { marginTop: 10, borderRadius: 12, paddingVertical: 10, width: "85%" },
  buttonText: { color: "#fff", fontWeight: "600", textAlign: "center" },
  addButton: {
    backgroundColor: "#6FCF97",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    position: "absolute",
    bottom: 25,
  },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  emptyBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#999", fontSize: 16 },
});
