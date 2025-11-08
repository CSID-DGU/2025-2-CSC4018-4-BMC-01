import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";

export default function PlantDetailScreen({ route }) {
  const { name, image } = route.params;

  return (
    <View style={styles.container}>
      {/* 상단: 식물 사진 + 식물 정보 버튼 */}
      <View style={styles.topSection}>
        <Image source={image} style={styles.plantImage} />

        <View style={styles.infoSection}>
          <Text style={styles.plantName}>{name}</Text>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.btnText}>대표식물 설정</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.btnText}>사진 업데이트</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.btnText}>병충해 식별</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 표 영역 */}
      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={styles.label}>적정 온도</Text>
          <Text style={styles.value}>15°C ~ 25°C</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>적정 일조량</Text>
          <Text style={styles.value}>밝은 간접광</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>적정 급수량</Text>
          <Text style={styles.value}>7일에 1번</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>병충해 여부</Text>
          <Text style={styles.value}>없음</Text>
        </View>
      </View>

      {/* ✅ 삭제 버튼 (UI만 존재, 동작 없음) */}
      <TouchableOpacity style={styles.deletePlantBtn}>
        <Text style={styles.deleteText}>식물 정보 삭제</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#d6f1ff", padding: 20 },

  topSection: { flexDirection: "row" },
  plantImage: {
    width: 140,
    height: 180,
    borderRadius: 15,
  },
  infoSection: { marginLeft: 20, justifyContent: "space-evenly" },
  plantName: { fontSize: 20, fontWeight: "700" },

  button: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    width: 140,
    alignItems: "center",
  },
  btnText: { fontWeight: "600" },

  table: {
    marginTop: 25,
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingVertical: 15,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 10,
    justifyContent: "space-between",
  },
  label: { fontWeight: "600" },
  value: {},

  // ✅ 삭제 버튼 UI
  deletePlantBtn: {
    marginTop: 25,
    backgroundColor: "#ff7d7d",
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: "center",
  },
  deleteText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
