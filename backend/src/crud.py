"""
데이터베이스 CRUD 함수
"""

import sqlite3
from datetime import datetime, timedelta


def get_db_connection(db_path):
    # 데이터베이스 연결
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # 딕셔너리처럼 사용 가능
    return conn


def create_user(db_path, name):
    # 사용자 생성
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("INSERT INTO users (name) VALUES (?)", (name,))

    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    print(f"사용자 생성: ID={user_id}, 이름={name}")
    return user_id


def get_user(db_path, user_id):
    # 사용자 조회
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id))

    user = cursor.fetchone()
    conn.close()

    return dict(user) if user else None


def get_all_plants(db_path):
    # 전체 식물 목록
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM plants")
    plants = cursor.fetchall()
    conn.close()

    return [dict(plant) for plant in plants]


def get_plant_by_id(db_path, plant_id):
    # 특정 식물 조회
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM plants WHERE id = ?", (plant_id,))

    plant = cursor.fetchone()
    conn.close()

    return dict(plant) if plant else None


def search_plants(db_path, keyword):
    # 식물 검색 (이름)
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM plants WHERE common_name LIKE ? OR latin_name LIKE ?", (f"%{keyword}%", f"%{keyword}%")
    )

    plants = cursor.fetchall()
    conn.close()

    return [dict(plant) for plant in plants]


def add_user_plant(db_path, user_id, plant_id, nickname=None, watering_cycle=None):
    # 사용자에게 식물 추가
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    # 식물 기본 정보 가져오기
    plant = get_plant_by_id(db_path, plant_id)
    if not plant:
        conn.close()
        return None
    # 물주기 주기 설정
    cycle = watering_cycle if watering_cycle else plant["watering_days"]

    # 다음 물주기 날짜 계산
    today = datetime.now().date()
    next_watering = today + timedelta(days=cycle)

    cursor.execute(
        """
        INSERT INTO user_plants 
        (user_id, plant_id, nickname, last_watered, next_watering, watering_cycle)
        VALUES (?, ?, ?, ?, ?, ?)
    """,
        (user_id, plant_id, nickname, str(today), str(next_watering), cycle),
    )

    user_plant_id = cursor.lastrowid
    conn.commit()
    conn.close()

    print(f"식물 추가: user_id={user_id}, plant_id={plant_id}, nickname={nickname}")
    return user_plant_id


def get_user_plants(db_path, user_id):
    # 사용자가 키우는 식물 목록
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT 
            up.*,
            p.common_name,
            p.latin_name,
            p.watering_amount
        FROM user_plants up
        JOIN plants p ON up.plant_id = p.id
        WHERE up.user_id = ?
    """,
        (user_id,),
    )

    user_plants = cursor.fetchall()
    conn.close()

    return [dict(up) for up in user_plants]


def update_watering(db_path, user_plant_id):
    # 물주기 기록
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    # 현재 정보 가져오기
    cursor.execute("SELECT watering_cycle FROM user_plants WHERE id = ?", (user_plant_id,))
    result = cursor.fetchone()

    if not result:
        conn.close()
        return False

    cycle = result["watering_cycle"]
    today = datetime.now().date()
    next_watering = today + timedelta(days=cycle)

    # 업데이트
    cursor.execute(
        """
        UPDATE user_plants 
        SET last_watered = ?, next_watering = ?
        WHERE id = ?
    """,
        (str(today), str(next_watering), user_plant_id),
    )

    conn.commit()
    conn.close()

    print(f"물주기 기록: user_plant_id={user_plant_id}, 다음={next_watering}")
    return True


def delete_user_plant(db_path, user_plant_id):
    # 사용자 식물 삭제
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("DELETE FROM user_plants WHERE id = ?", (user_plant_id,))

    conn.commit()
    conn.close()

    print(f"식물 삭제: user_plant_id={user_plant_id}")
    return True


if __name__ == "__main__":
    import os

    current_dir = os.path.dirname(__file__)
    parent_dir = os.path.dirname(current_dir)
    db_path = os.path.join(parent_dir, "database", "plants.db")

    print("CRUD 테스트\n")

    # 1. 사용자 생성
    print("1. 사용자 생성")
    user_id = create_user(db_path, "태호")
    print()

    # 2. 식물 검색
    print("2. 식물 검색 (Monstera)")
    plants = search_plants(db_path, "Monstera")
    if plants:
        print(f"   검색 결과: {len(plants)}개")
        print(f"   첫 번째: {plants[0]['common_name']}")
    print()

    # 3. 사용자에게 식물 추가
    print("3. 사용자에게 식물 추가")
    up_id = add_user_plant(db_path, user_id, 0, "우리집 립스틱")
    print()

    # 4. 사용자 식물 목록
    print("4. 사용자 식물 목록")
    user_plants = get_user_plants(db_path, user_id)
    for up in user_plants:
        print(f"   - {up['common_name']} (별명: {up['nickname']})")
        print(f"     다음 물주기: {up['next_watering']}")
    print()

    # 5. 물주기 기록
    print("5. 물주기 기록")
    update_watering(db_path, up_id)
    print()

    print("테스트 완료!")
