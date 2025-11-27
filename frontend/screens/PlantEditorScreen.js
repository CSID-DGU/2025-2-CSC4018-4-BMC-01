/*
  파일명: PlantEditorScreen.js
  기능:
    - 새 화분 등록
    - 사진 선택(갤러리/카메라)
    - AI 분석 결과 표시
    - WateringPeriod 자동 설정
    - 이미지 영구 저장(web/mobile)
    - addPlant API + 메타데이터 저장
*/

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  Platform
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

/* 공통 컴포넌트 */
import ImagePickerModal from "../components/ImagePickerModal";

/* AI 분석 서비스 */
import { analyzeSpecies } from "../src/services/aiService";

/* 디자인 시스템 */
import { COLORS, SPACING, SHADOWS, TYPOGRAPHY, RADIUS, OPACITY, TOUCH_TARGET } from "../constants/theme";
/* API */
import userPlantService from "../src/services/userPlantService";

/* Storage.js (이미지 저장/메타 저장) */
import {
  generatePlantImageName,
  saveImageToStorage,
  loadMeta,
  saveMeta
} from "../utils/Storage";

export default function PlantEditorScreen({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [imageFileName, setImageFileName] = useState(null);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const [nickname, setNickname] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /* -------------------------------------------------------------
      이미지 영구 저장 처리
      - 웹: base64
      - 모바일: documentDirectory로 복사
  ------------------------------------------------------------- */
  const saveImagePermanently = async (tempUri) => {
    if (Platform.OS === "web") {
      try {
        const res = await fetch(tempUri);
        const blob = await res.blob();

        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error("웹 이미지 변환 실패:", e);
        return tempUri;
      }
    }

    try {
      const name = generatePlantImageName();
      const saved = await saveImageToStorage(tempUri, name);
      return saved;
    } catch (e) {
      console.error("모바일 이미지 저장 실패:", e);
      return tempUri;
    }
  };

  /* -------------------------------------------------------------
      갤러리 선택
  ------------------------------------------------------------- */
  const pickFromGallery = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.9
    });

    if (r.canceled) {
      setPickerVisible(false);
      return;
    }

    const uri = r.assets[0].uri;
    const f = r.assets[0].fileName || "plant_photo.jpg";

    setImageUri(uri);
    setImageFileName(f);
    setPickerVisible(false);

    await analyzeImage(uri, f);
  };

  /* -------------------------------------------------------------
      카메라 촬영
  ------------------------------------------------------------- */
  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "카메라 권한을 허용해주세요.");
      return;
    }

    const r = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.9
    });

    if (r.canceled) {
      setPickerVisible(false);
      return;
    }

    const uri = r.assets[0].uri;
    const f = r.assets[0].fileName || "plant_photo.jpg";

    setImageUri(uri);
    setImageFileName(f);
    setPickerVisible(false);

    await analyzeImage(uri, f);
  };

  /* -------------------------------------------------------------
      AI 분석 처리
  ------------------------------------------------------------- */
  const analyzeImage = async (uri, fileName) => {
    setIsAnalyzing(true);
    setAiResult(null);

    try {
      const res = await analyzeSpecies(uri, fileName);
      setAiResult(res);

      if (res?.aiLabelKo) setNickname(res.aiLabelKo);

      Alert.alert(
        "분석 완료",
        `식물: ${res.aiLabelKo}\n신뢰도: ${(res.confidence * 100).toFixed(1)}%`
      );
    } catch (error) {
      console.error("AI 분석 오류:", error);

      Alert.alert(
        "분석 실패",
        error.message || "분석 중 오류 발생",
        [
          { text: "다시 선택", onPress: () => setPickerVisible(true) },
          { text: "닫기", style: "cancel", onPress: () => navigation.goBack() }
        ]
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* -------------------------------------------------------------
      저장 처리
      - WateringPeriod 자동 설정
      - 이미지 저장
      - addPlant API
      - 메타 저장(favorite, WateringPeriod)
  ------------------------------------------------------------- */
  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert("이름 입력", "화분 이름을 입력해주세요.");
      return;
    }
    if (!aiResult) {
      Alert.alert("오류", "AI 분석 결과가 없습니다.");
      return;
    }

    setIsSaving(true);

    try {
      const WateringPeriod =
        aiResult?.plantInfo?.wateringperiod != null
          ? aiResult.plantInfo.wateringperiod
          : 7;

      const savedUri = await saveImagePermanently(imageUri);

      const saved = await userPlantService.addPlant(
        aiResult.plantInfo?.plant_id || null,
        nickname,
        savedUri,
        aiResult.aiLabelEn,
        aiResult.aiLabelKo,
        WateringPeriod
      );

      let newId = saved?.id;

      const meta = await loadMeta();
      meta[newId] = {
        favorite: false,
        WateringPeriod
      };
      await saveMeta(meta);

      Alert.alert("등록 완료", "새 화분이 추가되었습니다.");
      navigation.goBack();
    } catch (err) {
      console.error("저장 오류:", err);
      Alert.alert("오류", err.message || "저장 실패");
    } finally {
      setIsSaving(false);
    }
  };

  /* -------------------------------------------------------------
      UI
  ------------------------------------------------------------- */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>새 화분 추가</Text>
        <TouchableOpacity
          style={styles.headerClose}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ fontSize: 22 }}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg }}
        contentContainerStyle={{ paddingBottom: SPACING.xxxl }}
      >
        {/* 이미지 미리보기 */}
        <View style={styles.imageBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImg} />
          ) : (
            <Text style={styles.previewPlaceholder}>꽃 사진을 선택해주세요.</Text>
          )}
        </View>

        {/* 사진 촬영/선택 버튼 */}
        {!imageUri && !isAnalyzing && (
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={() => setPickerVisible(true)}
            activeOpacity={OPACITY.active}
          >
            <Text style={styles.cameraBtnText}>꽃 사진 촬영 / 선택</Text>
          </TouchableOpacity>
        )}

        {/* 분석 로딩 */}
        {isAnalyzing && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>AI 분석 중...</Text>
          </View>
        )}

        {/* 분석 결과 */}
        {aiResult && !isAnalyzing && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>분석 결과</Text>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>식물명</Text>
              <Text style={styles.rowValue}>{aiResult.aiLabelKo}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>신뢰도</Text>
              <Text style={styles.rowValue}>
                {(aiResult.confidence * 100).toFixed(1)}%
              </Text>
            </View>

            {aiResult.plantInfo?.wateringperiod != null && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>물 주는 주기</Text>
                <Text style={styles.rowValue}>
                  {aiResult.plantInfo.wateringperiod}일
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 이름 입력 */}
        {aiResult && !isAnalyzing && (
          <>
            <Text style={styles.label}>화분 이름</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="예: 거실 화분"
              editable={!isSaving}
            />

            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={OPACITY.active}
            >
              {isSaving ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.saveBtnText}> 저장 중...</Text>
                </View>
              ) : (
                <Text style={styles.saveBtnText}>저장하기</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* 사진 선택 모달 */}
      <ImagePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onCamera={pickFromCamera}
        onGallery={pickFromGallery}
      />
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------
    스타일
------------------------------------------------------------- */
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.base
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text.primary
  },
  headerClose: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.round,
    justifyContent: "center",
    alignItems: "center"
  },
  imageBox: {
    width: "70%",
    aspectRatio: 1.2,
    alignSelf: "center",
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    marginBottom: SPACING.lg,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center"
  },
  previewImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  previewPlaceholder: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: "center"
  },
  cameraBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: "center",
    marginBottom: SPACING.lg,
    minHeight: TOUCH_TARGET.comfortable,
    justifyContent: "center"
  },
  cameraBtnText: {
    ...TYPOGRAPHY.body,
    color: "#FFF",
    fontWeight: "600"
  },
  loadingBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    marginBottom: SPACING.lg,
    ...SHADOWS.sm
  },
  loadingText: {
    ...TYPOGRAPHY.small,
    marginTop: SPACING.md,
    color: COLORS.text.secondary
  },
  resultBox: {
    backgroundColor: "#E3F2FD",
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 2,
    borderColor: COLORS.info,
    marginBottom: SPACING.lg
  },
  resultTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.md
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm
  },
  rowLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    fontWeight: "600"
  },
  rowValue: {
    ...TYPOGRAPHY.small,
    color: COLORS.info,
    fontWeight: "bold"
  },
  label: {
    ...TYPOGRAPHY.body,
    fontWeight: "600",
    color: COLORS.text.primary,
    marginBottom: SPACING.sm
  },
  input: {
    width: "100%",
    ...TYPOGRAPHY.body,
    padding: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.lg,
    minHeight: TOUCH_TARGET.comfortable
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    minHeight: TOUCH_TARGET.comfortable,
    ...SHADOWS.sm
  },
  saveBtnDisabled: {
    backgroundColor: COLORS.text.disabled,
    opacity: OPACITY.disabled
  },
  saveBtnText: {
    ...TYPOGRAPHY.button,
    textAlign: "center",
    color: COLORS.text.inverse
  }
});
