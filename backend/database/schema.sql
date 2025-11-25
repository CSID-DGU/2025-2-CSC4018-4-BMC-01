-- 식물 정보 테이블
CREATE TABLE
  IF NOT EXISTS plants (
    id INTEGER PRIMARY KEY,
    tempmax_celsius REAL,
    tempmin_celsius REAL,
    ideallight TEXT,
    toleratedlight TEXT,
    watering TEXT,
    wateringperiod INTEGER,
    ai_label_en TEXT,
    ai_label_ko TEXT,
    ideallight_ko TEXT,
    toleratedlight_ko TEXT,
    watering_ko TEXT
  );

-- 사용자 테이블
CREATE TABLE
  IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

-- 사용자-식물 관계 테이블
CREATE TABLE
  IF NOT EXISTS user_plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plant_id INTEGER,
    nickname TEXT,
    image TEXT,
    -- AI 분석 결과 필드
    ai_label_en TEXT,
    ai_label_ko TEXT,
    disease TEXT,
    -- 식물 관리 정보
    tempmax_celsius REAL,
    tempmin_celsius REAL,
    ideallight TEXT,
    toleratedlight TEXT,
    watering TEXT,
    -- 물주기 관리
    last_watered DATE,
    next_watering DATE,
    wateringperiod INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_plants_user ON user_plants (user_id);

CREATE INDEX IF NOT EXISTS idx_user_plants_plant ON user_plants (plant_id);