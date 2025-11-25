/*
  파일명: PlantDetailScreen.js
  목적:
    - 특정 화분(plant)의 상세 정보를 보여주는 화면
    - 최근 물 준 날짜 수정 기능
    - 다음 물 주는 날짜 자동 계산 (WateringPeriod 반영)
    - 사진 수정(모바일: FileSystem, 웹: Base64)
    - 삭제 기능 (웹/모바일 분기)
    - 병충해 분석 화면 이동
    - 관리 정보(온도/빛/방법/주기) 표시
    - 웹 기능은 모두 [WEB-ONLY BLOCK] 안에 묶어서 필요 시 손쉽게 비활성화 가능
*/

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Modal
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

/* 
  API 서비스
  - userPlantService.updatePlant(id, data)
  - userPlantService.deletePlant(id)
*/
import userPlantService from "../src/services/userPlantService";

export default function PlantDetailScreen({ navigation, route }) {
  /* ------------------------------------------------------------
      초기값: route.params로 전달된 plant 객체
      currentPlant는 화면에서 실시간으로 갱신되는 상태
  ------------------------------------------------------------ */
  const plant = route.params?.plant;
  const [currentPlant, setCurrentPlant] = useState(plant);

  /* 날짜 선택기 UI */
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(""); // 웹용 임시 날짜 저장

  /* 사진 선택 모달 */
  const [imagePickerVisible, setImagePickerVisible] = useState(false);

  /* 로딩 중 표시 */
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);

  /* ------------------------------------------------------------
      route.params가 변경되면 화면에 반영
      - 예: 상세 화면에서 사진/정보 수정 후 돌아올 경우
  ------------------------------------------------------------ */
  useEffect(() => {
    if (route.params?.plant) {
      setCurrentPlant(route.params.plant);
    }
  }, [route.params?.plant]);

  if (!currentPlant) return null;

  /* ------------------------------------------------------------
      [최근 물 준 날짜 수정 - 모바일]
      - DateTimePicker에서 날짜 선택
      - API updatePlant 호출
      - next_watering 자동 계산
      - WateringPeriod가 없으면 기본값 7일
  ------------------------------------------------------------ */
  const onChangeDate = async (event, selected) => {
    setShowPicker(false);
    if (!selected) return;

    const y = selected.getFullYear();
    const m = ("0" + (selected.getMonth() + 1)).slice(-2);
    const d = ("0" + selected.getDate()).slice(-2);
    const newWater = `${y}-${m}-${d}`;

    try {
      /* 백엔드에 최근 물준 날짜 기록 */
      await userPlantService.updatePlant(currentPlant.id, {
        last_watered: newWater
      });

      /* 다음 물 주는 날짜 계산 */
      const period = currentPlant.WateringPeriod || currentPlant.wateringperiod || 7; // 기본 7일
      const next = new Date(selected);
      next.setDate(next.getDate() + period);

      const ny = next.getFullYear();
      const nm = ("0" + (next.getMonth() + 1)).slice(-2);
      const nd = ("0" + next.getDate()).slice(-2);
      const nextWaterDate = `${ny}-${nm}-${nd}`;

      /*
        프론트 상태 갱신
        - 백엔드 반영 OK
        - UI도 즉시 업데이트
      */
      setCurrentPlant({
        ...currentPlant,
        last_watered: newWater,
        next_watering: nextWaterDate
      });
    } catch (error) {
      console.error("물 준 날짜 수정 실패:", error);
      Alert.alert("오류", "물 준 날짜 수정에 실패했습니다.");
    }
  };

  /* ------------------------------------------------------------
      [최근 물 준 날짜 수정 - 웹]
      - HTML input type="date" 사용
      - 모바일과 동일한 로직
  ------------------------------------------------------------ */
  const handleWebDateChange = async (dateString) => {
    if (!dateString) return;

    try {
      /* 백엔드에 최근 물준 날짜 기록 */
      await userPlantService.updatePlant(currentPlant.id, {
        last_watered: dateString
      });

      /* 다음 물 주는 날짜 계산 */
      const period = currentPlant.WateringPeriod || currentPlant.wateringperiod || 7;
      const selected = new Date(dateString);
      const next = new Date(selected);
      next.setDate(selected.getDate() + period);

      const ny = next.getFullYear();
      const nm = ("0" + (next.getMonth() + 1)).slice(-2);
      const nd = ("0" + next.getDate()).slice(-2);
      const nextWaterDate = `${ny}-${nm}-${nd}`;

      /* 프론트 상태 갱신 */
      setCurrentPlant({
        ...currentPlant,
        last_watered: dateString,
        next_watering: nextWaterDate
      });

      setShowPicker(false);
      window.alert("물 준 날짜가 수정되었습니다.");
    } catch (error) {
      console.error("물 준 날짜 수정 실패:", error);
      window.alert("물 준 날짜 수정에 실패했습니다.");
    }
  };

  /* ------------------------------------------------------------
      [삭제 기능]
      - 웹: window.confirm 사용
      - 모바일: Alert.alert 사용
      - 공통: 삭제 후 navigation.goBack()
  ------------------------------------------------------------ */
  const handleDelete = async () => {
    /* ---------------- WEB-ONLY BLOCK ---------------- */
    if (Platform.OS === "web") {
      const ok = window.confirm("정말 삭제하시겠습니까?");
      if (!ok) return;

      try {
        await userPlantService.deletePlant(currentPlant.id);
        window.alert("삭제 완료");
        navigation.goBack();
      } catch (err) {
        window.alert("삭제 실패: " + (err.message || ""));
      }
      return;
    }

    /* ---------------- MOBILE BLOCK ---------------- */
    Alert.alert(
      "삭제 확인",
      "정말 삭제하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              await userPlantService.deletePlant(currentPlant.id);
              Alert.alert("삭제 완료", "화분이 삭제되었습니다.");
              navigation.goBack();
            } catch (err) {
              Alert.alert("삭제 실패", err.message || "");
            }
          }
        }
      ]
    );
  };

  /* ------------------------------------------------------------
      [이미지 영구 저장 처리]
      - 모바일: FileSystem.documentDirectory 내부로 복사 후 경로 저장
      - 웹: FileReader로 blob → base64 변환 후 문자열 저장
  ------------------------------------------------------------ */
  const saveImagePermanently = async (tempUri) => {
    /* ---------------- WEB-ONLY BLOCK ---------------- */
    if (Platform.OS === "web") {
      try {
        const response = await fetch(tempUri);
        const blob = await response.blob();

        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        return base64;
      } catch (err) {
        console.error("웹 이미지 변환 실패:", err);
        return tempUri;
      }
    }

    /* ---------------- MOBILE BLOCK ---------------- */
    try {
      const fileName = `plant_${Date.now()}.jpg`;
      const dest = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: tempUri, to: dest });
      return dest;
    } catch (err) {
      console.error("모바일 이미지 저장 실패:", err);
      return tempUri;
    }
  };

  /* ------------------------------------------------------------
      [사진 변경 공통 로직]
      - 저장 → API updatePlant → UI 반영
  ------------------------------------------------------------ */
  const updatePlantImage = async (newUri) => {
    setIsUpdatingImage(true);

    try {
      const savedUri = await saveImagePermanently(newUri);

      await userPlantService.updatePlant(currentPlant.id, {
        image: savedUri
      });

      setCurrentPlant({
        ...currentPlant,
        image: savedUri
      });

      if (Platform.OS === "web") {
        window.alert("사진이 변경되었습니다.");
      } else {
        Alert.alert("완료", "사진이 변경되었습니다.");
      }
    } catch (err) {
      console.error("사진 변경 실패:", err);

      if (Platform.OS === "web") window.alert("사진 변경 실패");
      else Alert.alert("오류", "사진 변경에 실패했습니다.");
    } finally {
      setIsUpdatingImage(false);
    }
  };

  /* ------------------------------------------------------------
      사진 촬영 / 갤러리 선택
      - expo-image-picker 사용
  ------------------------------------------------------------ */
  const pickFromGallery = async () => {
    setImagePickerVisible(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.9
    });

    if (!result.canceled) {
      await updatePlantImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    setImagePickerVisible(false);

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "카메라 권한을 허용해주세요.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.9
    });

    if (!result.canceled) {
      await updatePlantImage(result.assets[0].uri);
    }
  };

  /* ------------------------------------------------------------
      렌더링 (UI)
  ------------------------------------------------------------ */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      
      {/* ---------------- 헤더 (닫기 버튼 포함) ---------------- */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>화분 상세</Text>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ---------------- 식물 이미지 ---------------- */}
        <View style={styles.imageBox}>
          <Image
            source={{ uri: currentPlant.image }}
            style={styles.image}
          />
        </View>

        {/* ---------------- 식물 이름 표시 ---------------- */}
        <Text style={styles.name}>
          {currentPlant.nickname ||
            currentPlant.ai_label_ko ||
            "이름 없음"}
        </Text>

        {/* ---------------- 최근 물 준 날짜 ---------------- */}
        {Platform.OS === "web" ? (
          /* ---------------- WEB-ONLY BLOCK ---------------- */
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>최근 물 준 날짜</Text>
            <TouchableOpacity onPress={() => setShowPicker(!showPicker)}>
              <Text style={[styles.infoValue, { color: "#3A7AFE" }]}>
                {currentPlant.last_watered || "기록 없음"} (클릭하여 수정)
              </Text>
            </TouchableOpacity>

            {showPicker && (
              <View style={{ marginTop: 10 }}>
                <input
                  type="date"
                  value={tempDate || currentPlant.last_watered || ""}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setTempDate(e.target.value);
                    handleWebDateChange(e.target.value);
                  }}
                  style={{
                    padding: "10px",
                    fontSize: "16px",
                    borderRadius: "8px",
                    border: "2px solid #3A7AFE",
                    width: "100%"
                  }}
                />
              </View>
            )}
          </View>
        ) : (
          /* ---------------- MOBILE BLOCK ---------------- */
          <>
            <TouchableOpacity
              style={styles.infoBox}
              onPress={() => {
                console.log("날짜 클릭됨, showPicker 상태 변경");
                setShowPicker(true);
              }}
            >
              <Text style={styles.infoTitle}>최근 물 준 날짜</Text>
              <Text style={[styles.infoValue, { color: "#3A7AFE" }]}>
                {currentPlant.last_watered || "기록 없음"} (눌러서 수정)
              </Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={
                  currentPlant.last_watered
                    ? new Date(currentPlant.last_watered)
                    : new Date()
                }
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "calendar"}
                onChange={onChangeDate}
                maximumDate={new Date()}
              />
            )}
          </>
        )}

        {/* ---------------- 다음 물 날짜 ---------------- */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>다음 물 주는 날</Text>
          <Text style={styles.infoValue}>
            {currentPlant.next_watering || "미정"}
          </Text>
        </View>

        {/* ---------------- 주요 버튼 영역 ---------------- */}
        <View style={styles.btnArea}>

          {/* 사진 수정 버튼 */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#7BA4F4" }]}
            onPress={() => setImagePickerVisible(true)}
            disabled={isUpdatingImage}
          >
            <Text style={styles.btnText}>
              {isUpdatingImage ? "업데이트 중..." : "사진 수정"}
            </Text>
          </TouchableOpacity>

          {/* 병충해 분석 화면 이동 */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#8CCB7F" }]}
            onPress={() =>
              navigation.navigate("DiseaseResult", { plant: currentPlant })
            }
          >
            <Text style={styles.btnText}>병충해 분석</Text>
          </TouchableOpacity>

          {/* 삭제 */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#E57373" }]}
            onPress={handleDelete}
          >
            <Text style={styles.btnText}>삭제</Text>
          </TouchableOpacity>
        </View>

        {/* ---------------- 식물 관리 정보 ---------------- */}
        {(currentPlant.tempmax_celsius ||
          currentPlant.tempmin_celsius ||
          currentPlant.ideallight_ko ||
          currentPlant.toleratedlight_ko ||
          currentPlant.watering_ko ||
          currentPlant.wateringperiod) && (
          <View style={styles.infoSection}>
            <Text style={styles.infoSectionTitle}>🌱 식물 관리 정보</Text>

            {/* 적정 온도 */}
            {(currentPlant.tempmax_celsius ||
              currentPlant.tempmin_celsius) && (
              <View style={styles.careInfoBox}>
                <Text style={styles.careInfoLabel}>적정 온도</Text>
                <Text style={styles.careInfoValue}>
                  {currentPlant.tempmin_celsius}°C ~{" "}
                  {currentPlant.tempmax_celsius}°C
                </Text>
              </View>
            )}

            {/* 이상적인 빛 조건 */}
            {currentPlant.ideallight_ko && (
              <View style={styles.careInfoBox}>
                <Text style={styles.careInfoLabel}>이상적인 빛 조건</Text>
                <Text style={styles.careInfoValue}>
                  {currentPlant.ideallight_ko}
                </Text>
              </View>
            )}

            {/* 견딜 수 있는 빛 조건 */}
            {currentPlant.toleratedlight_ko && (
              <View style={styles.careInfoBox}>
                <Text style={styles.careInfoLabel}>견딜 수 있는 빛 조건</Text>
                <Text style={styles.careInfoValue}>
                  {currentPlant.toleratedlight_ko}
                </Text>
              </View>
            )}

            {/* 물 주는 방법 */}
            {currentPlant.watering_ko && (
              <View style={styles.careInfoBox}>
                <Text style={styles.careInfoLabel}>물 주는 방법</Text>
                <Text style={styles.careInfoValue}>
                  {currentPlant.watering_ko}
                </Text>
              </View>
            )}

            {/* 물 주는 주기 */}
            <View style={styles.careInfoBox}>
              <Text style={styles.careInfoLabel}>물 주는 주기</Text>
              <Text style={styles.careInfoValue}>
                {currentPlant.wateringperiod || 7}일
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ---------------- 사진 선택 모달 ---------------- */}
      <Modal
        visible={imagePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImagePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>사진 변경</Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={takePhoto}
            >
              <Text style={styles.modalButtonText}>📷 사진 촬영</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={pickFromGallery}
            >
              <Text style={styles.modalButtonText}>🖼 갤러리 선택</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={() => setImagePickerVisible(false)}
            >
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------
      스타일 모음
------------------------------------------------------------ */
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
    backgroundColor: "#EFEFEF",
    justifyContent: "center",
    alignItems: "center"
  },
  closeButtonText: {
    fontSize: 22,
    color: "#444"
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20
  },
  imageBox: {
    width: "70%",
    aspectRatio: 1.2,
    alignSelf: "center",
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 20
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
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
    fontSize: 15,
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
  careInfoBox: {
    marginTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8"
  },
  careInfoLabel: {
    fontSize: 14,
    color: "#777"
  },
  careInfoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalContent: {
    backgroundColor: "#FFF",
    width: "80%",
    maxWidth: 350,
    borderRadius: 15,
    padding: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center"
  },
  modalButton: {
    backgroundColor: "#8CCB7F",
    padding: 13,
    borderRadius: 10,
    marginBottom: 12
  },
  modalButtonText: {
    color: "#FFF",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16
  },
  modalCancelButton: {
    backgroundColor: "#E0E0E0"
  },
  modalCancelText: {
    fontSize: 16,
    textAlign: "center",
    color: "#444"
  }
});
