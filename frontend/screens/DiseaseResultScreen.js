/*
  파일명: DiseaseResultScreen.js
  기능: 병충해 분석 A안 (촬영 → 저장 → 미리보기)
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
  Alert
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

/* Storage */
import {
  saveLeafImageToStorage,
  addLeafPhoto
} from "../utils/Storage";

/* AI Service */
import { diagnoseDisease } from "../src/services/aiService";

export default function DiseaseResultScreen({ navigation, route }) {
  const plant = route.params?.plant;
  const [imageUri, setImageUri] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  /* ------------------- 잎 사진 촬영 및 AI 분석 ------------------- */
  const takeLeafPhoto = async () => {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      alert("카메라 권한을 허용해주세요!");
      return;
    }

    const r = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.9
    });

    if (r.canceled) return;

    const localUri = r.assets[0].uri;
    const originalFileName = r.assets[0].fileName || `leaf_${Date.now()}.jpg`;

    // leaf_ 프리픽스가 없으면 추가 (AI 라우팅용)
    const fileName = originalFileName.startsWith('leaf_')
      ? originalFileName
      : `leaf_${originalFileName}`;

    // 이미지 미리보기용으로 저장 (나중에 사용할 수도 있음)
    const savedUri = await saveLeafImageToStorage(localUri, fileName);

    // plant.leafPhotos 추가
    await addLeafPhoto(plant.id, fileName, savedUri);

    setImageUri(localUri);  // 미리보기용 - 원본 URI 사용

    // AI 분석 시작 - 원본 URI와 파일명 전달
    await analyzeImage(localUri, fileName);
  };

  /* ------------------- AI 병충해 분석 ------------------- */
  const analyzeImage = async (uri, fileName) => {
    if (!plant?.id) {
      Alert.alert("오류", "식물 정보를 찾을 수 없습니다.");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const analysisResult = await diagnoseDisease(plant.id, uri, fileName);

      setResult({
        disease: analysisResult.disease,
        confidence: analysisResult.aiResult.confidence,
      });

      Alert.alert(
        "분석 완료",
        `진단: ${analysisResult.disease}\n신뢰도: ${(analysisResult.aiResult.confidence * 100).toFixed(1)}%`
      );
    } catch (error) {
      console.error("AI 분석 오류:", error);
      Alert.alert("분석 실패", error.message || "병충해 분석에 실패했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
      edges={["top", "bottom", "left", "right"]}   // ★ SafeArea A안 적용
    >
      {/* 헤더 - X 버튼 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>병충해 분석</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sub}>식물: {plant?.nickname || plant?.species_label_ko || '이름 없음'}</Text>

        {/* ---------------- 사진 미리보기 ---------------- */}
        <View style={styles.previewBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImg} />
          ) : (
            <Text style={styles.previewText}>촬영된 잎 사진이 없습니다.</Text>
          )}
        </View>

        {/* ---------------- 촬영 버튼 ---------------- */}
        <TouchableOpacity
          style={[styles.cameraBtn, isAnalyzing && styles.disabledBtn]}
          onPress={takeLeafPhoto}
          disabled={isAnalyzing}
        >
          <Text style={styles.cameraBtnText}>
            {isAnalyzing ? "분석 중..." : "잎 사진 촬영하기"}
          </Text>
        </TouchableOpacity>

        {/* ---------------- 분석 중 로딩 ---------------- */}
        {isAnalyzing && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#8CCB7F" />
            <Text style={styles.loadingText}>AI가 병충해를 분석하고 있습니다...</Text>
          </View>
        )}

        {/* ---------------- 분석 결과 ---------------- */}
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

        {/* ---------------- 안내 메시지 ---------------- */}
        {!imageUri && !isAnalyzing && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>병충해 분석 안내</Text>
            <Text style={styles.infoText}>
              식물의 잎사귀를 촬영하면 AI가 자동으로 병충해를 분석합니다.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------- 스타일 ------------------- */
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0"
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "bold"
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center"
  },

  closeButtonText: {
    fontSize: 24,
    color: "#666",
    fontWeight: "300"
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,   // ★ 좌우 여백
    paddingTop: 20,
    backgroundColor: "#FAFAFA"
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 5
  },

  sub: {
    fontSize: 15,
    marginBottom: 20,
    color: "#777"
  },

  previewBox: {
    width: "60%",
    aspectRatio: 1,  // 정사각형
    backgroundColor: "#EEE",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    alignSelf: "center"  // 중앙 정렬
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

  disabledBtn: {
    backgroundColor: "#CCC",
    opacity: 0.6
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
    fontSize: 15,
    color: "#555"
  },

  resultBox: {
    backgroundColor: "#E8F5E9",
    padding: 20,
    borderRadius: 12,
    marginBottom: 25,
    borderWidth: 2,
    borderColor: "#8CCB7F"
  },

  resultTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#2E7D32"
  },

  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },

  resultLabel: {
    fontSize: 15,
    color: "#555",
    fontWeight: "600"
  },

  resultValue: {
    fontSize: 15,
    color: "#2E7D32",
    fontWeight: "bold"
  },

  infoBox: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 12
  },

  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10
  },

  infoText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 20
  }
});
