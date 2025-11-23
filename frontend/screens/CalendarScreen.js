/*
  파일명: CalendarScreen.js
  목적:
    - 사용자가 등록한 화분의 nextWater 날짜 기반 물주기 일정을 캘린더로 시각화
    - 날짜 선택 시 그날 물 줘야 하는 화분 리스트를 표시

  주요 데이터 흐름:
    - fetchPlants(): Storage.js에서 API + 로컬 메타데이터 병합 결과 가져옴
      · waterDate  : 최근 물 준 날짜 (프론트 계산)
      · nextWater  : 다음 물 줄 날짜 (waterDate + WateringPeriod)
      · favorite   : 대표식물 여부(로컬 저장)
      · WateringPeriod : 물주는 주기 (프론트 저장 / 기본값 7)
    - CalendarScreen:
      · nextWater 기준으로 캘린더에 dot 표시
      · 날짜 선택하면 해당 날짜의 식물만 필터링하여 표시

  향후 확장 예정:
    - 오른쪽 상단 톱니 아이콘 추가 → “푸시 알림 설정(ON/OFF + 알림시각 설정)”
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

/* Storage.js 연동: 식물 데이터 조회 */
import { fetchPlants } from "../utils/Storage";

export default function CalendarScreen({ navigation }) {
  /* ----------------------------------------------------------
      상태값
      - plants        : 전체 식물 목록
      - markedDates   : 캘린더 표시용 마킹 데이터
      - selectedDate  : 사용자가 클릭한 날짜
      - selectedPlants: 선택한 날짜에 물을 줘야 하는 식물 목록
  ----------------------------------------------------------- */
  const [plants, setPlants] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedPlants, setSelectedPlants] = useState([]);

  /* ----------------------------------------------------------
      식물 목록 로드 (fetchPlants = API + 로컬메타 병합 결과)
  ----------------------------------------------------------- */
  const loadPlantData = async () => {
    const list = await fetchPlants();
    setPlants(list);
  };

  /* ----------------------------------------------------------
      화면 focus 시 데이터 자동 갱신
      - HomeScreen에서 물을 주고 돌아올 경우 즉시 반영됨
  ----------------------------------------------------------- */
  useEffect(() => {
    const unsub = navigation.addListener("focus", loadPlantData);
    return unsub;
  }, [navigation]);

  /* ----------------------------------------------------------
      캘린더 마킹 생성
      - plant.nextWater 날짜를 기준으로 여러 식물이 같은 날짜에 잇으면 다중 dot
      - 오늘 날짜는 별도 파란색 dot 추가
  ----------------------------------------------------------- */
  const generateMarks = (list) => {
    const marks = {};

    list.forEach((plant) => {
      if (!plant.nextWater) return;
      const date = plant.nextWater;

      if (!marks[date]) {
        marks[date] = { marked: true, dots: [{ color: "#6CC96F" }] };
      } else {
        marks[date].dots.push({ color: "#6CC96F" });
      }
    });

    // 오늘 날짜 마킹(파란색)
    const today = new Date().toISOString().split("T")[0];
    if (!marks[today]) {
      marks[today] = { marked: true, dots: [{ color: "#4A90E2" }] };
    } else {
      marks[today].dots.push({ color: "#4A90E2" });
    }

    return marks;
  };

  /* ----------------------------------------------------------
      날짜 클릭 이벤트
      - 해당 날짜와 plant.nextWater가 일치하는 plant 추출
  ----------------------------------------------------------- */
  const handleDayPress = (day) => {
    const date = day.dateString;
    setSelectedDate(date);

    // nextWater 기준 필터링
    setSelectedPlants(plants.filter((p) => p.nextWater === date));
  };

  /* ----------------------------------------------------------
      초기 로드
  ----------------------------------------------------------- */
  useEffect(() => {
    loadPlantData();
  }, []);

  /* ----------------------------------------------------------
      식물 목록 변경 시 캘린더 마킹 재생성
  ----------------------------------------------------------- */
  useEffect(() => {
    setMarkedDates(generateMarks(plants));
  }, [plants]);

  /* ----------------------------------------------------------
      리스트 아이템 렌더링
  ----------------------------------------------------------- */
  const renderItem = ({ item }) => (
    <View style={styles.plantBox}>
      <Text style={styles.plantName}>{item.name}</Text>
      <Text style={styles.plantText}>
        마지막 물 준 날: {item.waterDate || "기록 없음"}
      </Text>
    </View>
  );

  /* ----------------------------------------------------------
      화면 구성
  ----------------------------------------------------------- */
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
      edges={["top", "bottom", "left", "right"]} // SafeArea 적용
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>물주기 캘린더</Text>

        {/* ---------------- 캘린더 ---------------- */}
        <Calendar
          markedDates={markedDates}
          markingType="multi-dot" // 여러 식물 표시 가능
          onDayPress={handleDayPress}
          theme={{
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14
          }}
          style={styles.calendar}
        />

        {/* ---------------- 선택한 날짜 정보 ---------------- */}
        {selectedDate && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>{selectedDate} 물 줄 화분</Text>

            {/* 식물이 없으면 안내 */}
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

/* ---------------------- 스타일 ---------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20, // 좌우 여백
    paddingTop: 20,
    backgroundColor: "#FAFAFA",
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },

  calendar: {
    borderRadius: 15,
    elevation: 2,
    marginBottom: 25,
    backgroundColor: "#FFF",
    paddingVertical: 10,
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

  noneText: {
    fontSize: 15,
    color: "#777",
    textAlign: "center",
    marginTop: 5,
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
