/*
  파일명: NotificationSettingScreen.js
  목적:
    - 물주기 알림 기능 설정 화면
    - 알림 ON/OFF 스위치 및 알림 시각(HH:MM) 선택
    - 설정값은 Storage.js의 로컬 메타데이터(__notification)에 저장

  주요 데이터 흐름:
    - loadNotification(): Storage.js → meta.__notification 읽기
    - saveNotification(): meta.__notification 갱신 후 저장
    - CalendarScreen의 우측 톱니아이콘 → 해당 화면으로 이동
*/

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadNotificationData, saveNotificationData } from "../utils/Storage";
import { scheduleDailyNotification } from "../utils/notificationService";

export default function NotificationSettingScreen({ navigation }) {
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState(new Date(2025, 0, 1, 9, 0)); // 기본 09:00
  const [showPicker, setShowPicker] = useState(false);

  /* ------------------ 초기 로드 ------------------ */
  useEffect(() => {
    const load = async () => {
      const data = await loadNotificationData();
      if (data) {
        setEnabled(data.enabled ?? false);
        if (data.hour != null && data.minute != null) {
          const dt = new Date();
          dt.setHours(data.hour);
          dt.setMinutes(data.minute);
          setTime(dt);
        }
      }
    };
    load();
  }, []);

  /* ------------------ 저장 ------------------ */
  const handleSave = async () => {
    await saveNotificationData({
      enabled,
      hour: time.getHours(),
      minute: time.getMinutes(),
    });

    // 알림 스케줄 재설정 (모바일만)
    if (Platform.OS !== "web") {
      await scheduleDailyNotification();

      if (enabled) {
        if (Platform.OS === "web") {
          window.alert("알림이 설정되었습니다.");
        } else {
          alert(`매일 ${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}에 알림을 받습니다.`);
        }
      }
    }

    navigation.goBack();
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={styles.container}>

        {/* 헤더 */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>알림 설정</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* 설명 메시지 */}
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText}>
            매일 설정한 시간에 오늘 물을 주지 않은 식물에 대한 알림을 발송합니다.
          </Text>
          <Text style={styles.descriptionSubText}>
            {Platform.OS === "web"
              ? "※ 웹에서는 알림이 지원되지 않습니다. 모바일 앱을 사용해주세요."
              : "※ 알림을 받으려면 앱의 알림 권한을 허용해야 합니다."}
          </Text>
        </View>

        {/* 알림 스위치 */}
        <View style={styles.row}>
          <Text style={styles.label}>알림 사용</Text>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: "#ccc", true: "#8CCB7F" }}
            thumbColor={enabled ? "#FFFFFF" : "#F0F0F0"}
          />
        </View>

        {/* 시간 설정 */}
        {Platform.OS === "web" ? (
          /* ---------------- WEB-ONLY BLOCK ---------------- */
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>알림 시각</Text>
            <input
              type="time"
              disabled={!enabled}
              value={`${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`}
              onChange={(e) => {
                const [hours, minutes] = e.target.value.split(':');
                const newTime = new Date();
                newTime.setHours(parseInt(hours));
                newTime.setMinutes(parseInt(minutes));
                setTime(newTime);
              }}
              style={{
                padding: "10px",
                fontSize: "16px",
                borderRadius: "8px",
                border: "2px solid #8CCB7F",
                backgroundColor: enabled ? "#FFF" : "#F0F0F0"
              }}
            />
          </View>
        ) : (
          /* ---------------- MOBILE BLOCK ---------------- */
          <TouchableOpacity
            style={styles.timeBox}
            onPress={() => enabled && setShowPicker(true)}
          >
            <Text style={styles.timeLabel}>알림 시각</Text>
            <Text style={styles.timeValue}>
              {time.getHours().toString().padStart(2, "0")}:
              {time.getMinutes().toString().padStart(2, "0")}
            </Text>
          </TouchableOpacity>
        )}

        {/* 저장 버튼 */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveText}>저장하기</Text>
        </TouchableOpacity>

        {/* 시간 선택기 - 모바일 전용 */}
        {Platform.OS !== "web" && showPicker && (
          <DateTimePicker
            value={time}
            mode="time"
            is24Hour={true}
            onChange={(e, selected) => {
              setShowPicker(false);
              if (selected) setTime(selected);
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ---------------------- 스타일 ---------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 25
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30
  },

  title: {
    fontSize: 26,
    fontWeight: "bold"
  },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center"
  },

  closeText: {
    fontSize: 26,
    color: "#666"
  },

  descriptionBox: {
    backgroundColor: "#E8F5E9",
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: "#8CCB7F"
  },

  descriptionText: {
    fontSize: 14,
    color: "#2E7D32",
    lineHeight: 20,
    marginBottom: 8
  },

  descriptionSubText: {
    fontSize: 12,
    color: "#66BB6A",
    lineHeight: 18
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25
  },

  label: {
    fontSize: 18,
    fontWeight: "600"
  },

  timeBox: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  timeLabel: {
    fontSize: 18,
    fontWeight: "600"
  },

  timeValue: {
    fontSize: 18,
    color: "#4A4A4A"
  },

  saveBtn: {
    backgroundColor: "#8CCB7F",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center"
  },

  saveText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 17
  }
});
