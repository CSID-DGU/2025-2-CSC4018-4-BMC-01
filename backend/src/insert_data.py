"""
식물 데이터 DB 삽입 스크립트
"""

import sqlite3
import os
from parser import load_plants_json, parse_plant


def insert_plants_to_db(db_path, json_path):
    # 파싱된 식물 데이터를 DB에 삽입
    # JSON 데이터 로드
    plants = load_plants_json(json_path)
    
    # DB 연결
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # INSERT 쿼리
    insert_query = """
    INSERT INTO plants (
        id, latin_name, common_name, family, category,
        origin, climate, temp_min_celsius, temp_max_celsius,
        ideal_light, tolerated_light, watering_desc,
        watering_days, watering_amount, insects, use_category
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    
    # 데이터 삽입
    success_count = 0
    for plant_data in plants:
        try:
            parsed = parse_plant(plant_data)
            cursor.execute(insert_query, parsed)
            success_count += 1
        except Exception as e:
            print(f"에러 발생 (ID {plant_data.get('id')}): {e}")
    
    # 저장 및 종료
    conn.commit()
    conn.close()
    
    print(f"\n삽입 완료: {success_count}/{len(plants)}개")
    return success_count


def verify_data(db_path):
    """삽입된 데이터 검증"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 전체 개수 확인
    cursor.execute("SELECT COUNT(*) FROM plants")
    count = cursor.fetchone()[0]
    print(f"\n전체 식물 개수: {count}개")
    
    # 샘플 데이터 확인
    cursor.execute("""
        SELECT id, common_name, watering_days, watering_amount 
        FROM plants 
        LIMIT 5
    """)
    
    print("\n샘플 데이터:")
    for row in cursor.fetchall():
        print(f"  {row[0]}. {row[1]} - {row[2]}일마다, {row[3]}")
    
    conn.close()


if __name__ == "__main__":
    # 경로 설정
    current_dir = os.path.dirname(__file__)
    parent_dir = os.path.dirname(current_dir)
    
    db_path = os.path.join(parent_dir, 'database', 'plants.db')
    json_path = os.path.join(parent_dir, 'data', 'house_plants.json')
    
    print("식물 데이터 삽입 시작\n")
    
    # 삽입 실행
    insert_plants_to_db(db_path, json_path)
    
    # 검증
    verify_data(db_path)
    
    print("\n완료!")