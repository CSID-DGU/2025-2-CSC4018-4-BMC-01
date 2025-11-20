/*
  파일명: PlantDetailScreen.js
  기능: 화분 상세 정보 + 물 준 날짜 수정 + 삭제 + 분석 + 수정
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
  Modal,
  ActivityIndicator
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

/* Services */
import userPlantService from "../src/services/userPlantService";

export default function PlantDetailScreen({ navigation, route }) {
  const plant = route.params?.plant;
  const [currentPlant, setCurrentPlant] = useState(plant);
  const [showPicker, setShowPicker] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);

  // route.params가 변경될 때 currentPlant 업데이트
  useEffect(() => {
    if (route.params?.plant) {
      setCurrentPlant(route.params.plant);
    }
  }, [route.params?.plant]);

  if (!currentPlant) return null;

  /* ---------------- 최근 물 준 날짜 변경 ---------------- */
  const onChangeDate = async (event, selected) => {
    setShowPicker(false);
    if (!selected) return;

    const y = selected.getFullYear();
    const m = ("0" + (selected.getMonth() + 1)).slice(-2);
    const d = ("0" + selected.getDate()).slice(-2);
    const newWater = `${y}-${m}-${d}`;

    try {
      // 백엔드에서 물주기 업데이트 (next_watering은 자동 계산됨)
      await userPlantService.updatePlant(currentPlant.id, {
        last_watered: newWater
      });

      // 프론트엔드 상태 업데이트 (next_watering 계산)
      const cycle = currentPlant.watering_cycle || 7;
      const next = new Date(selected);
      next.setDate(next.getDate() + cycle);

      const ny = next.getFullYear();
      const nm = ("0" + (next.getMonth() + 1)).slice(-2);
      const nd = ("0" + next.getDate()).slice(-2);
      const newNext = `${ny}-${nm}-${nd}`;

      const updated = {
        ...currentPlant,
        last_watered: newWater,
        next_watering: newNext
      };

      setCurrentPlant(updated);
    } catch (error) {
      console.error("물주기 업데이트 오류:", error);
      Alert.alert("업데이트 실패", "물주기 날짜 업데이트에 실패했습니다.");
    }
  };

  /* ---------------- 삭제 ---------------- */
  const handleDelete = async () => {
    // 웹 환경에서는 window.confirm 사용
    if (Platform.OS === 'web') {
      const confirmed = window.confirm("정말 삭제하시겠습니까?");

      if (!confirmed) {
        return;
      }

      try {
        await userPlantService.deletePlant(currentPlant.id);
        window.alert("화분이 삭제되었습니다.");
        navigation.goBack();
      } catch (error) {
        console.error("삭제 오류:", error);
        window.alert("화분 삭제에 실패했습니다: " + (error.message || ""));
      }
    } else {
      // 모바일 환경에서는 Alert.alert 사용
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
              } catch (error) {
                console.error("삭제 오류:", error);
                Alert.alert("삭제 실패", error.message || "화분 삭제에 실패했습니다.");
              }
            }
          }
        ]
      );
    }
  };

  /* ---------------- 이미지 영구 저장 (PlantEditorScreen과 동일) ---------------- */
  const saveImagePermanently = async (tempUri) => {
    if (Platform.OS === 'web') {
      try {
        const response = await fetch(tempUri);
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('웹 이미지 변환 실패:', error);
        return tempUri;
      }
    }

    try {
      const fileName = `plant_${Date.now()}.jpg`;
      const permanentUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: tempUri, to: permanentUri });
      return permanentUri;
    } catch (error) {
      console.error('이미지 저장 실패:', error);
      return tempUri;
    }
  };

  /* ---------------- 갤러리에서 사진 선택 ---------------- */
  const pickFromGallery = async () => {
    setImagePickerVisible(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled) {
      await updatePlantImage(result.assets[0].uri);
    }
  };

  /* ---------------- 카메라로 사진 촬영 ---------------- */
  const takePhoto = async () => {
    setImagePickerVisible(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "카메라 권한을 허용해주세요!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled) {
      await updatePlantImage(result.assets[0].uri);
    }
  };

  /* ---------------- 사진 업데이트 ---------------- */
  const updatePlantImage = async (newImageUri) => {
    setIsUpdatingImage(true);
    try {
      // 이미지 영구 저장
      const permanentUri = await saveImagePermanently(newImageUri);

      // DB 업데이트
      await userPlantService.updatePlant(currentPlant.id, {
        image: permanentUri
      });

      // 상태 업데이트
      setCurrentPlant({
        ...currentPlant,
        image: permanentUri
      });

      if (Platform.OS === 'web') {
        window.alert("사진이 변경되었습니다.");
      } else {
        Alert.alert("완료", "사진이 변경되었습니다.");
      }
    } catch (error) {
      console.error("사진 업데이트 오류:", error);
      if (Platform.OS === 'web') {
        window.alert("사진 변경에 실패했습니다: " + (error.message || ""));
      } else {
        Alert.alert("오류", "사진 변경에 실패했습니다.");
      }
    } finally {
      setIsUpdatingImage(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      {/* 헤더 - X 버튼 */}
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
        contentContainerStyle={{ paddingBottom: 40 }}
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
        <Text style={styles.name}>{currentPlant.nickname || currentPlant.species_label_ko || '이름 없음'}</Text>

        {/* ----------- 최근 물 준 날짜 ----------- */}
        <TouchableOpacity
          style={styles.infoBox}
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.infoTitle}>최근 물 준 날짜</Text>
          <Text style={[styles.infoValue, { color: "#3A7AFE" }]}>
            {currentPlant.last_watered || "기록 없음"}  (눌러서 수정)
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
            display="default"
            onChange={onChangeDate}
          />
        )}

        {/* ----------- 다음 물 날짜 ----------- */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>다음 물 주는 날</Text>
          <Text style={styles.infoValue}>
            {currentPlant.next_watering || "미정"}
          </Text>
        </View>

        {/* ----------- 버튼 영역 ----------- */}
        <View style={styles.btnArea}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#7BA4F4" }]}
            onPress={() => setImagePickerVisible(true)}
            disabled={isUpdatingImage}
          >
            <Text style={styles.btnText}>
              {isUpdatingImage ? "업데이트 중..." : "사진 수정"}
            </Text>
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

        {/* ----------- 관리 정보 (관리 정보가 있을 때만) ----------- */}
        {(currentPlant.tempmax_celsius || currentPlant.tempmin_celsius || currentPlant.light_info || currentPlant.watering_info) && (
          <View style={styles.infoSection}>
            <Text style={styles.infoSectionTitle}>🌱 식물 관리 정보</Text>

            {(currentPlant.tempmax_celsius || currentPlant.tempmin_celsius) && (
              <View style={styles.careInfoBox}>
                <Text style={styles.careInfoLabel}>적정 온도:</Text>
                <Text style={styles.careInfoValue}>
                  {currentPlant.tempmin_celsius}°C ~ {currentPlant.tempmax_celsius}°C
                </Text>
              </View>
            )}

            {currentPlant.light_info && (
              <View style={styles.careInfoBox}>
                <Text style={styles.careInfoLabel}>빛 조건:</Text>
                <Text style={styles.careInfoValue}>{currentPlant.light_info}</Text>
              </View>
            )}

            {currentPlant.watering_info && (
              <View style={styles.careInfoBox}>
                <Text style={styles.careInfoLabel}>물주기:</Text>
                <Text style={styles.careInfoValue}>{currentPlant.watering_info}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ----------- 사진 선택 모달 ----------- */}
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
              <Text style={styles.modalButtonText}>🖼️ 갤러리에서 선택</Text>
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

/* ---------------- 스타일 ---------------- */
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
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: "#FAFAFA"
  },

  imageBox: {
    width: "60%",
    aspectRatio: 1,  // 정사각형
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 20,
    alignSelf: "center"  // 중앙 정렬
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
  },

  careInfoBox: {
    marginTop: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8"
  },

  careInfoLabel: {
    fontSize: 14,
    color: "#888",
    marginBottom: 4
  },

  careInfoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500"
  },

  /* ----- 모달 스타일 ----- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center"
  },

  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 25,
    width: "80%",
    maxWidth: 350
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center"
  },

  modalButton: {
    backgroundColor: "#8CCB7F",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12
  },

  modalButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center"
  },

  modalCancelButton: {
    backgroundColor: "#E0E0E0"
  },

  modalCancelText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center"
  }
});
