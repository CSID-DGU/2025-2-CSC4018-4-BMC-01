/*
  파일명: App.js
  목적:
    - 앱 최상단 구조 설정
    - SafeAreaProvider + NavigationContainer 적용
    - 알림 초기화
    - 로컬 데이터베이스 초기화
*/

import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

import AppNavigator from "./navigation/AppNavigator";
import { initializeNotifications } from "./utils/notificationService";
import { initDatabase } from "./src/services/localDbService";
import { PlantProvider } from "./context/PlantContext";

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[App] 앱 초기화 시작');

        // 로컬 데이터베이스 초기화
        await initDatabase();
        console.log('[App] 데이터베이스 초기화 완료');

        // 알림 초기화
        initializeNotifications();
        console.log('[App] 알림 초기화 완료');

        setIsReady(true);
      } catch (err) {
        console.error('[App] 초기화 오류:', err);
        setError(err.message);
      }
    };

    initializeApp();
  }, []);

  // 로딩 화면
  if (!isReady) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#8CCB7F" />
          <Text style={styles.loadingText}>
            {error ? `오류: ${error}` : '앱 초기화 중...'}
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PlantProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </PlantProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});
