"""
데이터베이스 필드 값 확인 스크립트
- 한글 필드에 값이 제대로 들어가 있는지 검증
"""

import sqlite3
import sys
import os

# 프로젝트 루트 경로 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from config import Config

DB_PATH = Config.DB_PATH

def check_korean_fields():
    """한글 필드 값 확인"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 전체 레코드 개수 확인
    cursor.execute("SELECT COUNT(*) FROM plants")
    total_count = cursor.fetchone()[0]
    print(f"전체 식물 레코드 개수: {total_count}")
    print("-" * 80)

    # 한글 필드 값이 있는 레코드 개수 확인
    cursor.execute("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN ai_label_ko IS NOT NULL THEN 1 ELSE 0 END) as has_ai_label_ko,
            SUM(CASE WHEN ideallight_ko IS NOT NULL THEN 1 ELSE 0 END) as has_ideallight_ko,
            SUM(CASE WHEN toleratedlight_ko IS NOT NULL THEN 1 ELSE 0 END) as has_toleratedlight_ko,
            SUM(CASE WHEN watering_ko IS NOT NULL THEN 1 ELSE 0 END) as has_watering_ko
        FROM plants
    """)

    result = cursor.fetchone()
    print("한글 필드 값 존재 여부:")
    print(f"  ai_label_ko: {result[1]}/{result[0]}")
    print(f"  ideallight_ko: {result[2]}/{result[0]}")
    print(f"  toleratedlight_ko: {result[3]}/{result[0]}")
    print(f"  watering_ko: {result[4]}/{result[0]}")
    print("-" * 80)

    # 샘플 데이터 3개 출력
    print("\n샘플 데이터 (처음 3개):")
    cursor.execute("""
        SELECT
            id,
            ai_label_ko,
            ideallight_ko,
            toleratedlight_ko,
            watering_ko,
            wateringperiod
        FROM plants
        LIMIT 3
    """)

    for row in cursor.fetchall():
        print(f"\nID: {row[0]}")
        print(f"  식물명(한글): {row[1]}")
        print(f"  이상적인 빛(한글): {row[2]}")
        print(f"  적응 가능한 빛(한글): {row[3]}")
        print(f"  물주기(한글): {row[4]}")
        print(f"  물주기 주기: {row[5]}일")

    conn.close()

if __name__ == "__main__":
    check_korean_fields()
