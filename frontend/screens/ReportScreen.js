/*
  파일명: ReportScreen.js
  목적:
    - 최근 30일 기준 식물 관리 지표 요약 화면
    - 물주기 성실도(%) 계산 및 시각화
    - 대시보드 + 바그래프 + 식물별 상세 카드

  데이터 소스:
    - fetchPlants(): Storage.js에서 API + 로컬메타 결합한 결과 사용
      · waterDate       : 최근 물 준 날짜
      · nextWater       : 다음 물 줄 날짜
      · WateringPeriod  : 물주는 주기(일)
      · favorite        : 대표식물 여부

  성실도 계산 기준:
    - 기간: 최근 30일
    - 예정된 물주기 횟수 = floor(30 / WateringPeriod)
    - 최근 물 준 날짜가 30일 이내면 준수 1회로 판단(단일 기록 기반)
    - 성실도(%) = (준수 / 예정) * 100
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

export default function ReportScreen() {
  const [plants, setPlants] = useState([]);
  const [report, setReport] = useState([]);

  /* ------------------ 데이터 로드 ------------------ */
  const loadData = async () => {
    const list = await fetchPlants();
    setPlants(list);
    setReport(generateReport(list));
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ------------------ 성실도 계산 ------------------ */
  const generateReport = (list) => {
    const today = new Date();
    const THIRTY = 30;

    return list.map((p) => {
      const lastWater = p.waterDate ? new Date(p.waterDate) : null;
      const period = p.WateringPeriod ?? 7;

      const expected = Math.floor(THIRTY / period);

      let success = 0;
      if (lastWater) {
        const diff = (today - lastWater) / (1000 * 60 * 60 * 24);
        if (diff <= THIRTY) success = 1;
      }

      const rate =
        expected === 0 ? 0 : Math.round((success / expected) * 100);

      return {
        id: p.id,
        name: p.name,
        waterDate: p.waterDate,
        nextWater: p.nextWater,
        period,
        expected,
        success,
        rate,
      };
    });
  };

  /* ------------------ 전체 요약 ------------------ */
  const avgRate =
    report.length === 0
      ? 0
      : Math.round(
          report.reduce((acc, r) => acc + r.rate, 0) / report.length
        );

  /* ------------------ 전체 물준 횟수 ------------------ */
  const successCount = report.filter((r) => r.success > 0).length;

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
            <Text style={styles.dashboardTitle}>이번달 물 준 횟수</Text>
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
  /* --- 대시보드 --- */
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

  /* --- 섹션 제목 --- */
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    marginTop: 10,
  },

  /* --- 그래프 --- */
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

  /* --- 카드 --- */
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
