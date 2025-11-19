"""
JSON 파싱 유틸리티
"""


def parse_plant_data(json_data: dict) -> dict:
    # JSON 데이터를 DB 삽입용 형식으로 변환
    return {
        "latin_name": json_data.get("Latin name"),
        "common_name": json_data.get("Common name", [None])[0],
        "family": json_data.get("Family"),
        "category": json_data.get("Categories"),
        "origin": json_data.get("Origin", [None])[0],
        "climate": json_data.get("Climate"),
        "temp_min_celsius": json_data.get("Temp min", {}).get("Celsius"),
        "temp_max_celsius": json_data.get("Temp max", {}).get("Celsius"),
        "ideal_light": json_data.get("Ideal light", [None])[0],
        "tolerated_light": json_data.get("Tolerated light", [None])[0],
        "watering_desc": json_data.get("Watering"),
        "watering_amount": parse_watering_amount(json_data.get("Watering")),
        "watering_days": parse_watering_days(json_data.get("Watering")),
        "insects": ", ".join(json_data.get("Insects", [])) if json_data.get("Insects") else None,
        "use_category": json_data.get("Use"),
    }


def parse_watering_days(watering_text: str) -> int:
    # 물주기 주기 추출
    if not watering_text:
        return None

    text_lower = watering_text.lower()

    if "daily" in text_lower or "every day" in text_lower:
        return 1
    elif "every other day" in text_lower or "every 2" in text_lower:
        return 2
    elif "every 3" in text_lower:
        return 3
    elif "twice a week" in text_lower:
        return 3
    elif "weekly" in text_lower or "once a week" in text_lower or "every week" in text_lower:
        return 7
    elif "every 10" in text_lower:
        return 10
    elif "every 2 weeks" in text_lower or "biweekly" in text_lower or "fortnightly" in text_lower:
        return 14
    elif "monthly" in text_lower or "once a month" in text_lower or "every month" in text_lower:
        return 30

    return None


def parse_watering_amount(watering_text: str) -> str:
    # 물주기 양 추출
    if not watering_text:
        return None

    text_lower = watering_text.lower()

    if "generously" in text_lower or "abundantly" in text_lower:
        return "high"
    elif "moderately" in text_lower or "regularly" in text_lower:
        return "medium"
    elif "sparingly" in text_lower or "little" in text_lower:
        return "low"

    return "medium"
