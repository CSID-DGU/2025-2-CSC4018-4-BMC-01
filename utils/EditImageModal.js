/*
  파일명: EditImageModal.js
  기능: 등록된 식물의 사진을 수정하는 모달창
  수정내용:
    - (2025.11.12) 사진 선택/촬영 기능 미작동 오류 수정
    - (2025.11.12) AsyncStorage 연동 정상화
    - (2025.11.12) 기존 구조 및 주석 유지
*/

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { updatePlant } from "./storage";

export default function EditImageModal({ visible, plant, onClose }) {
  const [preview, setPreview] = useState(plant?.image || null);

  /*
    기능: 카메라로 사진 촬영
  */
  const handleCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted")
        return Alert.alert("권한 필요", "카메라 접근 권한을 허용해주세요.");

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setPreview(result.assets[0].uri);
      }
    } catch (e) {
      console.error("[카메라 오류]", e);
    }
  };

  /*
    기능: 갤러리에서 사진 선택
  */
  const handlePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted")
        return Alert.alert("권한 필요", "갤러리 접근 권한을 허용해주세요.");

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // ✅ 최신 문법 적용
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setPreview(result.assets[0].uri);
      }
    } catch (e) {
      console.error("[갤러리 선택 오류]", e);
    }
  };

  /*
    기능: 선택한 사진을 저장하고 모달 닫기
  */
  const handleSave = async () => {
    try {
      if (!preview) return Alert.alert("알림", "변경할 사진을 선택해주세요.");
      await updatePlant({ ...plant, image: preview });
      Alert.alert("사진 변경 완료", "화분 사진이 수정되었습니다.");
      onClose(); // ✅ 모달 닫기 + 부모 새로고침 트리거
    } catch (e) {
      console.error("[사진 업데이트 오류]", e);
    }
  };

  /*
    렌더링
  */
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.title}>사진 편집</Text>

          {/* 미리보기 */}
          {preview ? (
            <Image source={{ uri: preview }} style={styles.preview} />
          ) : (
            <View style={styles.previewBox}>
              <Text style={{ color: "#999" }}>사진 미리보기</Text>
            </View>
          )}

          {/* 버튼 그룹 */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#6FCF97" }]}
              onPress={handleCamera}
            >
              <Text style={styles.btnText}>📷 촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#56CCF2" }]}
              onPress={handlePick}
            >
              <Text style={styles.btnText}>🖼 선택</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#27AE60" }]}
              onPress={handleSave}
            >
              <Text style={styles.btnText}>저장</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#EB5757" }]}
              onPress={onClose}
            >
              <Text style={styles.btnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/*
  스타일 정의
*/
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    width: "85%",
    borderRadius: 15,
    paddingVertical: 20,
    alignItems: "center",
    elevation: 5,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 10, color: "#333" },
  preview: {
    width: "85%",
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#eee",
  },
  previewBox: {
    width: "85%",
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "85%",
    marginBottom: 10,
  },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, marginHorizontal: 5 },
  btnText: { color: "#fff", fontWeight: "700", textAlign: "center" },
});
