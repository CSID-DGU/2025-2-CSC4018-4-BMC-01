"""
AI 라벨이 있는 식물만 plants 테이블에 로드
"""

import sqlite3
import json
import os
import sys

# backend/src 경로 추가 (config import용)
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
from config import Config


def load_plants_with_ai_labels():
    """ai_label_ko가 있는 식물만 plants 테이블에 로드"""

    # house_plants_updated.json 읽기
    with open(Config.UPDATED_DATA_PATH, 'r', encoding='utf-8') as f:
        plants_data = json.load(f)

    # ai_label_ko가 있는 식물만 필터링
    labeled_plants = [p for p in plants_data if p.get('ai_label_ko') and p.get('ai_label_ko') != '']

    print(f'총 {len(plants_data)}개 식물 중 ai_label_ko가 있는 식물: {len(labeled_plants)}개')

    # DB 연결
    conn = sqlite3.connect(Config.DB_PATH)
    cursor = conn.cursor()

    # 기존 데이터 삭제
    cursor.execute('DELETE FROM plants')
    print('기존 plants 데이터 삭제 완료')

    # 데이터 삽입
    for plant in labeled_plants:
        # common 이름 처리 (배열을 문자열로)
        common_names = plant.get('common', [])
        common_name = ', '.join(common_names) if common_names else plant.get('latin', 'Unknown')

        # 온도 정보
        tempmax = plant.get('tempmax', {})
        tempmin = plant.get('tempmin', {})

        # insects 처리 (배열을 문자열로)
        insects = plant.get('insects', [])
        insects_str = ', '.join(insects) if isinstance(insects, list) else str(insects)

        # use 처리 (배열을 문자열로)
        use_category = plant.get('use', [])
        use_str = ', '.join(use_category) if isinstance(use_category, list) else str(use_category)

        cursor.execute("""
            INSERT INTO plants (
                id, latin_name, common_name, family, category,
                origin, climate,
                temp_max_celsius, temp_min_celsius,
                ideal_light, tolerated_light,
                watering_desc,
                insects, use_category
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            plant.get('id'),
            plant.get('latin', ''),
            common_name,
            plant.get('family', ''),
            plant.get('category', ''),
            plant.get('origin', ''),
            plant.get('climate', ''),
            tempmax.get('celsius'),
            tempmin.get('celsius'),
            plant.get('ideallight', ''),
            plant.get('toleratedlight', ''),
            plant.get('watering', ''),
            insects_str,
            use_str
        ))

        print(f'추가: ID {plant.get("id")} - {plant.get("latin")} (한글: {plant.get("ai_label_ko")})')

    conn.commit()
    conn.close()

    print(f'\n총 {len(labeled_plants)}개 식물을 plants 테이블에 로드했습니다!')


if __name__ == '__main__':
    load_plants_with_ai_labels()
