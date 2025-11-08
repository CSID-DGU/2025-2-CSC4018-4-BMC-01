import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";

import HomeScreen from "./screens/HomeScreen";
import DictionaryScreen from "./screens/DictionaryScreen";
import PlantDetailScreen from "./screens/PlantDetailScreen";
import CalendarScreen from "./screens/CalendarScreen";
import SettingsScreen from "./screens/SettingsScreen";

import { SafeAreaProvider } from "react-native-safe-area-context";
//cd C:\Users\heisa\BMC //npx expo start
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DictionaryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="DictionaryMain" component={DictionaryScreen} options={{ title: "도감" }} />
      <Stack.Screen name="PlantDetail" component={PlantDetailScreen} options={{ title: "식물 정보" }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator screenOptions={{ headerShown: false }}>
          <Tab.Screen
            name="홈"
            component={HomeScreen}
            options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text> }}
          />

          <Tab.Screen
            name="도감"
            component={DictionaryStack}
            options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>📘</Text> }}
          />

          <Tab.Screen
            name="캘린더"
            component={CalendarScreen}
            options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>🗓️</Text> }}
          />

          <Tab.Screen
            name="설정"
            component={SettingsScreen}
            options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚙️</Text> }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
