"""
Plant Repository - 식물 데이터 접근
"""

import sqlite3
from typing import List, Optional
from models import Plant
from config import Config


class PlantRepository:
    # 식물 데이터베이스 접근 계층

    def __init__(self, db_path: str = Config.DB_PATH):
        self.db_path = db_path

    def find_all(self) -> List[Plant]:
        # 전체 식물 조회
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM plants")
        rows = cursor.fetchall()
        conn.close()

        return [Plant.from_dict(dict(row)) for row in rows]

    def find_by_id(self, plant_id: int) -> Optional[Plant]:
        # ID로 식물 조회
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM plants WHERE id = ?", (plant_id,))
        row = cursor.fetchone()
        conn.close()

        return Plant.from_dict(dict(row)) if row else None

    def search(self, keyword: str) -> List[Plant]:
        # 키워드로 식물 검색 (한글/영문 AI 라벨로 검색)
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        query = """
            SELECT * FROM plants
            WHERE ai_label_ko LIKE ? OR ai_label_en LIKE ?
        """
        search_term = f"%{keyword}%"
        cursor.execute(query, (search_term, search_term))
        rows = cursor.fetchall()
        conn.close()

        return [Plant.from_dict(dict(row)) for row in rows]
