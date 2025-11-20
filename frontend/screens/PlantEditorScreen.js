/*
  파일명: PlantEditorScreen.js
  기능: 새 화분 추가 (자동 모달 → AI 분석 → 이름 입력 → 저장)
  플로우:
  1. 화면 진입 시 자동으로 갤러리/카메라 선택 모달 표시
  2. 이미지 선택 완료 → 자동 AI 분석
  3. 분석 결과 팝업 → 이름 입력 UI
  4. 저장 버튼 클릭 → DB에 저장
*/

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

/* AI Service */
import { analyzeSpecies } from "../src/services/aiService";
import userPlantService from "../src/services/userPlantService";

export default function PlantEditorScreen({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [imageFileName, setImageFileName] = useState(null); // 원본 파일명 저장
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [nickname, setNickname] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /* ------------------- 화면 진입 시 자동 모달 표시 ------------------- */
  useEffect(() => {
    // 약간의 딜레이 후 모달 표시 (자연스러운 UX)
    const timer = setTimeout(() => {
      setPickerVisible(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  /* ------------------- 이미지를 영구 저장소에 복사 ------------------- */
  const saveImagePermanently = async (tempUri) => {
    // 웹 환경에서는 base64로 변환하여 저장
    if (Platform.OS === 'web') {
      console.log('웹 환경: 이미지를 base64로 변환', tempUri);
      try {
        // blob URL을 fetch하여 base64로 변환
        const response = await fetch(tempUri);
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            console.log('base64 변환 완료:', reader.result.substring(0, 50) + '...');
            resolve(reader.result); // data:image/jpeg;base64,... 형태
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('웹 이미지 변환 실패:', error);
        return tempUri; // 실패 시 원본 URI 반환
      }
    }

    try {
      const fileName = `plant_${Date.now()}.jpg`;
      const permanentUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.copyAsync({
        from: tempUri,
        to: permanentUri
      });

      console.log('이미지 영구 저장:', permanentUri);
      return permanentUri;
    } catch (error) {
      console.error('이미지 저장 실패:', error);
      return tempUri; // 실패 시 원본 URI 반환
    }
  };

  /* ------------------- 갤러리 선택 ------------------- */
  const pickFromGallery = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.9,
    });

    if (!r.canceled) {
      const uri = r.assets[0].uri;
      const fileName = r.assets[0].fileName || 'plant_photo.jpg'; // 원본 파일명 추출

      console.log('📸 원본 파일명:', fileName);
      console.log('📸 URI:', uri);

      setImageUri(uri);
      setImageFileName(fileName);
      setPickerVisible(false);

      // 이미지 선택 완료 → 자동으로 AI 분석 시작
      await analyzeImageWithAI(uri, fileName);
    } else {
      // 취소한 경우 이전 화면으로
      setPickerVisible(false);
      navigation.goBack();
    }
  };

  /* ------------------- 카메라 촬영 ------------------- */
  const pickFromCamera = async () => {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      alert("카메라 권한을 허용해주세요!");
      return;
    }

    const r = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.9,
    });

    if (!r.canceled) {
      const uri = r.assets[0].uri;
      const fileName = r.assets[0].fileName || 'plant_photo.jpg'; // 원본 파일명 추출

      console.log('📸 원본 파일명:', fileName);
      console.log('📸 URI:', uri);

      setImageUri(uri);
      setImageFileName(fileName);
      setPickerVisible(false);

      // 이미지 선택 완료 → 자동으로 AI 분석 시작
      await analyzeImageWithAI(uri, fileName);
    } else {
      // 취소한 경우 이전 화면으로
      setPickerVisible(false);
      navigation.goBack();
    }
  };

  /* ------------------- AI 식물 종류 분석 ------------------- */
  const analyzeImageWithAI = async (uri, fileName) => {
    console.log("🔍 [AI 분석 시작]");
    console.log("📸 이미지 URI:", uri);
    console.log("📸 원본 파일명:", fileName);

    setIsAnalyzing(true);
    setAiResult(null);

    try {
      console.log("📡 API 요청 시작...");
      const result = await analyzeSpecies(uri, fileName);
      console.log("✅ API 응답 성공:", result);

      setAiResult(result);

      // AI가 판별한 한글 이름을 기본값으로 설정
      if (result.speciesLabelKo) {
        setNickname(result.speciesLabelKo);
        console.log("🌱 식물명 설정:", result.speciesLabelKo);
      }

      // 분석 완료 알림
      Alert.alert(
        "식물 종류 판별 완료! 🌱",
        `식물: ${result.speciesLabelKo}\n영문명: ${result.speciesLabel}\n신뢰도: ${(result.confidence * 100).toFixed(1)}%\n\n아래에서 화분 이름을 수정하실 수 있습니다.`,
        [{ text: "확인" }]
      );
    } catch (error) {
      console.error("❌ AI 분석 오류:", error);
      console.error("❌ 에러 상세:", error.message);
      console.error("❌ 에러 전체:", JSON.stringify(error, null, 2));

      Alert.alert(
        "분석 실패",
        `오류: ${error.message || "식물 분석에 실패했습니다."}\n\n서버가 실행 중인지 확인해주세요.`,
        [
          {
            text: "다시 시도",
            onPress: () => setPickerVisible(true),
          },
          {
            text: "취소",
            onPress: () => navigation.goBack(),
            style: "cancel",
          },
        ]
      );
    } finally {
      console.log("🏁 [AI 분석 종료]");
      setIsAnalyzing(false);
    }
  };

  /* ------------------- 저장 ------------------- */
  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert("알림", "화분 이름을 입력해주세요!");
      return;
    }

    if (!aiResult) {
      Alert.alert("오류", "AI 분석 결과가 없습니다.");
      return;
    }

    setIsSaving(true);

    try {
      // plant_id 결정: AI가 DB에서 찾은 경우 해당 ID, 아니면 null
      const plantId = aiResult.plantInfo?.plant_id || null;
      const wateringCycle = aiResult.plantInfo?.watering_days || 7;

      // 이미지를 영구 저장소에 복사
      const permanentImageUri = await saveImagePermanently(imageUri);

      // 백엔드 API로 저장
      await userPlantService.addPlant(
        plantId,
        nickname,
        permanentImageUri,
        aiResult.speciesLabel,
        aiResult.speciesLabelKo,
        wateringCycle
      );

      // 저장 성공 - 알림 표시하고 화면 닫기
      Alert.alert("저장 완료", "새 화분이 추가되었습니다!");

      // 화면 닫기
      setTimeout(() => {
        navigation.goBack();
      }, 100);

    } catch (error) {
      console.error("저장 오류:", error);
      Alert.alert("저장 실패", error.message || "화분 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  /* ------------------- 취소 버튼 (모달에서) ------------------- */
  const handleCancel = () => {
    setPickerVisible(false);
    navigation.goBack();
  };

  /* ------------------- UI ------------------- */
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
      edges={["top", "bottom", "left", "right"]}
    >
      {/* 헤더 - X 버튼 */}
      <View style={styles.header}>
        <Text style={styles.title}>새 화분 추가</Text>
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

        {/* ---------------- 이미지 미리보기 ---------------- */}
        {imageUri && (
          <View style={styles.imageBox}>
            <Image source={{ uri: imageUri }} style={styles.image} />
          </View>
        )}

        {/* ---------------- 분석 중 로딩 ---------------- */}
        {isAnalyzing && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>AI가 식물을 분석하고 있습니다...</Text>
          </View>
        )}

        {/* ---------------- AI 분석 결과 ---------------- */}
        {aiResult && !isAnalyzing && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>분석 결과</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>식물:</Text>
              <Text style={styles.resultValue}>{aiResult.speciesLabelKo}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>영문명:</Text>
              <Text style={styles.resultValue}>{aiResult.speciesLabel}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>신뢰도:</Text>
              <Text style={styles.resultValue}>
                {(aiResult.confidence * 100).toFixed(1)}%
              </Text>
            </View>
            {aiResult.plantInfo && (
              <>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>물주기 주기:</Text>
                  <Text style={styles.resultValue}>
                    {aiResult.plantInfo.watering_days}일
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* ---------------- 이름 입력 ---------------- */}
        {aiResult && !isAnalyzing && (
          <>
            <Text style={styles.label}>화분 이름</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="예: 거실 앵초"
              editable={!isSaving}
            />

            {/* ---------------- 저장 버튼 ---------------- */}
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.disabledBtn]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <View style={styles.savingContainer}>
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

      {/* ---------------- 로딩 모달 (전체 화면) ---------------- */}
      <Modal
        visible={isAnalyzing}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingModalOverlay}>
          <View style={styles.loadingModalBox}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingModalText}>AI가 식물을 분석하고 있습니다...</Text>
            <Text style={styles.loadingModalSubText}>10초 정도 소요됩니다</Text>
          </View>
        </View>
      </Modal>

      {/* ---------------- 카메라/갤러리 선택 모달 ---------------- */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>식물 사진 선택</Text>

            <TouchableOpacity style={styles.modalBtn} onPress={pickFromGallery}>
              <Text style={styles.modalText}>갤러리에서 선택</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtn} onPress={pickFromCamera}>
              <Text style={styles.modalText}>카메라로 촬영</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, styles.cancelBtn]}
              onPress={handleCancel}
            >
              <Text style={[styles.modalText, styles.cancelText]}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: "#FAFAFA"
  },

  title: {
    fontSize: 24,
    fontWeight: "bold"
  },

  imageBox: {
    width: "100%",
    height: 250,
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 20
  },

  image: {
    width: "100%",
    height: "100%"
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
    backgroundColor: "#E3F2FD",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#4A90E2"
  },

  resultTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#1565C0"
  },

  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },

  resultLabel: {
    fontSize: 15,
    color: "#555",
    fontWeight: "600"
  },

  resultValue: {
    fontSize: 15,
    color: "#1976D2",
    fontWeight: "bold"
  },

  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333"
  },

  input: {
    width: "100%",
    padding: 15,
    borderWidth: 1,
    borderColor: "#CCC",
    backgroundColor: "#FFF",
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 20
  },

  saveBtn: {
    backgroundColor: "#8CCB7F",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center"
  },

  disabledBtn: {
    backgroundColor: "#CCC",
    opacity: 0.6
  },

  savingContainer: {
    flexDirection: "row",
    alignItems: "center"
  },

  saveBtnText: {
    textAlign: "center",
    color: "#FFF",
    fontSize: 17,
    fontWeight: "bold"
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center"
  },

  modalBox: {
    width: "80%",
    backgroundColor: "#FFF",
    padding: 25,
    borderRadius: 15
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333"
  },

  modalBtn: {
    backgroundColor: "#8CCB7F",
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 12
  },

  cancelBtn: {
    backgroundColor: "#DDD"
  },

  modalText: {
    textAlign: "center",
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16
  },

  cancelText: {
    color: "#333"
  },

  loadingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center"
  },

  loadingModalBox: {
    width: "80%",
    backgroundColor: "#FFF",
    padding: 40,
    borderRadius: 20,
    alignItems: "center"
  },

  loadingModalText: {
    marginTop: 20,
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
    textAlign: "center"
  },

  loadingModalSubText: {
    marginTop: 10,
    fontSize: 14,
    color: "#777",
    textAlign: "center"
  }
});
