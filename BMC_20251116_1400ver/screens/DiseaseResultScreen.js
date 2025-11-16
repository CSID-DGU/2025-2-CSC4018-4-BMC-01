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
  ScrollView
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

/* Storage */
import {
  generateLeafImageName,
  saveLeafImageToStorage,
  addLeafPhoto
} from "../utils/Storage";

export default function DiseaseResultScreen({ route }) {
  const plant = route.params?.plant;
  const [imageUri, setImageUri] = useState(null);

  /* ------------------- 잎 사진 촬영 ------------------- */
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

    // 파일명 생성
    const fileName = generateLeafImageName();

    // 스토리지에 저장
    const savedUri = await saveLeafImageToStorage(localUri, fileName);

    // plant.leafPhotos 추가
    await addLeafPhoto(plant.id, fileName, savedUri);

    setImageUri(savedUri);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
      edges={["top", "bottom", "left", "right"]}   // ★ SafeArea A안 적용
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>병충해 분석</Text>
        <Text style={styles.sub}>식물: {plant?.name}</Text>

        {/* ---------------- 사진 미리보기 ---------------- */}
        <View style={styles.previewBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImg} />
          ) : (
            <Text style={styles.previewText}>촬영된 잎 사진이 없습니다.</Text>
          )}
        </View>

        {/* ---------------- 촬영 버튼 ---------------- */}
        <TouchableOpacity style={styles.cameraBtn} onPress={takeLeafPhoto}>
          <Text style={styles.cameraBtnText}>잎 사진 촬영하기</Text>
        </TouchableOpacity>

        {/* ---------------- 서버 분석 안내 ---------------- */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>분석 준비 완료</Text>
          <Text style={styles.infoText}>
            촬영된 잎 사진은 저장되었습니다.  
            추후 API가 연결되면 서버로 전송하여 분석할 수 있습니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------- 스타일 ------------------- */
const styles = StyleSheet.create({
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
    width: "100%",
    height: 250,
    backgroundColor: "#EEE",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20
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

  cameraBtnText: {
    textAlign: "center",
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16
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
