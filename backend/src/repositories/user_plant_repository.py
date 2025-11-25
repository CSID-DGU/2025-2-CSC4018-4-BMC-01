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

    def save(self, user_id: int, plant_id: int = None, nickname: str = None, image: str = None,
             ai_label_en: str = None, ai_label_ko: str = None, wateringperiod: int = None,
             tempmax_celsius: float = None, tempmin_celsius: float = None,
             ideallight: str = None, toleratedlight: str = None, watering: str = None) -> int:
        # 사용자에게 식물 추가
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # 기본 물주기 주기 설정
        if wateringperiod is None:
            if plant_id is not None:
                cursor.execute("SELECT wateringperiod FROM plants WHERE id = ?", (plant_id,))
                row = cursor.fetchone()
                wateringperiod = row[0] if row and row[0] else 7
            else:
                wateringperiod = 7  # plant_id가 없으면 기본값 7일

        # 다음 물주기 계산
        today = date.today()
        next_watering = today + timedelta(days=wateringperiod)

        cursor.execute(
            """
            INSERT INTO user_plants
            (user_id, plant_id, nickname, image, ai_label_en, ai_label_ko,
             wateringperiod, last_watered, next_watering,
             tempmax_celsius, tempmin_celsius, ideallight, toleratedlight, watering)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (user_id, plant_id, nickname, image, ai_label_en, ai_label_ko,
             wateringperiod, today, next_watering,
             tempmax_celsius, tempmin_celsius, ideallight, toleratedlight, watering),
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
                up.image,
                up.ai_label_en,
                up.ai_label_ko,
                up.disease,
                up.wateringperiod,
                up.last_watered,
                up.next_watering,
                up.tempmax_celsius,
                up.tempmin_celsius,
                up.ideallight,
                up.toleratedlight,
                up.watering,
                p.ai_label_en as plant_ai_label_en,
                p.ai_label_ko as plant_ai_label_ko,
                p.ideallight_ko,
                p.toleratedlight_ko,
                p.watering_ko
            FROM user_plants up
            LEFT JOIN plants p ON up.plant_id = p.id
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
        cursor.execute("SELECT wateringperiod FROM user_plants WHERE id = ?", (user_plant_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return False

        wateringperiod = row[0] or 7
        today = date.today()
        next_watering = today + timedelta(days=wateringperiod)

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

    def update(self, user_plant_id: int, nickname: str = None, image: str = None,
               disease: str = None, wateringperiod: int = None, last_watered: str = None) -> bool:
        # 사용자 식물 정보 수정
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # 현재 정보 가져오기
        cursor.execute("SELECT wateringperiod FROM user_plants WHERE id = ?", (user_plant_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return False

        # 업데이트할 필드만 변경
        updates = []
        params = []

        if nickname is not None:
            updates.append("nickname = ?")
            params.append(nickname)

        if image is not None:
            updates.append("image = ?")
            params.append(image)

        if disease is not None:
            updates.append("disease = ?")
            params.append(disease)

        if wateringperiod is not None:
            updates.append("wateringperiod = ?")
            params.append(wateringperiod)

        if last_watered is not None:
            updates.append("last_watered = ?")
            params.append(last_watered)
            # next_watering 계산
            from datetime import datetime
            last_date = datetime.strptime(last_watered, "%Y-%m-%d").date()
            cycle = wateringperiod if wateringperiod else row[0]
            next_date = last_date + timedelta(days=cycle or 7)
            updates.append("next_watering = ?")
            params.append(next_date)

        if not updates:
            conn.close()
            return True

        params.append(user_plant_id)
        query = f"UPDATE user_plants SET {', '.join(updates)} WHERE id = ?"

        cursor.execute(query, params)
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
