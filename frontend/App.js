/*
  파일명: App.js
  목적:
    - 앱 최상단 구조 설정
    - SafeAreaProvider + NavigationContainer 적용
    - 알림 초기화
*/

import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AppNavigator from "./navigation/AppNavigator";
import { initializeNotifications } from "./utils/notificationService";

export default function App() {
  useEffect(() => {
    // 앱 시작 시 알림 초기화
    initializeNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
