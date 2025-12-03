/*
  파일명: MyPlantListScreen.js
  기능:
    - 사용자 식물 전체 목록을 2열 그리드로 표시
    - 즐겨찾기(favorite) 토글 기능
    - 식물 상세 페이지(PlantDetail)로 이동
    - 새 화분 추가 버튼 (PlantEditorScreen 이동)

  데이터 흐름:
    - PlantContext에서 식물 데이터 관리 (캐싱)
    - 즐겨찾기 토글 시 즉시 UI 업데이트 (낙관적 업데이트)
    - Storage.js에 비동기 저장 후 강제 갱신

  성능 최적화:
    - InteractionManager: 화면 전환 애니메이션 완료 후 데이터 로드
    - FlatList 최적화: removeClippedSubviews, windowSize 등
    - useCallback: renderItem 메모이제이션
*/

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  InteractionManager
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { toggleFavorite } from "../utils/Storage";
import { usePlants } from "../context/PlantContext";

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
  // Context에서 식물 데이터 가져오기
  const { plants, loadPlants, updatePlant } = usePlants();
  const [loadError, setLoadError] = useState(false);

  /* ----------------------------------------------------------
      화면 focus 시 자동 갱신
      - 애니메이션 완료 후 데이터 로드 (InteractionManager)
  ----------------------------------------------------------- */
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      InteractionManager.runAfterInteractions(() => {
        loadPlants();
      });
    });
    return unsub;
  }, [navigation, loadPlants]);

  /* ----------------------------------------------------------
      즐겨찾기 토글
      - 낙관적 UI 업데이트 → Storage 저장 → 강제 갱신
  ----------------------------------------------------------- */
  const handleToggleFavorite = async (plantId) => {
    try {
      // 1. 즉시 UI 업데이트 (낙관적 업데이트)
      const currentPlant = plants.find(p => p.id === plantId);
      if (currentPlant) {
        updatePlant(plantId, { favorite: !currentPlant.favorite });
      }

      // 2. 백그라운드에서 Storage 업데이트
      await toggleFavorite(plantId);

      // 3. 강제 갱신 (캐시 무시)
      await loadPlants(true);
    } catch (error) {
      console.error('[MyPlantListScreen] 즐겨찾기 토글 실패:', error);
      // 에러 발생 시 원복을 위해 강제 갱신
      await loadPlants(true);
    }
  };

  /* ----------------------------------------------------------
      개별 식물 카드 렌더링 (useCallback 최적화)
  ----------------------------------------------------------- */
  const renderItem = useCallback(({ item }) => (
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
  ), [handleToggleFavorite, navigation]);

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
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={5}
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
