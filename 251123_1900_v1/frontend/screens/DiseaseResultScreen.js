/*
  파일명: DiseaseResultScreen.js
  목적:
    - 잎 사진 촬영/선택 후 병충해 AI 분석
    - 분석 결과 표시 및 leafPhotos 저장
*/

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import {
  saveLeafImageToStorage
} from "../utils/Storage";

/* Storage.js에는 addLeafPhoto가 미구현이므로 직접 구현 */
import AsyncStorage from "@react-native-async-storage/async-storage";
const META_KEY = "PLANT_META_DATA";

/* leafPhoto 저장용 */
const updateLeafPhotoMeta = async (plantId, fileName, savedUri) => {
  try {
    const json = await AsyncStorage.getItem(META_KEY);
    const meta = json ? JSON.parse(json) : {};

    if (!meta[plantId]) meta[plantId] = {};
    if (!meta[plantId].leafPhotos) meta[plantId].leafPhotos = [];

    meta[plantId].leafPhotos.push({ fileName, uri: savedUri });

    await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch (error) {
    console.log("leafPhoto meta 저장 오류:", error);
  }
};

/* AI 서비스 */
import { diagnoseDisease } from "../src/services/aiService";

export default function DiseaseResultScreen({ navigation, route }) {
  const plant = route.params?.plant;
  const [imageUri, setImageUri] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  /* 이미지 선택 모달 열기 */
  const openPicker = () => setPickerVisible(true);
  const closePicker = () => setPickerVisible(false);

  /* 갤러리 */
  const pickFromGallery = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.9
    });

    if (r.canceled) return;

    const localUri = r.assets[0].uri;
    const fileName = r.assets[0].fileName || `leaf_${Date.now()}.jpg`;

    closePicker();
    await handleAnalyze(localUri, fileName);
  };

  /* 카메라 */
  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      alert("카메라 권한을 허용해주세요.");
      return;
    }

    const r = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.9
    });

    if (r.canceled) return;

    const localUri = r.assets[0].uri;
    const fileName = r.assets[0].fileName || `leaf_${Date.now()}.jpg`;

    closePicker();
    await handleAnalyze(localUri, fileName);
  };

  /* AI 분석 + 이미지 저장 */
  const handleAnalyze = async (localUri, fileName) => {
    if (!plant?.id) {
      Alert.alert("오류", "식물 정보가 없습니다.");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      /* 저장용 파일명 보정 */
      const finalName = fileName.startsWith("leaf_")
        ? fileName
        : `leaf_${fileName}`;

      const savedUri = await saveLeafImageToStorage(localUri, finalName);

      /* leafPhoto meta 기록 */
      await updateLeafPhotoMeta(plant.id, finalName, savedUri);

      setImageUri(savedUri);

      /* AI 분석 */
      const analysis = await diagnoseDisease(plant.id, savedUri, finalName);

      setResult({
        disease: analysis.disease,
        confidence: analysis.aiResult?.confidence
      });

      Alert.alert(
        "분석 완료",
        `진단: ${analysis.disease}\n신뢰도: ${(analysis.aiResult.confidence * 100).toFixed(1)}%`
      );
    } catch (error) {
      console.error("❌ AI 분석 오류:", error);
      console.error("❌ message:", error.message);
      console.error("❌ full:", JSON.stringify(error, null, 2));

      Alert.alert("오류", error.message || "분석 실패");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>병충해 분석</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text style={styles.sub}>식물: {plant?.name || "이름 없음"}</Text>

        {/* 미리보기 */}
        <View style={styles.previewBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImg} />
          ) : (
            <Text style={styles.previewText}>잎 사진을 선택해주세요.</Text>
          )}
        </View>

        {/* 촬영 버튼 */}
        <TouchableOpacity style={styles.cameraBtn} onPress={openPicker}>
          <Text style={styles.cameraBtnText}>잎 사진 촬영 / 선택</Text>
        </TouchableOpacity>

        {/* 분석 중 */}
        {isAnalyzing && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#8CCB7F" />
            <Text style={styles.loadingText}>AI 분석 중...</Text>
          </View>
        )}

        {/* 분석 결과 */}
        {result && !isAnalyzing && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>분석 결과</Text>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>진단:</Text>
              <Text style={styles.resultValue}>{result.disease}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>신뢰도:</Text>
              <Text style={styles.resultValue}>
                {(result.confidence * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 사진 선택 모달 */}
      <Modal visible={pickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>사진 선택</Text>

            <TouchableOpacity style={styles.modalBtn} onPress={pickFromGallery}>
              <Text style={styles.modalText}>갤러리</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtn} onPress={pickFromCamera}>
              <Text style={styles.modalText}>카메라</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, styles.cancelBtn]}
              onPress={closePicker}
            >
              <Text style={[styles.modalText, styles.cancelText]}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* 스타일 */
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#E0E0E0"
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold"
  },
  closeButton: {
    fontSize: 26,
    color: "#666"
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20
  },
  sub: {
    fontSize: 15,
    color: "#777",
    marginBottom: 20
  },
  previewBox: {
    width: "100%",
    height: 250,
    backgroundColor: "#EEE",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20
  },
  previewImg: {
    width: "100%",
    height: "100%",
    borderRadius: 15
  },
  previewText: {
    color: "#666"
  },
  cameraBtn: {
    backgroundColor: "#8CCB7F",
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 25
  },
  cameraBtnText: {
    textAlign: "center",
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16
  },
  loadingBox: {
    backgroundColor: "#FFF",
    padding: 30,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 25
  },
  loadingText: {
    marginTop: 15,
    color: "#555"
  },
  resultBox: {
    backgroundColor: "#E8F5E9",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#8CCB7F"
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  resultLabel: {
    color: "#555",
    fontWeight: "600"
  },
  resultValue: {
    color: "#2E7D32",
    fontWeight: "bold"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalBox: {
    width: "75%",
    backgroundColor: "#FFF",
    padding: 25,
    borderRadius: 15
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center"
  },
  modalBtn: {
    backgroundColor: "#8CCB7F",
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 12
  },
  modalText: {
    color: "#FFF",
    textAlign: "center",
    fontWeight: "bold"
  },
  cancelBtn: {
    backgroundColor: "#DDD"
  },
  cancelText: {
    color: "#333"
  }
});
