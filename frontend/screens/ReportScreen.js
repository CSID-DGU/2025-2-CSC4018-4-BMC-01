/*
  파일명: ReportScreen.js
  기능:
    - 최근 30일 기준 리포트 + 누적 성실도 리포트 지원
    - 사용자 토글로 모드 선택 (recent30 | score)
    - 모드별 안내 박스 + 그래프/카드 출력

  데이터 소스:
    - fetchPlants(): Storage.js (API + 로컬메타)
    - localDbService.getWateringHistory(): 최근 N일간 물준 기록
    - localDbService.recordWatering(): 누적 성실도 갱신
*/

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePlants } from "../context/PlantContext";
import * as localDb from "../src/services/localDbService";

export default function ReportScreen({ navigation }) {
  // Context에서 식물 데이터 가져오기
  const { plants, loadPlants } = usePlants();
  const [report, setReport] = useState([]);
  const [mode, setMode] = useState("recent30");

  /* -------------------------------------------------
     데이터 로드
  ------------------------------------------------- */
  const loadData = async () => {
    const list = await loadPlants();
    const rep = await generateReport(list);
    setReport(rep);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => loadData());
    return unsub;
  }, [navigation]);

  /* -------------------------------------------------
     리포트 생성
     - recent30: 최근 30일 기준
     - score: p.score (localDb 저장) 포함
  ------------------------------------------------- */
  const generateReport = async (list) => {
    const DAYS = 30;
    const results = [];

    for (const p of list) {
      const period = p.WateringPeriod ?? 7;

      const expected = Math.floor(DAYS / period) || 1;

      const logs = await localDb.getWateringHistory(p.id, DAYS);
      const actual = logs.length;

      const recentRate = Math.min(
        100,
        Math.round((actual / expected) * 100)
      );

      // score 기반 리포트 (계산은 DB recordWatering에서 수행)
      const scoreRate = p.score ?? 100;

      results.push({
        id: p.id,
        name: p.name,
        waterDate: p.waterDate,
        nextWater: p.nextWater,
        period,
        expected,
        actual,
        recentRate,
        scoreRate,
      });
    }

    return results;
  };

  /* -------------------------------------------------
     요약값 계산
     - 모드별로 서로 다른 rate 사용
  ------------------------------------------------- */
  const avg =
    report.length === 0
      ? 0
      : Math.round(
          report.reduce(
            (acc, r) =>
              acc +
              (mode === "recent30" ? r.recentRate : r.scoreRate),
            0
          ) / report.length
        );

  const successCount =
    report.reduce((acc, r) => acc + r.actual, 0);

  const maxRate =
    report.length === 0
      ? 100
      : Math.max(
          ...(mode === "recent30"
            ? report.map((r) => r.recentRate)
            : report.map((r) => r.scoreRate)),
          100
        );

  /* -------------------------------------------------
     화면 구성
  ------------------------------------------------- */
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
      edges={["top", "bottom", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* -------------------------------------------------
           모드 토글 (recent30 | score)
        ------------------------------------------------- */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              mode === "recent30" && styles.toggleActive,
            ]}
            onPress={() => setMode("recent30")}
          >
            <Text
              style={[
                styles.toggleText,
                mode === "recent30" && styles.toggleTextActive,
              ]}
            >
              최근 30일
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleBtn,
              mode === "score" && styles.toggleActive,
            ]}
            onPress={() => setMode("score")}
          >
            <Text
              style={[
                styles.toggleText,
                mode === "score" && styles.toggleTextActive,
              ]}
            >
              누적 성실도
            </Text>
          </TouchableOpacity>
        </View>

        {/* -------------------------------------------------
           안내 박스: 모드별로 다른 안내 표시
        ------------------------------------------------- */}
        {mode === "recent30" ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ● 최근 30일 성실도 안내{"\n"}
              - 물주는 주기 대비 실제 물준 횟수로 계산{"\n"}
              - 예상 물주기 횟수 = 30일 ÷ 물주는 주기{"\n"}
              - 성실도 = (실제 횟수 ÷ 예상 횟수) × 100%{"\n"}
              - 최대 100%까지 표시됩니다.
            </Text>
          </View>
        ) : (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ● 누적 성실도 안내{"\n"}
              - 식물 등록 시 100점에서 시작합니다{"\n"}
              - 제때 물주기: +2점 추가{"\n"}
              - 물주기 지연: 1일당 -5점 감점{"\n"}
              - 점수는 0~100 사이에서 유지됩니다.
            </Text>
          </View>
        )}

        {/* -------------------------------------------------
           대시보드 3칸
        ------------------------------------------------- */}
        <View style={styles.dashboardRow}>
          <View style={styles.dashboardBox}>
            <Text style={styles.dashboardTitle}>평균 성실도</Text>
            <Text style={styles.dashboardValue}>{avg}%</Text>
          </View>

          <View style={styles.dashboardBox}>
            <Text style={styles.dashboardTitle}>식물 수</Text>
            <Text style={styles.dashboardValue}>{plants.length}개</Text>
          </View>

          <View style={styles.dashboardBox}>
            <Text style={styles.dashboardTitle}>최근 30일{"\n"}물 준 횟수</Text>
            <Text style={styles.dashboardValue}>{successCount}회</Text>
          </View>
        </View>

        {/* -------------------------------------------------
           성실도 바 그래프
           (모드에 따라 기준 rate 변경)
        ------------------------------------------------- */}
        <Text style={styles.sectionTitle}>
          {mode === "recent30" ? "최근 30일 성실도" : "누적 성실도"}
        </Text>

        {report.map((r) => {
          const rate =
            mode === "recent30" ? r.recentRate : r.scoreRate;

          return (
            <View key={r.id} style={styles.graphRow}>
              <Text style={styles.graphLabel}>{r.name}</Text>

              <View style={styles.graphBarBackground}>
                <View
                  style={[
                    styles.graphBarFill,
                    {
                      width: `${(rate / maxRate) * 100}%`,
                    },
                  ]}
                />
              </View>

              <Text style={styles.graphRate}>{rate}%</Text>
            </View>
          );
        })}

        {/* -------------------------------------------------
           식물별 상세 카드
        ------------------------------------------------- */}
        <Text style={styles.sectionTitle}>화분별 관리 지표</Text>

        {report.map((r) => {
          const rate =
            mode === "recent30" ? r.recentRate : r.scoreRate;

          return (
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

              {/* recent30 모드에서만 표시 */}
              {mode === "recent30" && (
                <>
                  <Text style={styles.cardText}>
                    최근 30일 실제 물준 횟수: {r.actual}회
                  </Text>
                  <Text style={styles.cardText}>
                    예정된 물주기 횟수: {r.expected}회
                  </Text>
                </>
              )}

              <View style={styles.rateBox}>
                <Text style={styles.rateText}>{rate}%</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------------------------------------------------
   스타일
-------------------------------------------------- */
const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  toggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 10,
    backgroundColor: "#EEE",
  },
  toggleActive: {
    backgroundColor: "#8CCB7F",
  },
  toggleText: {
    fontSize: 14,
    color: "#555",
  },
  toggleTextActive: {
    color: "#FFF",
    fontWeight: "bold",
  },

  infoBox: {
    backgroundColor: "#F5FDEB",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoText: {
    color: "#4A6F3D",
    fontSize: 13,
    lineHeight: 20,
  },

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
    marginBottom: 8,
    textAlign: "center",
    height: 40,
    textAlignVertical: "center",
  },

  dashboardValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
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
    // iOS 스타일 그림자 (opacity 애니메이션과 함께 작동)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    // Android 호환
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
