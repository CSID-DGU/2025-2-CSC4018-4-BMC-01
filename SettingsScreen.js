import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CameraScreenPlaceholder() {
  const [photoUri, setPhotoUri] = useState(null);

  // 사진 찍기 기능 제거하고 UI만 표시
  const takePicturePlaceholder = () => {
    setPhotoUri("placeholder"); // 화면 전환용
  };

  return (
    <View style={styles.container}>
      {photoUri ? (
        <>
          {/* 사진 미리보기 자리 */}
          <View style={styles.preview}>
            <Text style={styles.previewText}>사진 미리보기</Text>
          </View>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => setPhotoUri(null)}
          >
            <Text style={styles.retakeText}>다시 찍기</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* 카메라 자리 표시 */}
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.placeholderText}>카메라 화면</Text>
          </View>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePicturePlaceholder}
          >
            <Ionicons name="camera-outline" size={48} color="white" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e6f7f9",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraPlaceholder: {
    width: "90%",
    height: "70%",
    borderRadius: 20,
    backgroundColor: "#cceeee",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 20,
    color: "#555",
    fontWeight: "600",
  },
  captureButton: {
    position: "absolute",
    bottom: 30,
    backgroundColor: "#009688",
    padding: 15,
    borderRadius: 50,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  preview: {
    width: "90%",
    height: "70%",
    borderRadius: 20,
    backgroundColor: "#cceeee",
    justifyContent: "center",
    alignItems: "center",
  },
  previewText: {
    fontSize: 20,
    color: "#555",
    fontWeight: "600",
  },
  retakeButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    backgroundColor: "#009688",
    borderRadius: 30,
  },
  retakeText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});

