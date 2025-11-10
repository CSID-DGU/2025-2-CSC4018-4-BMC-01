"""
데이터베이스 CRUD 함수
"""

import sqlite3
from datetime import datatime, timedelta


def get_db_connection(db_path):
    # 데이터베이스 연결
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn
