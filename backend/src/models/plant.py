"""
Plant 도메인 모델
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class Plant:
    # 식물 정보 도메인 객체

    id: int
    latin_name: str
    common_name: str
    family: Optional[str] = None
    category: Optional[str] = None
    origin: Optional[str] = None
    climate: Optional[str] = None
    temp_min: Optional[float] = None
    temp_max: Optional[float] = None
    ideal_light: Optional[str] = None
    tolerated_light: Optional[str] = None
    watering_desc: Optional[str] = None
    watering_days: Optional[int] = None
    watering_amount: Optional[str] = None
    insects: Optional[str] = None
    use_category: Optional[str] = None

    @classmethod
    def from_dict(cls, data: dict):
        # 딕셔너리에서 Plant 객체 생성
        return cls(
            id=data.get("id"),
            latin_name=data.get("latin_name"),
            common_name=data.get("common_name"),
            family=data.get("family"),
            category=data.get("category"),
            origin=data.get("origin"),
            climate=data.get("climate"),
            temp_min=data.get("temp_min_celsius"),
            temp_max=data.get("temp_max_celsius"),
            ideal_light=data.get("ideal_light"),
            tolerated_light=data.get("tolerated_light"),
            watering_desc=data.get("watering_desc"),
            watering_days=data.get("watering_days"),
            watering_amount=data.get("watering_amount"),
            insects=data.get("insects"),
            use_category=data.get("use_category"),
        )

    def to_dict(self) -> dict:
        # Plant 객체를 딕셔너리로 변환 (JSON 응답용)
        return {
            "id": self.id,
            "latin_name": self.latin_name,
            "common_name": self.common_name,
            "family": self.family,
            "category": self.category,
            "origin": self.origin,
            "climate": self.climate,
            "temp_min": self.temp_min,
            "temp_max": self.temp_max,
            "ideal_light": self.ideal_light,
            "tolerated_light": self.tolerated_light,
            "watering_desc": self.watering_desc,
            "watering_days": self.watering_days,
            "watering_amount": self.watering_amount,
            "insects": self.insects,
            "use_category": self.use_category,
        }
