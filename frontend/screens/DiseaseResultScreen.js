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
  Modal,
  Platform
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

/* 공통 컴포넌트 */
import ImagePickerModal from "../components/ImagePickerModal";

/* 디자인 시스템 */
import { COLORS, SPACING, SHADOWS, TYPOGRAPHY, RADIUS, OPACITY, TOUCH_TARGET } from "../constants/theme";

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
    console.error("leafPhoto meta 저장 오류:", error);
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
      if (Platform.OS === "web") {
        window.alert("카메라 권한을 허용해주세요.");
      } else {
        Alert.alert("권한 필요", "카메라 권한을 허용해주세요.");
      }
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
      if (Platform.OS === "web") {
        window.alert("식물 정보가 없습니다.");
      } else {
        Alert.alert("오류", "식물 정보가 없습니다.");
      }
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

      if (Platform.OS === "web") {
        window.alert(
          `분석 완료\n진단: ${analysis.disease}\n신뢰도: ${(analysis.aiResult.confidence * 100).toFixed(1)}%`
        );
      } else {
        Alert.alert(
          "분석 완료",
          `진단: ${analysis.disease}\n신뢰도: ${(analysis.aiResult.confidence * 100).toFixed(1)}%`
        );
      }
    } catch (error) {
      console.error("AI 분석 오류:", error);

      if (Platform.OS === "web") {
        window.alert(error.message || "분석 실패");
      } else {
        Alert.alert("오류", error.message || "분석 실패");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>병충해 분석</Text>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeText}>✕</Text>
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
        <TouchableOpacity
          style={styles.cameraBtn}
          onPress={openPicker}
          activeOpacity={OPACITY.active}
        >
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
      <ImagePickerModal
        visible={pickerVisible}
        onClose={closePicker}
        onCamera={pickFromCamera}
        onGallery={pickFromGallery}
      />
    </SafeAreaView>
  );
}

/* 스타일 */
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.base
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text.primary
  },
  closeBtn: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.round,
    justifyContent: "center",
    alignItems: "center"
  },
  closeText: {
    fontSize: 26,
    color: COLORS.text.tertiary
  },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg
  },
  sub: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.lg
  },
  previewBox: {
    width: "70%",
    aspectRatio: 1.2,
    alignSelf: "center",
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.xl,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg
  },
  previewImg: {
    width: "100%",
    height: "100%",
    borderRadius: RADIUS.xl,
    resizeMode: "cover"
  },
  previewText: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.tertiary
  },
  cameraBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.base,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xl,
    minHeight: TOUCH_TARGET.comfortable,
    ...SHADOWS.sm
  },
  cameraBtnText: {
    ...TYPOGRAPHY.button,
    textAlign: "center",
    color: COLORS.text.inverse
  },
  loadingBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xxl,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    marginBottom: SPACING.xl,
    ...SHADOWS.sm
  },
  loadingText: {
    ...TYPOGRAPHY.small,
    marginTop: SPACING.base,
    color: COLORS.text.secondary
  },
  resultBox: {
    backgroundColor: "#E8F5E9",
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary
  },
  resultTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.base
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.md
  },
  resultLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    fontWeight: "600"
  },
  resultValue: {
    ...TYPOGRAPHY.small,
    color: "#2E7D32",
    fontWeight: "bold"
  }
});
