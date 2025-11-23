/*
  파일명: AppNavigator.js
  기능: 전체 네비게이션 + 하단 탭 라우팅
  스택 구조:
    - Home
    - Plants (MyPlantList, PlantDetail, PlantEditor, DiseaseResult)
    - Report
    - Calendar (CalendarMain, NotificationSetting)

  변경사항:
    ✔ SettingsScreen 제거됨
    ✔ ReportScreen 추가됨
    ✔ CalendarStack 생성 (알림 설정 화면 포함)
    ✔ 하단 탭 순서: Home → Plants → Report → Calendar
*/

import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";

/* Screens */
import HomeScreen from "../screens/HomeScreen";
import MyPlantListScreen from "../screens/MyPlantListScreen";
import PlantDetailScreen from "../screens/PlantDetailScreen";
import PlantEditorScreen from "../screens/PlantEditorScreen";
import DiseaseResultScreen from "../screens/DiseaseResultScreen";
import CalendarScreen from "../screens/CalendarScreen";

/* 신규 추가 스크린 */
import NotificationSettingScreen from "../screens/NotificationSettingScreen";
import ReportScreen from "../screens/ReportScreen"; // 레포트 탭 신규

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/* -------------------------------------------------
   내 화분 스택
   - MyPlantList
   - PlantDetail
   - PlantEditor
   - DiseaseResult
-------------------------------------------------- */
function PlantStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyPlantList" component={MyPlantListScreen} />
      <Stack.Screen name="PlantDetail" component={PlantDetailScreen} />
      <Stack.Screen name="PlantEditor" component={PlantEditorScreen} />
      <Stack.Screen name="DiseaseResult" component={DiseaseResultScreen} />
    </Stack.Navigator>
  );
}

/* -------------------------------------------------
   캘린더 스택
   - CalendarMain
   - NotificationSetting
   (알림 설정 화면 포함)
-------------------------------------------------- */
function CalendarStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CalendarMain" component={CalendarScreen} />
      <Stack.Screen
        name="NotificationSetting"
        component={NotificationSettingScreen}
      />
    </Stack.Navigator>
  );
}

/* -------------------------------------------------
   전체 탭 네비게이터
-------------------------------------------------- */
export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 10
        },
        tabBarLabelStyle: {
          fontSize: 12
        }
      }}
    >
      {/* ------------------ 홈 ------------------ */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "홈",
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>🏠</Text>
        }}
      />

      {/* ------------------ 내 화분 ------------------ */}
      <Tab.Screen
        name="Plants"
        component={PlantStack}
        options={{
          title: "내 화분",
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>🪴</Text>
        }}
      />

      {/* ------------------ 레포트 ------------------ */}
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{
          title: "레포트",
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>📊</Text>
        }}
      />

      {/* ------------------ 캘린더 ------------------ */}
      <Tab.Screen
        name="Calendar"
        component={CalendarStack}
        options={{
          title: "캘린더",
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>📅</Text>
        }}
      />
    </Tab.Navigator>
  );
}
