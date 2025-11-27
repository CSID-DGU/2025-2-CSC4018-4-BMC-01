/*
  파일명: ReportScreen.js
  목적:
    - 최근 30일 기준 식물 관리 성실도 리포트 화면
    - watering_logs 기반 “실제 물준 횟수”를 기준으로 정확한 성실도 계산
    - 기존 UI/구조/스타일은 그대로 유지

  데이터 소스:
    - fetchPlants(): Storage.js에서 API + 로컬메타 결합한 결과 사용
    - localDbService.getWateringHistory():
        · 최근 N일간 물준 날짜 기록 조회
        · ReportScreen 계산용

  성실도 계산 기준(개선된 버전):
    - 기간: 최근 30일
    - 예정된 물주기 횟수 = floor(30 / WateringPeriod)
    - 실제 물준 횟수 = watering_logs 테이블에서 recent N일간 기록 count
    - 성실도(%) = (실제 / 예정) * 100
*/

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchPlants } from "../utils/Storage";
import * as localDb from "../src/services/localDbService";

export default function ReportScreen({ navigation }) {
  const [plants, setPlants] = useState([]);
  const [report, setReport] = useState([]);

  /* ------------------ 데이터 로드 ------------------ */
  const loadData = async () => {
    const list = await fetchPlants();
    setPlants(list);

    const rep = await generateReport(list);
    setReport(rep);
  };

  /* 초기 로드 */
  useEffect(() => {
    loadData();
  }, []);

  /* 화면 focus 시 자동 새로고침 */
  useEffect(() => {
    const unsub = navigation.addListener("focus", loadData);
    return unsub;
  }, [navigation]);

  /* ------------------ 성실도 계산(개선) ------------------ */
  const generateReport = async (list) => {
    const DAYS = 30;
    const results = [];

    for (const p of list) {
      const period = p.WateringPeriod ?? 7;

      // 예정 물주기 횟수
      const expected = Math.floor(DAYS / period) || 1;

      // 실제 물준 기록 (watering_logs 테이블)
      const logs = await localDb.getWateringHistory(p.id, DAYS);
      const actual = logs.length;

      // 성실도 계산
      const rate = Math.min(100, Math.round((actual / expected) * 100));

      results.push({
        id: p.id,
        name: p.name,
        waterDate: p.waterDate,
        nextWater: p.nextWater,
        period,
        expected,
        actual,
        rate,
      });
    }

    return results;
  };

  /* ------------------ 전체 요약 ------------------ */
  const avgRate =
    report.length === 0
      ? 0
      : Math.round(
          report.reduce((acc, r) => acc + r.rate, 0) / report.length
        );

  /* ------------------ 전체 물준 횟수 ------------------ */
  const successCount =
    report.reduce((acc, r) => acc + r.actual, 0);

  /* ------------------ 그래프 최대치 설정 ------------------ */
  const maxRate =
    report.length === 0 ? 100 : Math.max(...report.map((r) => r.rate), 100);

  /* ------------------ 화면 구성 ------------------ */
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
      edges={["top", "bottom", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ------------------ 대시보드 3칸 ------------------ */}
        <View style={styles.dashboardRow}>
          <View style={styles.dashboardBox}>
            <Text style={styles.dashboardTitle}>평균 성실도</Text>
            <Text style={styles.dashboardValue}>{avgRate}%</Text>
          </View>

          <View style={styles.dashboardBox}>
            <Text style={styles.dashboardTitle}>식물 수</Text>
            <Text style={styles.dashboardValue}>{plants.length}개</Text>
          </View>

          <View style={styles.dashboardBox}>
            <Text style={styles.dashboardTitle}>최근 30일 물준 횟수</Text>
            <Text style={styles.dashboardValue}>{successCount}회</Text>
          </View>
        </View>

        {/* ------------------ 성실도 바 그래프 ------------------ */}
        <Text style={styles.sectionTitle}>성실도 그래프</Text>

        {report.map((r) => (
          <View key={r.id} style={styles.graphRow}>
            <Text style={styles.graphLabel}>{r.name}</Text>

            <View style={styles.graphBarBackground}>
              <View
                style={[
                  styles.graphBarFill,
                  { width: `${(r.rate / maxRate) * 100}%` },
                ]}
              />
            </View>

            <Text style={styles.graphRate}>{r.rate}%</Text>
          </View>
        ))}

        {/* ------------------ 식물별 상세 카드 ------------------ */}
        <Text style={styles.sectionTitle}>식물별 관리 지표</Text>

        {report.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.cardName}>{r.name}</Text>

            <Text style={styles.cardText}>
              마지막 물 준 날짜: {r.waterDate || "기록 없음"}
            </Text>
            <Text style={styles.cardText}>
              다음 물 줄 날짜: {r.nextWater || "예정 없음"}
            </Text>
            <Text style={styles.cardText}>
              물주는 주기: {r.period}일
            </Text>

            <Text style={styles.cardText}>
              최근 30일 실제 물준 횟수: {r.actual}회
            </Text>
            <Text style={styles.cardText}>
              예정된 물주기 횟수: {r.expected}회
            </Text>

            <View style={styles.rateBox}>
              <Text style={styles.rateText}>{r.rate}%</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------------------------------------------------
   스타일
-------------------------------------------------- */
const styles = StyleSheet.create({
  dashboardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  dashboardBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 20,
    borderRadius: 15,
    marginHorizontal: 5,
    alignItems: "center",
  },

  dashboardTitle: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
  },

  dashboardValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    marginTop: 10,
  },

  graphRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  graphLabel: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },

  graphBarBackground: {
    flex: 2,
    height: 12,
    backgroundColor: "#EDEDED",
    borderRadius: 6,
    marginHorizontal: 10,
  },

  graphBarFill: {
    height: 12,
    backgroundColor: "#8CCB7F",
    borderRadius: 6,
  },

  graphRate: {
    width: 40,
    textAlign: "right",
    fontSize: 14,
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 1,
  },

  cardName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },

  cardText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 5,
  },

  rateBox: {
    marginTop: 15,
    backgroundColor: "#8CCB7F",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  rateText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
  },
});
