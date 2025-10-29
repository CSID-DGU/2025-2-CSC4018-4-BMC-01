import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

const Stack = createNativeStackNavigator();

/* -------------------- 메인화면 -------------------- */
function HomeScreen({ navigation }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setWeather({
        temp: 24,
        humidity: 58,
        sunny: true,
        updatedAt: new Date().toLocaleTimeString(),
      });
      setLoading(false);
    }, 1000);
  }, []);

  const getTip = () => {
    if (!weather) return "데이터 없음";
    if (weather.humidity < 40) return "공기가 건조해요. 물 주기 체크!";
    if (!weather.sunny) return "햇빛이 약해요. 창가로 옮겨주세요.";
    return "오늘은 상태가 좋아요. 가벼운 분무 정도면 충분해요.";
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* 날씨 정보 */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>현재 날씨 정보</Text>
          <Ionicons name="sunny-outline" size={22} color="#facc15" />
        </View>
        {loading ? (
          <ActivityIndicator color="#16a34a" style={{ marginVertical: 10 }} />
        ) : (
          <>
            <Text style={styles.textSmall}>
              🌡️ 온도: {weather.temp}°C | 💧 습도: {weather.humidity}%
            </Text>
            <Text style={styles.textSmall}>
              ☀️ 상태: {weather.sunny ? "맑음" : "흐림"} (업데이트 {weather.updatedAt})
            </Text>
          </>
        )}
      </View>

      {/* 화분 관리 버튼 */}
      <View style={styles.card}>
        <Text style={styles.title}>화분 관리</Text>
        <Text style={styles.textSmall}>등록, 수정, 삭제, 목록 확인이 가능합니다.</Text>

        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => navigation.navigate("Register")}
        >
          <Ionicons name="leaf" size={18} color="white" />
          <Text style={styles.btnText}>화분 등록으로 이동</Text>
        </TouchableOpacity>
      </View>

      {/* 관리 팁 */}
      <View style={styles.card}>
        <Text style={styles.title}>오늘의 관리 팁 🌿</Text>
        <Text style={styles.tip}>{getTip()}</Text>
      </View>
    </ScrollView>
  );
}

/* -------------------- 화분 등록 화면 -------------------- */
function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [image, setImage] = useState(null);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "카메라 권한이 허용되지 않았습니다.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "갤러리 접근 권한이 허용되지 않았습니다.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const registerPlant = () => {
    if (!name) return Alert.alert("입력 필요", "화분 이름을 입력해주세요.");
    if (!image) return Alert.alert("사진 필요", "화분 사진을 추가해주세요.");
    Alert.alert("등록 완료", `${name} 화분이 등록되었습니다!`);
    console.log("등록된 화분:", { name, note, image });
    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🌿 화분 등록</Text>

      <TextInput
        style={styles.input}
        placeholder="화분 이름 (예: 종합설계)"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={[styles.input, { height: 80, textAlignVertical: "top" }]}
        placeholder="메모 (예: 주 1회 물주기)"
        multiline
        value={note}
        onChangeText={setNote}
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Ionicons name="camera" size={18} color="white" />
          <Text style={styles.buttonText}>카메라 촬영</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.grayButton]} onPress={pickImage}>
          <Ionicons name="image" size={18} color="white" />
          <Text style={styles.buttonText}>갤러리 선택</Text>
        </TouchableOpacity>
      </View>

      {image && <Image source={{ uri: image }} style={styles.preview} />}

      <TouchableOpacity style={[styles.button, { alignSelf: "flex-start" }]} onPress={registerPlant}>
        <Ionicons name="save" size={18} color="white" />
        <Text style={styles.buttonText}>등록</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* -------------------- 앱 구조 (네비게이션 포함) -------------------- */
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "메인화면" }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "화분 등록" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/* -------------------- 스타일 -------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8 },
  textSmall: { fontSize: 15, color: "#374151", marginBottom: 4 },
  tip: { fontSize: 16, color: "#111827", marginTop: 4 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  manageButton: {
    flexDirection: "row",
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  btnText: { color: "white", fontSize: 15, fontWeight: "700" },
  input: {
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  buttonRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16a34a",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  grayButton: { backgroundColor: "#6b7280" },
  buttonText: { color: "white", fontWeight: "bold" },
  preview: { width: "100%", height: 220, borderRadius: 10, marginBottom: 16 },
});
