-- 식물 정보 테이블
CREATE TABLE IF NOT EXISTS plants (
    -- 기본 식별 정보
    id INTEGER PRIMARY KEY,
    latin_name TEXT NOT NULL,
    common_name TEXT NOT NULL,
    family TEXT,
    category TEXT,
    
    -- 원산지/기후 정보
    origin TEXT,
    climate TEXT,
    
    -- 적정 온도 범위
    temp_max_celsius REAL,
    temp_min_celsius REAL,
    
    -- 빛 조건
    ideal_light TEXT,
    tolerated_light TEXT,
    
    -- 물주기 정보 (원본 텍스트 + 파싱 결과)
    watering_desc TEXT,
    watering_days INTEGER,
    watering_amount TEXT,
    
    -- 부가 정보 (JSON 형식)
    insects TEXT,
    use_category TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 검색 성능 향상을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_common_name ON plants(common_name);
CREATE INDEX IF NOT EXISTS idx_latin_name ON plants(latin_name);
CREATE INDEX IF NOT EXISTS idx_category ON plants(category);