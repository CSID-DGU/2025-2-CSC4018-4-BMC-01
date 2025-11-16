/*
  파일명: CalendarScreen.js
  기능: 물주기 일정 캘린더 (A안: react-native-calendars)
*/

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";

/* Storage 연동 */
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

  /* ------------------ focus 시 자동 갱신 ------------------ */
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      loadPlantData();
    });
    return unsub;
  }, [navigation]);

  /* ------------------ 캘린더 마킹 생성 ------------------ */
  const generateMarks = (list) => {
    const marks = {};

    list.forEach((plant) => {
      if (!plant.nextWater) return;

      const date = plant.nextWater;

      if (!marks[date]) {
        marks[date] = {
          marked: true,
          dots: [{ color: "#6CC96F" }]
        };
      } else {
        marks[date].dots.push({ color: "#6CC96F" });
      }
    });

    // 오늘 날짜 점 표시
    const today = new Date().toISOString().split("T")[0];
    if (!marks[today]) {
      marks[today] = { marked: true, dots: [{ color: "#4A90E2" }] };
    } else {
      marks[today].dots.push({ color: "#4A90E2" });
    }

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

  /* ------------------ 마킹 갱신 ------------------ */
  useEffect(() => {
    setMarkedDates(generateMarks(plants));
  }, [plants]);

  /* ------------------ 렌더 ------------------ */
  const renderItem = ({ item }) => (
    <View style={styles.plantBox}>
      <Text style={styles.plantName}>{item.name}</Text>
      <Text style={styles.plantText}>
        마지막 물 준 날: {item.waterDate || "기록 없음"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
      edges={["top", "bottom", "left", "right"]}   // ★ A안 적용
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>물주기 캘린더</Text>

        {/* 캘린더 */}
        <Calendar
          markedDates={markedDates}
          markingType={"multi-dot"}
          onDayPress={handleDayPress}
          theme={{
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14
          }}
          style={styles.calendar}
        />

        {/* 해당 날짜 화분 */}
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
  );
}

/* ------------------ 스타일 ------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,   // ★ 좌우 여백
    paddingTop: 20,
    backgroundColor: "#FAFAFA",
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20
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
