/*
  파일명: CalendarScreen.js
  목적:
    - 등록된 화분들의 nextWater 날짜를 기준으로 물주기 일정을 캘린더 형태로 시각화
    - 날짜 선택 시 해당 날짜에 물을 줘야 하는 식물 목록을 표시

  주요 데이터 흐름:
    - fetchPlants(): Storage.js에서 API 데이터 + 로컬 메타데이터 병합 결과 조회
      · waterDate       : 최근 물 준 날짜
      · nextWater       : 다음 물 줄 날짜 (waterDate + WateringPeriod)
      · favorite        : 대표식물 여부(로컬 저장)
      · WateringPeriod  : 물주는 주기 (기본 7일, 프론트 확장 데이터)

  UI 구성:
    - 상단 제목 (“물주기 캘린더”)
    - 우측 상단 톱니 아이콘(⚙️)
      → 알림 설정 화면(NotificationSettingScreen) 이동
    - 캘린더 마킹:
      · 빈 물방울 = nextWater 날짜 (물 줘야 함)
      · 채워진 물바울 = last_watered 날짜 (최근 물 줌)
      · nextWater == last_watered 시 빈 물방울이 우선 표시

  확장 요소:
    - 날짜별 물주기 일정 표시
    - PlantDetailScreen에서 물 준 날짜 수정 시 캘린더 자동 갱신 (focus 기반)
*/

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { usePlants } from "../context/PlantContext";

const DROP_EMPTY = require("../assets/icons/drop_empty.png");
const DROP_FILLED = require("../assets/icons/drop_filled.png");

export default function CalendarScreen({ navigation }) {
  const { plants, loadPlants } = usePlants();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedPlants, setSelectedPlants] = useState([]);

  useEffect(() => {
    loadPlants();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => loadPlants());
    return unsub;
  }, [navigation, loadPlants]);

  const handleDayPress = (dateObj) => {
    const d = dateObj.dateString;
    setSelectedDate(d);
    setSelectedPlants(plants.filter((p) => p.nextWater === d));
  };

  /* 물방울 존재 여부 계산 */
  const getIconForDate = (dateStr) => {
    const isNext = plants.some((p) => p.nextWater === dateStr);
    const isLast = plants.some((p) => p.waterDate === dateStr);

    if (isNext) return DROP_EMPTY;
    if (isLast) return DROP_FILLED;
    return null;
  };

  /* 날짜 custom renderer (터치 보존 버전) */
  const renderDay = ({ date, state, onPress }) => {
    if (!date) return null;

    const icon = getIconForDate(date.dateString);
    const disabled = state === "disabled";

    return (
      <TouchableOpacity
        onPress={() => onPress(date)}
        style={styles.dayBox}
      >
        {icon && (
          <View style={styles.dropWrapper}>
            <Image
              source={icon}
              style={icon === DROP_EMPTY ? styles.dropIconEmpty : styles.dropIconFilled}
            />
            <Text style={[styles.dayTextOnIcon, disabled && { color: "#CCC" }]}>
              {date.day}
            </Text>
          </View>
        )}

        {!icon && (
          <Text style={[styles.dayText, disabled && { color: "#CCC" }]}>
            {date.day}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ImageBackground
      source={require("../assets/bg_full_calendar.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
      blurRadius={2}
    >
      <View style={styles.overlay} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>물주기 캘린더</Text>

          <TouchableOpacity
            onPress={() => navigation.navigate("NotificationSetting")}
            style={styles.settingBtn}
          >
            <Text style={{ fontSize: 26 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
          <Calendar
            onDayPress={handleDayPress}
            dayComponent={renderDay}
            style={styles.calendar}
          />

          {/* 선택 날짜 리스트 */}
          {selectedDate && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>{selectedDate} 물 줄 화분</Text>

              {selectedPlants.length === 0 ? (
                <View style={styles.emptyPlantBox}>
                  <Text style={styles.noneText}>물 줄 화분 없음</Text>
                </View>
              ) : (
                <FlatList
                  data={selectedPlants}
                  keyExtractor={(i) => i.id.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.plantBox}>
                      <Text style={styles.plantName}>{item.name}</Text>
                      <Text style={styles.plantText}>
                        마지막 물 준 날 : {item.waterDate || "기록 없음"}
                      </Text>
                    </View>
                  )}
                  scrollEnabled={false}
                />
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

/* ---------------------- 스타일 ---------------------- */
const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.25)",
    pointerEvents: "none",
  },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },

  settingBtn: { padding: 4 },

  calendar: {
    borderRadius: 15,
    elevation: 2,
    marginBottom: 25,
    backgroundColor: "#FFF",
    paddingVertical: 10,
  },

  /* 날짜 셀 */
  dayBox: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },

  dropWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },

  dropIcon: {
    width: 34,
    height: 34,
  },

  dropIconEmpty: {
    width: 34,
    height: 34,
  },

  dropIconFilled: {
    width: 45,
    height: 45,
  },

  dayTextOnIcon: {
    position: "absolute",
    fontSize: 14,
    color: "#333",
  },

  dayText: {
    fontSize: 14,
    color: "#333",
  },

  infoBox: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 15,
  },

  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },

  emptyPlantBox: {
    backgroundColor: "#FFF",
    paddingVertical: 15,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  noneText: {
    fontSize: 15,
    color: "#999",
  },

  plantBox: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },

  plantName: {
    fontSize: 16,
    fontWeight: "600",
  },

  plantText: {
    fontSize: 13,
    color: "#777",
    marginTop: 3,
  },
});
