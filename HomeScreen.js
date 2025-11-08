import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Feather, FontAwesome5 } from "@expo/vector-icons";

export default function HomeScreen({ navigation }) {
  const [wateringList, setWateringList] = useState([
    { id: "1", name: "몬스테라1", checked: false },
    { id: "2", name: "몬스테라2", checked: false },
    { id: "3", name: "스투키1", checked: false },
  ]);

  const toggleCheck = (id) => {
    setWateringList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>

        {/* ✅ 공지사항 + 날씨 + 날짜 + 새로고침 */}
        <View style={styles.noticeContainer}>
          <View style={styles.weatherHeader}>
            <View style={styles.weatherInfo}>
              <Ionicons name="cloud" size={48} color="#ffffffff" />
              <Text style={styles.temperature}>-5°C</Text>
            </View>

            <View style={styles.dateBox}>
              <Text style={styles.dateText}>12/5(금)</Text>
              <Pressable>
                <Ionicons name="refresh-outline" size={26} color="black" />
              </Pressable>
            </View>
          </View>

          <View style={styles.noticeTextWrapper}>
            <FontAwesome5 name="seedling" size={20} color="#e0ffedff" />
            <Text style={styles.noticeText}> 화분을 실내에 들여놓으세요</Text>
            <FontAwesome5 name="seedling" size={20} color="#e0ffedff" />
          </View>
        </View>

        {/* ✅ 식물 카드 (가운데 정렬) */}
<View style={styles.plantCardContainer}>
  <View style={styles.plantCardBg}>
    <View style={styles.plantCardInner}>
      <Pressable
        onPress={() =>
          navigation.navigate("PlantDetailScreen", { plantName: "몬스테라1" })
        }
      >
        <Image
          source={require("../assets/monstera1.jpg")}
          style={styles.plantImage}
        />
      </Pressable>

      {/* ✅ 이름 + 버튼 */}
      <View style={styles.plantInfoGroup}>
        <Text style={styles.plantNameWide}>몬스테라1</Text>

        <Pressable
          style={styles.roundButton}
          onPress={() => console.log("사진 업데이트")}
        >
          <Text style={styles.buttonText}>사진 업데이트</Text>
        </Pressable>

        <Pressable
          style={styles.roundButton}
          onPress={() => console.log("병충해 식별")}
        >
          <Text style={styles.buttonText}>병충해 식별</Text>
        </Pressable>
      </View>
    </View>
  </View>
</View>

        {/* ✅ Watering List (메모 + 테이프) */}
        <View style={styles.memoWrapper}>
          <View style={styles.tape} />

          <View style={styles.memoCard}>
            <Text style={styles.memoTitle}>💧 Watering List</Text>

            {wateringList.map((plant) => (
              <Pressable
                key={plant.id}
                style={styles.checkRow}
                onPress={() => toggleCheck(plant.id)}
              >
                <View
                  style={[styles.checkbox, plant.checked && styles.checkedBox]}
                >
                  {plant.checked && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.checkText}>{plant.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {/* ✅ Watering List 아래로 내려온 식물추가 버튼 */}
<View style={{ alignItems: "center", marginTop: 25 }}>
  <Pressable
    style={styles.circleAddButton}
    onPress={() => navigation.navigate("카메라")}
  >
    <Ionicons name="camera-outline" size={28} color="black" />
    <Text style={styles.addText}>식물추가</Text>
  </Pressable>
</View>
      </ScrollView>
    </SafeAreaView>
    
  );
}

/* ---------------------------- STYLE ---------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffffff",
  },

  /** 공지 + 날씨 + 날짜 박스 **/
  noticeContainer: {
    backgroundColor: "#d5faffd3",
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  weatherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weatherInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  temperature: {
    fontSize: 24,
    fontWeight: "700",
    marginLeft: 6,
  },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "600",
  },
  noticeTextWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  noticeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0c3a19ff",
  },
  plantCardContainer: {
  width: "100%",
  alignItems: "center",  // ✅ 가운데 정렬
},

  /** 식물 카드 **/
  plantCardBg: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220, 220, 220, 0.71)",
    borderRadius: 20,
    //marginHorizontal: 20,
    marginTop: 30,
    padding: 15,
    width:"90%",
    alignSelf: "center",
    justifyContent: "center",
  },

  plantCardInner: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
    width: 260,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 6,
    
  },

  plantImage: {
    width: 90,
    height: 120,
    borderRadius: 15,
  },

  /** ✅ 사진 옆에 이름 + 버튼 세로 정렬 */
  plantInfoGroup: {
    marginLeft: 14,
    flex: 1,
  },

  roundButton: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: "rgba(220, 220, 220, 0.71)",
    width: 110,
    alignItems: "center",
  },

  buttonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000000ff",
  },

  plantNameWide: {
    fontSize: 15,
    fontWeight: "700",
  },

  circleAddButton: {
    width: 85,
    height: 85,
    left:"30%",
    backgroundColor: "#e0ffedff",
    borderRadius: 42.5,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 6,
  },
  addText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },

  memoWrapper: {
    marginTop: 35,
    marginHorizontal: 30,
  },
  tape: {
    position: "absolute",
    top: -14,
    left: "40%",
    width: 75,
    height: 28,
    backgroundColor: "rgba(220, 220, 220, 0.41)",
    transform: [{ rotate: "-10deg" }],
    zIndex: 2,
    opacity: 0.85,
    borderRadius: 4,
  },
  memoCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1,
  },
  memoTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 15,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "rgba(220, 220, 220, 0.71)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkedBox: {
    backgroundColor: "rgba(220, 220, 220, 0.71)",
  },
  checkMark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  checkText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
