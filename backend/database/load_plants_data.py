"""
AI 라벨이 있는 식물만 plants 테이블에 로드
"""

import logging
import sqlite3
import json
import os
import sys

# backend/src 경로 추가 (config import용)
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
from config import Config

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


def load_plants_with_ai_labels():
    """ai_label_ko가 있는 식물만 plants 테이블에 로드"""

    # house_plants_updated.json 읽기
    with open(Config.UPDATED_DATA_PATH, 'r', encoding='utf-8') as f:
        plants_data = json.load(f)

    # ai_label_ko가 있는 식물만 필터링
    labeled_plants = [p for p in plants_data if p.get('ai_label_ko') and p.get('ai_label_ko') != '']

    logger.info(f'총 {len(plants_data)}개 식물 중 ai_label_ko가 있는 식물: {len(labeled_plants)}개')

    # DB 연결
    conn = sqlite3.connect(Config.DB_PATH)
    cursor = conn.cursor()

    # 기존 데이터 삭제
    cursor.execute('DELETE FROM plants')
    logger.info('기존 plants 데이터 삭제 완료')

    # 데이터 삽입
    for plant in labeled_plants:
        # 온도 정보
        tempmax = plant.get('tempmax', {})
        tempmin = plant.get('tempmin', {})

        # wateringperiod를 문자열에서 정수로 변환
        wateringperiod = plant.get('wateringperiod')
        if wateringperiod:
            try:
                wateringperiod = int(wateringperiod)
            except (ValueError, TypeError):
                wateringperiod = None

        cursor.execute("""
            INSERT INTO plants (
                id,
                tempmax_celsius, tempmin_celsius,
                ideallight, toleratedlight, watering, wateringperiod,
                ai_label_en, ai_label_ko,
                ideallight_ko, toleratedlight_ko, watering_ko
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            plant.get('id'),
            tempmax.get('celsius') if tempmax else None,
            tempmin.get('celsius') if tempmin else None,
            plant.get('ideallight', ''),
            plant.get('toleratedlight', ''),
            plant.get('watering', ''),
            wateringperiod,
            plant.get('ai_label_en', ''),
            plant.get('ai_label_ko', ''),
            plant.get('ideallight_ko', ''),
            plant.get('toleratedlight_ko', ''),
            plant.get('watering_ko', '')
        ))

        logger.debug(f'추가: ID {plant.get("id")} - {plant.get("ai_label_en")} (한글: {plant.get("ai_label_ko")})')

    conn.commit()
    conn.close()

    logger.info(f'\n총 {len(labeled_plants)}개 식물을 plants 테이블에 로드했습니다!')


if __name__ == '__main__':
    load_plants_with_ai_labels()
