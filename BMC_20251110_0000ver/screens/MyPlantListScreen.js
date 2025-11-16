/*
  파일명: MyPlantListScreen.js
  기능: 내가 등록한 모든 화분 목록을 표시하고, 순서 변경/삭제/사진 편집을 지원
  수정내용:
    - (2025.11.10) "Cannot read property 'toString' of undefined" 에러 수정
    - (2025.11.10) null id 대비 안전한 keyExtractor 로직 추가
*/

import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import { loadPlants, deletePlantById, reorderPlants } from "../utils/storage";
import EditImageModal from "../utils/EditImageModal";
import { useIsFocused } from "@react-navigation/native";

export default function MyPlantListScreen() {
  // 상태 변수 정의
  const [plants, setPlants] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const isFocused = useIsFocused();

  /*
    기능: 화면에 진입하거나 복귀할 때 화분 데이터 로드
  */
  useEffect(() => {
    if (isFocused) fetchPlants();
  }, [isFocused]);

  /*
    기능: AsyncStorage에서 저장된 화분 데이터 불러오기
  */
  const fetchPlants = async () => {
    const data = await loadPlants();
    setPlants(Array.isArray(data) ? data : []);
  };

  /*
    기능: 특정 화분 삭제
  */
  const handleDelete = async (id) => {
    await deletePlantById(id);
    fetchPlants();
  };

  /*
    기능: 화분 순서 변경 후 저장
  */
  const handleReorder = async (data) => {
    setPlants(data);
    await reorderPlants(data);
  };

  /*
    개별 화분 카드 렌더링 함수
  */
  const renderItem = ({ item, drag, isActive }) => (
    <TouchableOpacity
      style={[styles.card, isActive && { backgroundColor: "#E0F7E9" }]}
      onLongPress={drag}
      delayLongPress={150}
    >
      <Image source={{ uri: item.image }} style={styles.image} />
      <Text style={styles.name}>{item.name ?? "이름없음"}</Text>
      <Text style={styles.subText}>마지막: {item.waterDate || "-"}</Text>
      <Text style={styles.subText}>다음: {item.nextWater || "-"}</Text>

      {/* 편집 / 삭제 버튼 */}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#6FCF97" }]}
          onPress={() => {
            setSelectedPlant(item);
            setIsModalVisible(true);
          }}
        >
          <Text style={styles.buttonText}>사진 편집</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#EB5757" }]}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.buttonText}>삭제</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>내 화분 리스트</Text>

      {/* 데이터가 없을 때 */}
      {plants.length === 0 ? (
        <Text style={styles.emptyText}>등록된 화분이 없습니다.</Text>
      ) : (
        <DraggableFlatList
          data={plants}
          onDragEnd={({ data }) => handleReorder(data)}
          keyExtractor={(item, index) =>
            item?.id ? String(item.id) : `row-${index}` // ✅ null 대비
          }
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={{ paddingBottom: 60 }}
        />
      )}

      {/* 사진 편집 모달 */}
      {isModalVisible && (
        <EditImageModal
          visible={isModalVisible}
          plant={selectedPlant}
          onClose={() => {
            setIsModalVisible(false);
            fetchPlants();
          }}
        />
      )}
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
  header: { fontSize: 18, fontWeight: "700", color: "#333", marginBottom: 10 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    width: 160,
    height: 260,
    alignItems: "center",
    margin: 8,
    padding: 10,
    elevation: 3,
  },
  image: { width: 120, height: 120, borderRadius: 10, marginBottom: 10 },
  name: { fontWeight: "700", fontSize: 16, color: "#333" },
  subText: { color: "#666", fontSize: 12, marginTop: 2 },
  row: { flexDirection: "row", marginTop: 10 },
  button: { flex: 1, padding: 6, borderRadius: 8, marginHorizontal: 3 },
  buttonText: { color: "#fff", fontSize: 13, textAlign: "center" },
  emptyText: { color: "#777", fontSize: 16, marginTop: 40 },
});
