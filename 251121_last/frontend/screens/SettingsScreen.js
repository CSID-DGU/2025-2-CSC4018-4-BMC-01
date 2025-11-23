/*
  파일명: SettingsScreen.js
  기능: 설정 화면 (SafeArea A안 적용)
*/

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
      edges={["top", "bottom", "left", "right"]}   // ★ A안 적용
    >
      <View style={styles.container}>
        <Text style={styles.text}>설정 화면</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40, // ★ 하단 제스처바 대비
    paddingHorizontal: 20 // ★ 좌우 여백 A안 기준
  },

  text: {
    fontSize: 22,
    fontWeight: "bold"
  }
});
