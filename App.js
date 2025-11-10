/*
  파일명: App.js
  기능: 전체 네비게이션 구조 관리 (Stack + Bottom Tabs)
  수정내용:
    - (2025.11.15) 하단탭 marginBottom 추가 (홈버튼 겹침 방지)
*/

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import Ionicons from "react-native-vector-icons/Ionicons";

import HomeScreen from "./screens/HomeScreen";
import MyPlantListScreen from "./screens/MyPlantListScreen";
import AddPlantScreen from "./screens/AddPlantScreen";
import CalendarScreen from "./screens/CalendarScreen";
import SettingsScreen from "./screens/SettingsScreen";
import DiseaseResultScreen from "./screens/DiseaseResultScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#6FCF97",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: { height: 80, paddingBottom: 15, marginBottom: 8 }, // ✅ 추가
        tabBarIcon: ({ color }) => {
          let iconName;
          if (route.name === "홈") iconName = "home-outline";
          else if (route.name === "내 화분") iconName = "leaf-outline";
          else if (route.name === "캘린더") iconName = "calendar-outline";
          else if (route.name === "설정") iconName = "settings-outline";
          return <Ionicons name={iconName} size={23} color={color} />;
        },
      })}
    >
      <Tab.Screen name="홈" component={HomeScreen} />
      <Tab.Screen name="내 화분" component={MyPlantListScreen} />
      <Tab.Screen name="캘린더" component={CalendarScreen} />
      <Tab.Screen name="설정" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="AddPlant" component={AddPlantScreen} options={{ title: "식물 등록" }} />
        <Stack.Screen name="DiseaseResult" component={DiseaseResultScreen} options={{ title: "병충해 식별 결과" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
