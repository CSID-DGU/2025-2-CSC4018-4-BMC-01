import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚙️ 설정</Text>
      <View style={styles.box}>
        <Text style={styles.subText}>현재 별도 설정 기능이 없습니다.</Text>
        <Text style={styles.subText}>업데이트 예정입니다.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5FAF2",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 20, color: "#333" },
  box: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 25,
    elevation: 3,
    alignItems: "center",
  },
  subText: { fontSize: 16, color: "#777" },
});
