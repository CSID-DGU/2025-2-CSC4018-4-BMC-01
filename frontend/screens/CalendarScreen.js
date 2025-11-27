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
      · O (빈 원, 44px)  = nextWater 날짜 (물 줘야 함)
      · ● (채워진 원, 44px) = last_watered 날짜 (최근 물 줌)
      · nextWater == last_watered 시 O가 우선 표시

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
  ImageBackground // ★ 추가: 캘린더 화면 배경 이미지
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";

/* Storage.js 연동 */
import { fetchPlants } from "../utils/Storage";

export default function CalendarScreen({ navigation }) {
  const [plants, setPlants] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedPlants, setSelectedPlants] = useState([]);

  /* ------------------ 식물 로드 ------------------ */
  const loadPlantData = async () => {
    const list = await fetchPlants();
    setPlants(list);
  };

  /* 초기 로드 */
  useEffect(() => {
    loadPlantData();
  }, []);

  /* 화면 focus 시 자동 새로고침 */
  useEffect(() => {
    const unsub = navigation.addListener("focus", loadPlantData);
    return unsub;
  }, [navigation]);

  /* ------------------ custom marker 생성 ------------------ */
  const generateMarks = (list) => {
    const marks = {};

    list.forEach((p) => {
      const next = p.nextWater;
      const last = p.waterDate;

      // O (물 줘야 할 날)
      if (next) {
        marks[next] = {
          customStyles: {
            container: {
              width: 44,
              height: 44,
              borderRadius: 22,
              borderWidth: 3,
              borderColor: "#6CC96F",
              backgroundColor: "white",
              justifyContent: "center",
              alignItems: "center"
            },
            text: {
              color: "#6CC96F",
              fontWeight: "bold"
            }
          }
        };
      }

      // ● (최근 물 준 날짜) — 단 nextWater와 같으면 O 우선
      if (last && last !== next) {
        marks[last] = {
          customStyles: {
            container: {
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#6CC96F",
              justifyContent: "center",
              alignItems: "center"
            },
            text: {
              color: "white",
              fontWeight: "bold"
            }
          }
        };
      }
    });

    return marks;
  };

  /* ------------------ 날짜 선택 ------------------ */
  const handleDayPress = (day) => {
    const date = day.dateString;
    setSelectedDate(date);

    setSelectedPlants(plants.filter((p) => p.nextWater === date));
  };

  /* ------------------ 초기 로드 ------------------ */
  useEffect(() => {
    loadPlantData();
  }, []);

  useEffect(() => {
    setMarkedDates(generateMarks(plants));
  }, [plants]);

  /* ------------------ 선택 날짜 리스트 ------------------ */
  const renderItem = ({ item }) => (
    <View style={styles.plantBox}>
      <Text style={styles.plantName}>{item.name}</Text>
      <Text style={styles.plantText}>
        마지막 물 준 날 : {item.waterDate || "기록 없음"}
      </Text>
    </View>
  );

  /* ------------------ 화면 구성 ------------------ */
  return (
    <ImageBackground
      source={require("../assets/bg_full_calendar.png")} // ★ 캘린더 전용 배경
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }} // ★ 배경 이미지를 보이도록 투명 처리
        edges={["top", "bottom", "left", "right"]}
      >
        {/* ------------------ 헤더 (톱니 추가) ------------------ */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>물주기 캘린더</Text>

          <TouchableOpacity
            onPress={() => navigation.navigate("NotificationSetting")}
          >
            <Text style={{ fontSize: 22 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 캘린더 */}
          <Calendar
            markedDates={markedDates}
            markingType="custom"
            onDayPress={handleDayPress}
            theme={{
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14
            }}
            style={styles.calendar}
          />

          {/* 선택 날짜 정보 */}
          {selectedDate && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>{selectedDate} 물 줄 화분</Text>

              {selectedPlants.length === 0 ? (
                <Text style={styles.noneText}>물 줄 화분 없음</Text>
              ) : (
                <FlatList
                  data={selectedPlants}
                  keyExtractor={(i) => i.id.toString()}
                  renderItem={renderItem}
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
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20
  },

  title: {
    fontSize: 22,
    fontWeight: "bold"
  },

  calendar: {
    borderRadius: 15,
    elevation: 2,
    marginBottom: 25,
    backgroundColor: "#FFF",
    paddingVertical: 10
  },

  infoBox: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 15
  },

  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15
  },

  noneText: {
    fontSize: 15,
    color: "#777",
    textAlign: "center",
    marginTop: 5
  },

  plantBox: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#EEE"
  },

  plantName: {
    fontSize: 16,
    fontWeight: "600"
  },

  plantText: {
    fontSize: 13,
    color: "#777",
    marginTop: 3
  }
});
