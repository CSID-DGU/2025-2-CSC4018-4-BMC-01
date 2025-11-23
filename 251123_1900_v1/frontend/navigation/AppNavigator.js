/*
  파일명: AppNavigator.js
  기능: 전체 네비게이션 + 하단 탭 라우팅
  스택 구조:
    - Home
    - Plants (MyPlantList, PlantDetail, PlantEditor, DiseaseResult)
    - Calendar
    - Settings (2차에서 Report로 대체 예정)
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
import CalendarScreen from "../screens/CalendarScreen";
import DiseaseResultScreen from "../screens/DiseaseResultScreen";
import SettingsScreen from "../screens/SettingsScreen";

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
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "홈",
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>🏠</Text>
        }}
      />

      <Tab.Screen
        name="Plants"
        component={PlantStack}
        options={{
          title: "내 화분",
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>🪴</Text>
        }}
      />

      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: "캘린더",
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>📅</Text>
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: "설정",
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>⚙️</Text>
        }}
      />
    </Tab.Navigator>
  );
}
