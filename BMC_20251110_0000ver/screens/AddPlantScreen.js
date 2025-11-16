/*
  파일명: AddPlantScreen.js
  기능: 새로운 식물을 등록하는 화면
  수정내용:
    - (2025.11.12) 갤러리 선택 미작동 문제 해결 (ImagePicker.MediaType → MediaTypeOptions)
    - (2025.11.12) 등록 후 홈화면 이동 오류 수정 (navigate 수정)
    - (2025.11.12) 미리보기 이미지 표시 정상화
    - (기존 주석 전체 유지)
*/

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { addPlant } from "../utils/storage";

export default function AddPlantScreen({ navigation }) {
  // 상태 변수 정의
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);

  /*
    기능: 갤러리에서 이미지 선택
    수정내용: MediaTypeOptions.Images 로 수정하여 선택 기능 정상화
  */
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted")
        return Alert.alert("권한 필요", "갤러리 접근 권한을 허용해주세요.");

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // ✅ 최신 문법
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error("갤러리 선택 오류:", err);
    }
  };

  /*
    기능: 카메라로 사진 촬영
  */
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted")
        return Alert.alert("권한 필요", "카메라 접근 권한을 허용해주세요.");

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error("사진 촬영 오류:", err);
    }
  };

  /*
    기능: 식물 등록 처리
    수정내용: navigation.navigate("홈") → Tabs로 변경하여 네비 오류 해결
  */
  const handleRegister = async () => {
    try {
      if (!name.trim() || !image)
        return Alert.alert("입력 누락", "식물 이름과 사진을 모두 등록해주세요.");

      await addPlant({ id: Date.now(), name, image });
      Alert.alert("등록 완료", `${name}이(가) 추가되었습니다.`);
      navigation.navigate("Tabs", { screen: "홈" }); // ✅ 수정됨
    } catch (err) {
      console.error("식물 등록 오류:", err);
    }
  };

  /*
    렌더링: 등록 화면 UI
  */
  return (
    <View style={styles.container}>
      <Text style={styles.title}>새 식물 등록</Text>

      {/* 식물 이름 입력 */}
      <TextInput
        style={styles.input}
        placeholder="식물 이름을 입력하세요"
        value={name}
        onChangeText={setName}
      />

      {/* 사진 미리보기 */}
      {image ? (
        <Image source={{ uri: image }} style={styles.preview} />
      ) : (
        <View style={styles.previewBox}>
          <Text style={{ color: "#999" }}>사진 미리보기</Text>
        </View>
      )}

      {/* 사진 등록 버튼 */}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#6FCF97" }]}
          onPress={takePhoto}
        >
          <Text style={styles.btnText}>📷 촬영</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#56CCF2" }]}
          onPress={pickImage}
        >
          <Text style={styles.btnText}>🖼 선택</Text>
        </TouchableOpacity>
      </View>

      {/* 등록 버튼 */}
      <TouchableOpacity style={styles.registerBtn} onPress={handleRegister}>
        <Text style={styles.registerText}>등록하기</Text>
      </TouchableOpacity>
    </View>
  );
}

/*
  스타일 정의
*/
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FFF5",
    alignItems: "center",
    paddingTop: 40,
  },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  input: {
    width: "85%",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 10,
  },
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
    marginBottom: 15,
  },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, marginHorizontal: 5 },
  btnText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  registerBtn: {
    backgroundColor: "#27AE60",
    width: "85%",
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
  },
  registerText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
