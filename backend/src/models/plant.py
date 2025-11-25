"""
Plant 도메인 모델
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class Plant:
    # 식물 정보 도메인 객체

    id: int
    tempmax_celsius: Optional[float] = None
    tempmin_celsius: Optional[float] = None
    ideallight: Optional[str] = None
    toleratedlight: Optional[str] = None
    watering: Optional[str] = None
    wateringperiod: Optional[int] = None
    ai_label_en: Optional[str] = None
    ai_label_ko: Optional[str] = None
    ideallight_ko: Optional[str] = None
    toleratedlight_ko: Optional[str] = None
    watering_ko: Optional[str] = None

    @classmethod
    def from_dict(cls, data: dict):
        # 딕셔너리에서 Plant 객체 생성
        return cls(
            id=data.get("id"),
            tempmax_celsius=data.get("tempmax_celsius"),
            tempmin_celsius=data.get("tempmin_celsius"),
            ideallight=data.get("ideallight"),
            toleratedlight=data.get("toleratedlight"),
            watering=data.get("watering"),
            wateringperiod=data.get("wateringperiod"),
            ai_label_en=data.get("ai_label_en"),
            ai_label_ko=data.get("ai_label_ko"),
            ideallight_ko=data.get("ideallight_ko"),
            toleratedlight_ko=data.get("toleratedlight_ko"),
            watering_ko=data.get("watering_ko"),
        )

    def to_dict(self) -> dict:
        # Plant 객체를 딕셔너리로 변환 (JSON 응답용)
        return {
            "id": self.id,
            "tempmax_celsius": self.tempmax_celsius,
            "tempmin_celsius": self.tempmin_celsius,
            "ideallight": self.ideallight,
            "toleratedlight": self.toleratedlight,
            "watering": self.watering,
            "wateringperiod": self.wateringperiod,
            "ai_label_en": self.ai_label_en,
            "ai_label_ko": self.ai_label_ko,
            "ideallight_ko": self.ideallight_ko,
            "toleratedlight_ko": self.toleratedlight_ko,
            "watering_ko": self.watering_ko,
        }
