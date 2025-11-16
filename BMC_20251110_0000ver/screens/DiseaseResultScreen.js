// screens/DiseaseResultScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function DiseaseResultScreen({ route }) {
  const navigation = useNavigation();
  const { result } = route.params || { result: "정상" };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>병충해 분석 결과</Text>
      <View style={styles.resultBox}>
        <Text style={styles.resultText}>
          {result === "정상"
            ? "🌿 병충해 징후가 없습니다."
            : `⚠️ ${result} 병충해로 진단되었습니다.`}
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>돌아가기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F5E9' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
  resultBox: { padding: 20, borderRadius: 12, backgroundColor: '#fff', elevation: 2, marginBottom: 30 },
  resultText: { fontSize: 18, color: '#333', textAlign: 'center' },
  button: { backgroundColor: '#81C784', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
