"""
AI 라벨이 있는 식물만 plants 테이블에 로드
"""
import sqlite3
import json
import os
import sys

# 프로젝트 루트를 sys.path에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
from config import Config

def load_ai_labeled_plants():
    # house_plants_updated.json 읽기
    data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'house_plants_updated.json')

    with open(data_path, 'r', encoding='utf-8') as f:
        plants_data = json.load(f)

    # ai_label_ko가 있는 식물만 필터링
    labeled_plants = [p for p in plants_data if p.get('ai_label_ko')]

    print(f"AI 라벨이 있는 식물: {len(labeled_plants)}개")

    # DB 연결
    conn = sqlite3.connect(Config.DB_PATH)
    cursor = conn.cursor()

    # 기존 데이터 삭제
    cursor.execute("DELETE FROM plants")

    # 식물 데이터 삽입
    for plant in labeled_plants:
        # common name 추출 (리스트의 첫 번째 값)
        common_name = plant.get('common', [''])[0] if plant.get('common') else ''

        # watering 정보에서 숫자 추출 (기본값 7일)
        watering_days = 7
        watering_text = plant.get('watering', '')
        if 'week' in watering_text.lower():
            # "once a week" 같은 패턴 찾기
            if 'twice' in watering_text.lower() or '2' in watering_text:
                watering_days = 3
            elif 'once' in watering_text.lower() or '1' in watering_text:
                watering_days = 7

        cursor.execute("""
            INSERT INTO plants (
                common_name, latin_name, category, watering_days,
                ideal_light, temp_min_celsius, temp_max_celsius
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            common_name,
            plant.get('latin', ''),
            plant.get('category', ''),
            watering_days,
            plant.get('ideallight', ''),
            plant.get('tempmin', {}).get('celsius'),
            plant.get('tempmax', {}).get('celsius')
        ))

        print(f"[OK] {plant.get('latin')} - {plant.get('ai_label_ko')}")

    conn.commit()

    # 확인
    cursor.execute("SELECT COUNT(*) FROM plants")
    count = cursor.fetchone()[0]
    print(f"\nplants 테이블에 {count}개 식물 로드 완료")

    conn.close()

if __name__ == '__main__':
    load_ai_labeled_plants()
