"""
UserPlant Repository - 사용자-식물 관계 데이터 접근
"""

import sqlite3
from typing import List, Optional
from datetime import date, timedelta
from models import UserPlant
from config import Config


class UserPlantRepository:
    # 사용자-식물 관계 데이터베이스 접근 계층

    def __init__(self, db_path: str = Config.DB_PATH):
        self.db_path = db_path

    def save(self, user_id: int, plant_id: int, nickname: str = None, watering_cycle: int = None) -> int:
        # 사용자에게 식물 추가
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # 기본 물주기 주기 설정
        if watering_cycle is None:
            cursor.execute("SELECT watering_days FROM plants WHERE id = ?", (plant_id,))
            row = cursor.fetchone()
            watering_cycle = row[0] if row and row[0] else 7

        # 다음 물주기 계산
        today = date.today()
        next_watering = today + timedelta(days=watering_cycle)

        cursor.execute(
            """
            INSERT INTO user_plants 
            (user_id, plant_id, nickname, watering_cycle, last_watered, next_watering)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (user_id, plant_id, nickname, watering_cycle, today, next_watering),
        )

        user_plant_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return user_plant_id

    def find_by_user(self, user_id: int) -> List[dict]:
        # 사용자의 식물 목록 조회 (식물 정보 포함)
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        query = """
            SELECT 
                up.id,
                up.user_id,
                up.plant_id,
                up.nickname,
                up.watering_cycle,
                up.last_watered,
                up.next_watering,
                p.common_name,
                p.latin_name
            FROM user_plants up
            JOIN plants p ON up.plant_id = p.id
            WHERE up.user_id = ?
        """
        cursor.execute(query, (user_id,))
        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    def update_watering(self, user_plant_id: int) -> bool:
        # 물주기 기록
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # 물주기 주기 가져오기
        cursor.execute("SELECT watering_cycle FROM user_plants WHERE id = ?", (user_plant_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return False

        watering_cycle = row[0] or 7
        today = date.today()
        next_watering = today + timedelta(days=watering_cycle)

        cursor.execute(
            """
            UPDATE user_plants 
            SET last_watered = ?, next_watering = ?
            WHERE id = ?
        """,
            (today, next_watering, user_plant_id),
        )

        conn.commit()
        conn.close()
        return True

    def delete(self, user_plant_id: int) -> None:
        # 사용자 식물 삭제
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("DELETE FROM user_plants WHERE id = ?", (user_plant_id,))

        conn.commit()
        conn.close()
