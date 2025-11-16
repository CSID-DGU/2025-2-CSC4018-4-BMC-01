/*
  파일명: PlantDetailScreen.js
  기능: 화분 상세 정보 + 물 준 날짜 수정 + 삭제 + 분석 + 수정
*/

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

/* Storage */
import { deletePlant, updatePlant } from "../utils/Storage";

export default function PlantDetailScreen({ navigation, route }) {
  const plant = route.params?.plant;
  const [currentPlant, setCurrentPlant] = useState(plant);
  const [showPicker, setShowPicker] = useState(false);

  if (!currentPlant) return null;

  /* ---------------- 최근 물 준 날짜 변경 ---------------- */
  const onChangeDate = async (event, selected) => {
    setShowPicker(false);
    if (!selected) return;

    const y = selected.getFullYear();
    const m = ("0" + (selected.getMonth() + 1)).slice(-2);
    const d = ("0" + selected.getDate()).slice(-2);
    const newWater = `${y}-${m}-${d}`;

    const next = new Date(selected);
    next.setDate(next.getDate() + 3);

    const ny = next.getFullYear();
    const nm = ("0" + (next.getMonth() + 1)).slice(-2);
    const nd = ("0" + next.getDate()).slice(-2);
    const newNext = `${ny}-${nm}-${nd}`;

    const updated = {
      ...currentPlant,
      waterDate: newWater,
      nextWater: newNext
    };

    await updatePlant(updated);
    setCurrentPlant(updated);
  };

  /* ---------------- 삭제 ---------------- */
  const handleDelete = () => {
    Alert.alert(
      "삭제 확인",
      "정말 삭제하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            await deletePlant(currentPlant.id);
            navigation.goBack();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }} // ★ 하단 여백 보강
        showsVerticalScrollIndicator={false}
      >
        {/* ----------- 이미지 ----------- */}
        <View style={styles.imageBox}>
          <Image
            source={{ uri: currentPlant.image }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        {/* ----------- 이름 ----------- */}
        <Text style={styles.name}>{currentPlant.name}</Text>

        {/* ----------- 최근 물 준 날짜 ----------- */}
        <TouchableOpacity
          style={styles.infoBox}
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.infoTitle}>최근 물 준 날짜</Text>
          <Text style={[styles.infoValue, { color: "#3A7AFE" }]}>
            {currentPlant.waterDate || "기록 없음"}  (눌러서 수정)
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={
              currentPlant.waterDate
                ? new Date(currentPlant.waterDate)
                : new Date()
            }
            mode="date"
            display="default"
            onChange={onChangeDate}
          />
        )}

        {/* ----------- 다음 물 날짜 ----------- */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>다음 물 주는 날</Text>
          <Text style={styles.infoValue}>
            {currentPlant.nextWater || "미정"}
          </Text>
        </View>

        {/* ----------- 버튼 영역 ----------- */}
        <View style={styles.btnArea}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#7BA4F4" }]}
            onPress={() =>
              navigation.navigate("PlantEditor", {
                mode: "edit",
                plant: currentPlant
              })
            }
          >
            <Text style={styles.btnText}>정보 수정</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#8CCB7F" }]}
            onPress={() =>
              navigation.navigate("DiseaseResult", { plant: currentPlant })
            }
          >
            <Text style={styles.btnText}>병충해 분석</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#E57373" }]}
            onPress={handleDelete}
          >
            <Text style={styles.btnText}>삭제</Text>
          </TouchableOpacity>
        </View>

        {/* ----------- 관리 정보 ----------- */}
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>🌱 식물 관리 정보</Text>
          <Text style={styles.infoSectionDetail}>
            (서버에서 받아올 관리 정보가 표시될 예정입니다.)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------------- 스타일 ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,     // ★ 좌우 여백 강화
    paddingTop: 20,
    backgroundColor: "#FAFAFA"
  },

  imageBox: {
    width: "100%",
    height: 250,
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 20
  },

  image: { width: "100%", height: "100%" },

  name: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20
  },

  infoBox: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#DDD"
  },

  infoTitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4
  },

  infoValue: {
    fontSize: 18,
    fontWeight: "600"
  },

  btnArea: {
    marginTop: 25
  },

  btn: {
    padding: 15,
    borderRadius: 10,
    marginTop: 12
  },

  btnText: {
    textAlign: "center",
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold"
  },

  infoSection: {
    marginTop: 35,
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 12
  },

  infoSectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8
  },

  infoSectionDetail: {
    fontSize: 15,
    color: "#555",
    lineHeight: 20
  }
});
