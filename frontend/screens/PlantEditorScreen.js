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

/* AI 분석 서비스 */
import { analyzeSpecies } from "../src/services/aiService";
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

  /* 화면 진입 시 자동 사진 선택 모달 */
  useEffect(() => {
    const t = setTimeout(() => setPickerVisible(true), 250);
    return () => clearTimeout(t);
  }, []);

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
      navigation.goBack();
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
      navigation.goBack();
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

      if (res?.speciesLabelKo) setNickname(res.speciesLabelKo);

      Alert.alert(
        "분석 완료",
        `식물: ${res.speciesLabelKo}\n신뢰도: ${(res.confidence * 100).toFixed(1)}%`
      );
    } catch (error) {
      console.error("❌ AI 분석 오류:", error);
      console.error("❌ message:", error.message);
      console.error("❌ full:", JSON.stringify(error, null, 2));

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
        aiResult?.plantInfo?.watering_days != null
          ? aiResult.plantInfo.watering_days
          : 7;

      const savedUri = await saveImagePermanently(imageUri);

      const saved = await userPlantService.addPlant(
        aiResult.plantInfo?.plant_id || null,
        nickname,
        savedUri,
        aiResult.speciesLabel,
        aiResult.speciesLabelKo,
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
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* 이미지 미리보기 */}
        {imageUri && (
          <View style={styles.imageBox}>
            <Image source={{ uri: imageUri }} style={styles.previewImg} />
          </View>
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
              <Text style={styles.rowValue}>{aiResult.speciesLabelKo}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>신뢰도</Text>
              <Text style={styles.rowValue}>
                {(aiResult.confidence * 100).toFixed(1)}%
              </Text>
            </View>

            {aiResult.plantInfo?.watering_days != null && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>물주기</Text>
                <Text style={styles.rowValue}>
                  {aiResult.plantInfo.watering_days}일
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
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => navigation.goBack()}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>사진 선택</Text>

            <TouchableOpacity style={styles.modalBtn} onPress={pickFromGallery}>
              <Text style={styles.modalBtnText}>갤러리 선택</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtn} onPress={pickFromCamera}>
              <Text style={styles.modalBtnText}>카메라 촬영</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, styles.modalCancel]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.modalCancelText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0"
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold"
  },
  headerClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center"
  },
  imageBox: {
    width: "100%",
    height: 250,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 20
  },
  previewImg: {
    width: "100%",
    height: "100%"
  },
  loadingBox: {
    backgroundColor: "#FFF",
    padding: 25,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#555"
  },
  resultBox: {
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#4A90E2",
    marginBottom: 20
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 12
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6
  },
  rowLabel: {
    color: "#555",
    fontWeight: "600"
  },
  rowValue: {
    color: "#1976D2",
    fontWeight: "bold"
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8
  },
  input: {
    width: "100%",
    padding: 14,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: "#CCC",
    backgroundColor: "#FFF",
    marginBottom: 20,
    fontSize: 16
  },
  saveBtn: {
    backgroundColor: "#8CCB7F",
    paddingVertical: 14,
    borderRadius: 10
  },
  saveBtnDisabled: {
    backgroundColor: "#AAA"
  },
  saveBtnText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalBox: {
    width: "80%",
    backgroundColor: "#FFF",
    padding: 25,
    borderRadius: 15
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 18,
    textAlign: "center"
  },
  modalBtn: {
    backgroundColor: "#8CCB7F",
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12
  },
  modalBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center"
  },
  modalCancel: {
    backgroundColor: "#DDD"
  },
  modalCancelText: {
    textAlign: "center",
    color: "#333",
    fontWeight: "600"
  }
});
