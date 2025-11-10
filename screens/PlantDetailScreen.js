import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { updatePlant, deletePlant } from '../utils/storage';

export default function PlantDetailScreen({ route, navigation }) {
  const { plant } = route.params;
  const [imageUri, setImageUri] = useState(plant.image);
  const [lastWatered, setLastWatered] = useState(plant.lastWatered || null);

  // 📸 사진 교체
  const changePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });
    if (!result.canceled) {
      const newPlant = { ...plant, image: result.assets[0].uri };
      setImageUri(result.assets[0].uri);
      await updatePlant(newPlant);
      Alert.alert('✅', '사진이 변경되었습니다.');
    }
  };

  // 💧 물 주기 기록 (로컬 시간 기준)
  const waterPlant = async () => {
    const today = new Date();

    // ✅ 로컬 기준 날짜로 변환
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];

    const nextWater = new Date(today);
    nextWater.setDate(today.getDate() + 3); // 3일 후 (임시 주기)
    const nextWaterDate = new Date(nextWater.getTime() - nextWater.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];

    const newPlant = { ...plant, lastWatered: localDate, nextWater: nextWaterDate };
    setLastWatered(localDate);
    await updatePlant(newPlant);

    Alert.alert('💧', `${plant.name}에 물을 주었습니다!\n다음 물주기: ${nextWaterDate}`);
  };

  // 🗑️ 삭제
  const handleDelete = () => {
    Alert.alert(
      '삭제 확인',
      `${plant.name}을(를) 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await deletePlant(plant.id);
            Alert.alert('삭제 완료', `${plant.name}이(가) 삭제되었습니다.`);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>화분 상세 정보</Text>

      <Image
        source={
          imageUri
            ? { uri: imageUri }
            : { uri: 'https://placehold.co/300x300/eeeeee/999999?text=사진없음' }
        }
        style={styles.image}
      />

      <Text style={styles.name}>{plant.name}</Text>
      <Text style={styles.date}>등록일: {plant.date}</Text>
      <Text style={styles.info}>
        {lastWatered
          ? `마지막 물준날: ${lastWatered}`
          : '아직 물을 준 기록이 없습니다.'}
      </Text>

      <TouchableOpacity
        style={[styles.subButton, { backgroundColor: '#64B5F6', marginTop: 15 }]}
        onPress={waterPlant}
      >
        <Text style={styles.subButtonText}>💧 물 줬어요</Text>
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.subButton, { backgroundColor: '#4FC3F7' }]}
          onPress={changePhoto}
        >
          <Text style={styles.subButtonText}>사진 변경</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subButton, { backgroundColor: '#E57373' }]}
          onPress={handleDelete}
        >
          <Text style={styles.subButtonText}>삭제</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resultBox}>
        <Text style={styles.resultTitle}>병충해 진단 결과</Text>
        <Text style={styles.resultText}>🌿 현재 병충해 징후가 없습니다.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5FBF5', alignItems: 'center', paddingTop: 40 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  image: { width: 250, height: 250, borderRadius: 20, marginBottom: 15 },
  name: { fontSize: 20, fontWeight: 'bold', marginTop: 5 },
  date: { fontSize: 14, color: '#666', marginTop: 5 },
  info: { fontSize: 16, color: '#333', marginTop: 10 },
  subButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 5,
  },
  subButtonText: { color: '#fff', fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', marginTop: 20 },
  resultBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 30,
    width: '80%',
    elevation: 2,
  },
  resultTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  resultText: { fontSize: 15, color: '#333' },
});
