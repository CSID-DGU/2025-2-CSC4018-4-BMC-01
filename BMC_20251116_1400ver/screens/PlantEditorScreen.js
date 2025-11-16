/*
  파일명: PlantEditorScreen.js
  기능: 화분 추가/수정 (갤러리·카메라 + 이미지 저장)
*/

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Modal
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

/* Storage 연동 */
import {
  addPlant,
  updatePlant,
  generatePlantImageName,
  saveImageToStorage,
} from "../utils/Storage";

export default function PlantEditorScreen({ navigation, route }) {
  const mode = route.params?.mode || "add";
  const plant = route.params?.plant || null;

  const [name, setName] = useState(plant?.name || "");
  const [imageUri, setImageUri] = useState(plant?.image || null);
  const [pickerVisible, setPickerVisible] = useState(false);

  /* ---------------- 갤러리 선택 ---------------- */
  const pickFromGallery = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.9,
    });
    if (!r.canceled) setImageUri(r.assets[0].uri);
    setPickerVisible(false);
  };

  /* ---------------- 카메라 촬영 ---------------- */
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
    if (!r.canceled) setImageUri(r.assets[0].uri);
    setPickerVisible(false);
  };

  /* ---------------- 저장 ---------------- */
  const handleSave = async () => {
    if (!name.trim()) {
      alert("이름을 입력해주세요!");
      return;
    }

    let finalUri = plant?.image || null;
    let finalFileName = plant?.plantImageName || null;

    if (imageUri) {
      finalFileName = generatePlantImageName();
      finalUri = await saveImageToStorage(imageUri, finalFileName);
    }

    if (mode === "add") {
      await addPlant({
        name,
        image: finalUri,
        plantImageName: finalFileName
      });
    } else {
      await updatePlant({
        ...plant,
        name,
        image: finalUri,
        plantImageName: finalFileName
      });
    }

    navigation.goBack();
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
      edges={["top", "bottom", "left", "right"]}   // ★ A안 적용
    >
      <View style={styles.container}>
        <Text style={styles.title}>
          {mode === "add" ? "새 화분 추가" : "화분 정보 수정"}
        </Text>

        {/* -------- 이미지 선택 -------- */}
        <TouchableOpacity
          style={styles.imgBox}
          onPress={() => setPickerVisible(true)}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.img}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.imgPlaceholder}>사진 선택</Text>
          )}
        </TouchableOpacity>

        {/* -------- 이름 입력 -------- */}
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="화분 이름"
        />

        {/* -------- 저장 버튼 -------- */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveText}>저장하기</Text>
        </TouchableOpacity>

        {/* -------- 카메라/갤러리 선택 모달 -------- */}
        <Modal
          visible={pickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>

              <TouchableOpacity style={styles.modalBtn} onPress={pickFromGallery}>
                <Text style={styles.modalText}>갤러리에서 선택</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalBtn} onPress={pickFromCamera}>
                <Text style={styles.modalText}>카메라로 촬영</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#DDD" }]}
                onPress={() => setPickerVisible(false)}
              >
                <Text style={[styles.modalText, { color: "#333" }]}>취소</Text>
              </TouchableOpacity>

            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

/* ---------------- 스타일 ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,   // ★ 좌우 여백
    paddingTop: 20,
    paddingBottom: 40,       // ★ 하단 여백 강화
    backgroundColor: "#FAFAFA"
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20
  },

  imgBox: {
    width: "100%",
    height: 220,
    backgroundColor: "#E8E8E8",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20
  },

  img: {
    width: "100%",
    height: "100%",
    borderRadius: 14
  },

  imgPlaceholder: {
    fontSize: 16,
    color: "#777"
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
    borderRadius: 10
  },

  saveText: {
    textAlign: "center",
    color: "#FFF",
    fontSize: 17,
    fontWeight: "bold"
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center"
  },

  modalBox: {
    width: "75%",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 15
  },

  modalBtn: {
    backgroundColor: "#8CCB7F",
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 12
  },

  modalText: {
    textAlign: "center",
    color: "#FFF",
    fontWeight: "bold"
  }
});
