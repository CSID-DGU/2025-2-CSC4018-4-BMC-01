import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Calendar } from "react-native-calendars";

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(null);

  // ✅ 물 주기 체크리스트 날짜 예시 (향후 DB 연동 가능)
  const wateringDates = ["2025-12-05"];

  // ✅ 체크리스트 데이터
  const checklist = [
    { id: "1", name: "몬스테라1", checked: false },
    { id: "2", name: "몬스테라2", checked: false },
    { id: "3", name: "스투키1", checked: false },
  ];

  const [items, setItems] = useState(checklist);

  const toggleChecked = (id) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  // ✅ 날짜 표시 설정
  const marked = {
    ...wateringDates.reduce((acc, date) => {
      acc[date] = {
        marked: true,
        dotColor: "#d5faffd3",   // 점 색상을 하늘색으로
        customStyles: {
          container: {
            backgroundColor: "#d5faffd3", // ✅ 하늘색 배경
            borderRadius: 50,
          },
          text: {
            color: "black",
            fontWeight: "bold",
          },
        },
      };
      return acc;
    }, {}),
  };

  // ✅ 선택된 날짜는 추가로 강조
  if (selectedDate) {
    marked[selectedDate] = {
      selected: true,
      selectedColor: "#b6bcbeff",
    };
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>캘린더</Text>
      </View>

      <Calendar
        current={"2025-12-01"}
        monthFormat={"yyyy년 MM월"}
        hideExtraDays={false}
        enableSwipeMonths={true}
        markingType={"custom"}     // ✅ custom 스타일 사용
        markedDates={marked}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        style={styles.calendar}
      />

      {/* ✅ 일정이 있는 날만 체크리스트 표시 */}
      {wateringDates.includes(selectedDate) && (
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>💧 Watering List</Text>

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => toggleChecked(item.id)}
              >
                <View style={[styles.checkbox, item.checked && styles.checkedBox]}>
  {item.checked && <Text style={styles.checkMark}>✓</Text>}
</View>

<Text style={[styles.checkText, item.checked && styles.checkedText]}>
  {item.name}
</Text>

                
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: "#d5faffd3",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  calendar: {
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 10,
    backgroundColor: "#ffffff",
    marginTop: 30,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  listContainer: {
    backgroundColor: "white",
    marginTop: 20,
    padding: 15,
    borderRadius: 15,
    marginHorizontal: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  checkbox: {
  width: 22,
  height: 22,
  borderRadius: 6,
  borderWidth: 2,
  borderColor: "rgba(220, 220, 220, 0.71)",
  justifyContent: "center",
  alignItems: "center",
  marginRight: 10,
},
checkedBox: {
  backgroundColor: "rgba(220, 220, 220, 0.71)",
},
checkMark: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "700",
},
checkText: {
  fontSize: 15,
  fontWeight: "600",
},
});
