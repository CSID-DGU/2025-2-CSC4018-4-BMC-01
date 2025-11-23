/*
  파일명: MyPlantListScreen.js
  기능: 내 화분 목록 (사진 + 이름 카드 UI)
*/

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import userPlantService from "../src/services/userPlantService";

export default function MyPlantListScreen({ navigation }) {
  const [plants, setPlants] = useState([]);

  /* ------------------- 식물 목록 로드 ------------------- */
  const loadPlantData = async () => {
    try {
      const list = await userPlantService.getMyPlants();
      setPlants(list);
    } catch (error) {
      console.error('식물 목록 로드 실패:', error);
      setPlants([]);
    }
  };

  useEffect(() => {
    loadPlantData();
  }, []);

  /* ------------------- 탭 포커스 시 갱신 ------------------- */
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadPlantData();
    });
    return unsubscribe;
  }, [navigation]);

  /* ------------------- 카드 렌더링 ------------------- */
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("PlantDetail", { plant: item })}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.cardImg}
        resizeMode="cover"
      />

      <Text style={styles.cardName}>{item.nickname || item.species_label_ko || '이름 없음'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
      edges={["top", "bottom", "left", "right"]}   // ★ A안 핵심 적용
    >
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>내 화분</Text>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate("PlantEditor", { mode: "add" })}
          >
            <Text style={styles.addPlus}>＋</Text>
          </TouchableOpacity>
        </View>

        {/* 목록 */}
        <FlatList
          data={plants}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={{ gap: 15 }}
          contentContainerStyle={{
            paddingTop: 10,
            paddingBottom: 40    // ★ 하단 여백 존재
          }}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.empty}>등록된 화분이 없습니다.</Text>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

/* ------------------- 스타일 ------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 20,   // ★ 좌우 여백
    paddingTop: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  title: {
    fontSize: 24,
    fontWeight: "bold"
  },

  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#8CCB7F",
    alignItems: "center",
    justifyContent: "center"
  },

  addPlus: {
    fontSize: 24,
    color: "#FFF",
    fontWeight: "bold"
  },

  /* ----- 카드 ----- */
  card: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 10,
    alignItems: "center",
    marginBottom: 15,
    flex: 1
  },

  cardImg: {
    width: "100%",
    aspectRatio: 1,  // 정사각형
    borderRadius: 12,
    marginBottom: 10
  },

  cardName: {
    fontSize: 16,
    fontWeight: "600"
  },

  empty: {
    textAlign: "center",
    marginTop: 20,
    color: "#777"
  }
});
