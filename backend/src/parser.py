"""
JSON 식물 데이터 파싱 모듈
"""

import json


def load_plants_json(json_path):
    # JSON 파일에서 식물 데이터 로드
    with open(json_path, "r", encoding="utf-8") as f:
        plants = json.load(f)

    print(f"{len(plants)}개 식물 데이터 로드 완료")
    return plants


def parse_watering(watering_text):
    # 물주기 텍스트를 주기(일)와 양으로 변환
    if not watering_text:
        return 5, "medium"

    text = watering_text.lower()

    # 텍스트 패턴으로 물주기 주기와 양 결정
    if "keep moist" in text or "moist between" in text:
        return 3, "medium"
    elif "dry between" in text or "can be dry" in text:
        return 7, "low"
    elif "keep wet" in text or "constantly moist" in text:
        return 2, "high"
    else:
        return 5, "medium"


def parse_plant(plant_data):
    # JSON 식물 데이터를 DB 삽입 형식으로 변환
    # 물주기 정보 파싱
    watering_days, watering_amount = parse_watering(plant_data.get("watering", ""))

    # 일반명은 리스트의 첫 번째 값 사용
    common_list = plant_data.get("common", ["Unknown"])
    common_name = common_list[0] if common_list else "Unknown"

    # 배열 데이터는 JSON 문자열로 변환
    insects = json.dumps(plant_data.get("insects", []))
    use_category = json.dumps(plant_data.get("use", []))

    # 온도 정보 추출
    temp_max = plant_data.get("tempmax", {}).get("celsius")
    temp_min = plant_data.get("tempmin", {}).get("celsius")

    return (
        plant_data.get("id"),
        plant_data.get("latin"),
        common_name,
        plant_data.get("family"),
        plant_data.get("category"),
        plant_data.get("origin"),
        plant_data.get("climate"),
        temp_min,
        temp_max,
        plant_data.get("ideallight"),
        plant_data.get("toleratedlight"),
        plant_data.get("watering"),
        watering_days,
        watering_amount,
        insects,
        use_category,
    )
