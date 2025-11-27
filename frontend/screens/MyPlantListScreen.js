/*
  파일명: MyPlantListScreen.js
  기능:
    - 사용자 식물 전체 목록을 2열 그리드로 표시
    - 식물 상세 페이지(PlantDetail)로 이동
    - Storage.js 기반 통합 모델 사용
    - 2열 그리드 고정 (UI 안정성)
    - 즐겨찾기(favorite) 기능
    - 새 화분 추가 버튼 (PlantEditorScreen 이동)

  데이터 흐름:
    fetchPlants() → Storage.js에서 API 데이터 + 로컬 메타데이터(WateringPeriod, favorite 등)
                  → waterDate / nextWater 계산 포함한 모델 반환
    MyPlantListScreen → 리스트 렌더링 → 상세 화면으로 plant 객체 그대로 전달

  주요 기능:
    - 예외 처리: API/Storage 오류 발생 시 앱 크래시 방지
    - 2열 고정 그리드: 화면 크기와 무관하게 Layout 안정화
    - SafeAreaView 적용: iOS/Android 위아래 Notch 영역 대응
*/

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { fetchPlants, toggleFavorite } from "../utils/Storage";

/* ----------------------------------------------------------
    화면 너비 기반 Layout 계산
    - 2열 고정 방식 유지
    - 화면 회전 대비 안정적인 카드 너비 계산
----------------------------------------------------------- */
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const H_PADDING = 24; // 좌우 여백
const SPACING = 12;   // 카드 간 간격

// 카드 2열 고정 width
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - SPACING) / 2;

export default function MyPlantListScreen({ navigation }) {
  const [plants, setPlants] = useState([]);
  const [loadError, setLoadError] = useState(false);

  /* ----------------------------------------------------------
      식물 목록 로드 (Storage.js 모델 기반)
      - fetchPlants(): API 데이터 + 로컬 메타데이터 통합
      - 오류 발생 시 앱 크래시 방지 및 메시지 출력
  ----------------------------------------------------------- */
  const loadPlantData = async () => {
    try {
      const list = await fetchPlants();
      setPlants(list);
      setLoadError(false);
    } catch (e) {
      console.error("[MyPlantListScreen] 식물 목록 로드 실패:", e);
      setLoadError(true);
      setPlants([]); // 오류 시 빈 리스트라도 렌더링되도록 처리
    }
  };

  /* ----------------------------------------------------------
      화면 focus 시 자동 갱신
      - 상세 화면에서 돌아왔을 때 최신 정보 반영
  ----------------------------------------------------------- */
  useEffect(() => {
    const unsub = navigation.addListener("focus", loadPlantData);
    return unsub;
  }, [navigation]);

  /* 초기 로드 */
  useEffect(() => {
    loadPlantData();
  }, []);

  /* ----------------------------------------------------------
      favorite 토글 핸들러
  ----------------------------------------------------------- */
  const handleToggleFavorite = async (plantId) => {
    await toggleFavorite(plantId);
    loadPlantData();
  };

  /* ----------------------------------------------------------
      개별 식물 카드 렌더링
      - 2열 그리드 구조 유지
      - navigation: PlantDetail 으로 plant 객체 전달
      - favorite 속성 표시 및 토글 버튼 추가
  ----------------------------------------------------------- */
  const renderItem = ({ item }) => (
    <View style={styles.cardContainer}>
      {/* 즐겨찾기 토글 버튼 */}
      <TouchableOpacity
        style={[
          styles.favoriteBtn,
          item.favorite && styles.favoriteBtnActive
        ]}
        onPress={() => handleToggleFavorite(item.id)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.favoriteBtnText,
          item.favorite && styles.favoriteBtnTextActive
        ]}>
          {item.favorite ? "★" : "☆"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate("PlantDetail", { plant: item })
        }
      >
        {/* 식물 대표 이미지 */}
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.noImage]}>
            <Text style={styles.noImageText}>No Image</Text>
          </View>
        )}

        {/* 식물 이름 */}
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    </View>
  );

  /* ----------------------------------------------------------
      화면 렌더링
  ----------------------------------------------------------- */
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={styles.container}>

        {/* ------------------ 상단 헤더: 제목 + + 버튼 ------------------ */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>내 화분</Text>

          {/* 새 화분 추가 버튼 */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate("PlantEditor")}
          >
            <Text style={styles.addBtnText}>＋</Text>
          </TouchableOpacity>
        </View>

        {/* 식물 목록 로드 실패 시 */}
        {loadError && (
          <Text style={styles.errorText}>
            식물 목록을 불러오지 못했습니다.
          </Text>
        )}

        {/* 식물 목록 없음 */}
        {plants.length === 0 && !loadError ? (
          <Text style={styles.emptyText}>등록된 화분이 없습니다.</Text>
        ) : (
          <FlatList
            data={plants}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ---------------------------- 스타일 ---------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: H_PADDING,
    paddingTop: 20,
    backgroundColor: "#FAFAFA",
  },

  /* ----------------- 제목 + + 버튼 ----------------- */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
  },

  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#8CCB7F",
    justifyContent: "center",
    alignItems: "center",
  },

  addBtnText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "600",
    marginTop: -1,
  },

  /* ⭐ 우측 상단 favorite 토글 버튼 */
  favoriteBtn: {
    position: "absolute",
    zIndex: 10,
    right: 16,
    top: 8,
    padding: 4,
  },

  favoriteBtnActive: {
    // 활성화 시 추가 스타일 (필요시)
  },

  favoriteBtnText: {
    fontSize: 24,
    color: "#DDD",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  favoriteBtnTextActive: {
    color: "#FFD700",
  },

  /* 2열 정렬 */
  row: {
    justifyContent: "space-between",
    marginBottom: SPACING,
  },

  /* 카드 컨테이너 (⭐버튼 포함) */
  cardContainer: {
    width: CARD_WIDTH,
  },

  /* 식물 카드 */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 12,
    // iOS 스타일 그림자 (opacity 애니메이션과 함께 작동)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    // Android 호환
    elevation: 2,
  },

  cardImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    resizeMode: "cover"
  },

  noImage: {
    backgroundColor: "#E8E8E8",
    justifyContent: "center",
    alignItems: "center",
  },

  noImageText: {
    color: "#999",
    fontSize: 12,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
  },

  /* 안내 메시지 */
  emptyText: {
    marginTop: 60,
    textAlign: "center",
    fontSize: 16,
    color: "#999",
  },

  errorText: {
    marginBottom: 10,
    fontSize: 14,
    color: "#D9534F",
  },
});
