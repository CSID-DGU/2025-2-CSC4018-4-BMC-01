/*
  파일명: CalendarScreen.js
  기능: 화분 물주기 기록 및 일자 표시용 달력
*/

import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, DeviceEventEmitter } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { getCalendarData } from "../utils/storage";

// ✅ 한국어 달력 설정
LocaleConfig.locales["kr"] = {
  monthNames: [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월",
  ],
  monthNamesShort: [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월",
  ],
  dayNames: ["일요일","월요일","화요일","수요일","목요일","금요일","토요일"],
  dayNamesShort: ["일","월","화","수","목","금","토"],
};
LocaleConfig.defaultLocale = "kr";

export default function CalendarScreen() {
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [hasWatered, setHasWatered] = useState(false); // ✅ 선택 날짜에 물주기 여부

  /*
    기능: AsyncStorage에서 물준 날짜/다음 물주기 데이터 불러와 표시
  */
  const loadCalendarData = async () => {
    const data = await getCalendarData();
    setMarkedDates(data);
    // 선택된 날짜가 이미 있으면 해당 날짜가 물준 날인지 즉시 반영
    if (selectedDate) setHasWatered(!!data[selectedDate]);
  };

  // ✅ 최초 로드 + CALENDAR_UPDATE 이벤트 수신 시 새로고침
  useEffect(() => {
    loadCalendarData();
    const sub = DeviceEventEmitter.addListener("CALENDAR_UPDATE", loadCalendarData);
    return () => sub.remove();
  }, []);

  // ✅ 날짜 클릭 시 물주기 여부 확인
  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    setHasWatered(!!markedDates[day.dateString]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>물주기 캘린더</Text>

      {/* ✅ 달력 컴포넌트 */}
      <Calendar
        style={styles.calendar}
        onDayPress={handleDayPress}
        markedDates={{
          ...markedDates,
          ...(selectedDate && {
            [selectedDate]: { selected: true, selectedColor: "#6FCF97" },
          }),
        }}
        theme={{
          selectedDayBackgroundColor: "#6FCF97",
          todayTextColor: "#27AE60",
          arrowColor: "#27AE60",
          dotColor: "#27AE60",
          textMonthFontWeight: "bold",
        }}
      />

      {/* ✅ 선택한 날짜 표시 + 물주기 여부 */}
      {selectedDate ? (
        <View style={{ alignItems: "center", marginTop: 20 }}>
          <Text style={styles.infoText}>선택된 날짜: {selectedDate}</Text>
          {hasWatered ? (
            <Text style={styles.wateredText}>💧 이 날 물을 준 기록이 있습니다.</Text>
          ) : (
            <Text style={styles.notWateredText}>아직 물을 준 기록이 없습니다.</Text>
          )}
        </View>
      ) : (
        <Text style={styles.infoText}>날짜를 선택해주세요</Text>
      )}
    </View>
  );
}

/*
  스타일 정의
*/
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FFF5",
    alignItems: "center",
    paddingTop: 60, // ✅ 카메라 영역과 겹치지 않도록 상단 여백 추가
  },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20, color: "#333" },
  calendar: {
    width: "90%",
    borderRadius: 12,
    backgroundColor: "#fff",
    elevation: 3,
    padding: 10,
  },
  infoText: { fontSize: 15, color: "#555", marginTop: 15 },
  wateredText: {
    marginTop: 5,
    color: "#27AE60",
    fontWeight: "700",
    fontSize: 16,
  },
  notWateredText: {
    marginTop: 5,
    color: "#999",
    fontSize: 15,
  },
});
