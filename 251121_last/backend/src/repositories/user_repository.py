"""
User Repository - 사용자 데이터 접근
"""

import sqlite3
from typing import Optional
from models import User
from config import Config


class UserRepository:
    # 사용자 데이터베이스 접근 계층

    def __init__(self, db_path: str = Config.DB_PATH):
        self.db_path = db_path

    def save(self, name: str) -> int:
        # 사용자 생성
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("INSERT INTO users (name) VALUES (?)", (name,))
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return user_id

    def find_by_id(self, user_id: int) -> Optional[User]:
        # ID로 사용자 조회
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()

        return User.from_dict(dict(row)) if row else None
