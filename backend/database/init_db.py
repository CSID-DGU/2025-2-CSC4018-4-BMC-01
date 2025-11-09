"""
데이터베이스 초기화 스크립트
- SQLite DB 파일 생성
- schema.sql 실행하여 테이블 생성
"""

import sqlite3
import os  # 파일 경로 처리


def init_database():
    # 경로 설정
    current_dir = os.path.dirname(__file__)  # database/ 폴더
    db_path = os.path.join(current_dir, 'plants.db')
    schema_path = os.path.join(current_dir, 'schema.sql')
    
    # 기존 DB 삭제 
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"기존 DB 삭제: {db_path}")
    
    # SQLite 연결 
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # schema.sql 파일 읽기
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    
    # SQL 실행
    cursor.executescript(schema_sql)
    
    # 저장 및 연결 종료
    conn.commit()
    conn.close()
    
    print(f"DB 초기화 완료: {db_path}")
    print(f"생성된 테이블: plants")
    
    return db_path


if __name__ == "__main__":
    init_database()