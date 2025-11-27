/*
  파일명: ImagePickerModal.js
  목적: 공통 사진 선택 모달 컴포넌트
  - 갤러리 선택 / 카메라 촬영 통일된 UI
*/

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal
} from "react-native";

export default function ImagePickerModal({
  visible,
  onClose,
  onCamera,
  onGallery
}) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>사진 선택</Text>

          <TouchableOpacity
            style={styles.modalButton}
            onPress={onCamera}
          >
            <Text style={styles.modalButtonText}>📷 사진 촬영</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalButton}
            onPress={onGallery}
          >
            <Text style={styles.modalButtonText}>🖼 갤러리 선택</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalButton, styles.modalCancelButton]}
            onPress={onClose}
          >
            <Text style={styles.modalCancelText}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    color: "#444",
    fontWeight: "600"
  }
});
