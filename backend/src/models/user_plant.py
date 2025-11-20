"""
UserPlant 도메인 모델
"""

from dataclasses import dataclass
from typing import Optional
from datetime import date


@dataclass
class UserPlant:
    # 사용자-식물 관계 도메인 객체

    id: int
    user_id: int
    plant_id: int
    nickname: Optional[str] = None
    image: Optional[str] = None
    species_label: Optional[str] = None
    species_label_ko: Optional[str] = None
    disease: Optional[str] = None
    watering_cycle: Optional[int] = None
    last_watered: Optional[date] = None
    next_watering: Optional[date] = None

    @classmethod
    def from_dict(cls, data: dict):
        # 딕셔너리에서 UserPlant 객체 생성
        return cls(
            id=data.get("id"),
            user_id=data.get("user_id"),
            plant_id=data.get("plant_id"),
            nickname=data.get("nickname"),
            image=data.get("image"),
            species_label=data.get("species_label"),
            species_label_ko=data.get("species_label_ko"),
            disease=data.get("disease"),
            watering_cycle=data.get("watering_cycle"),
            last_watered=data.get("last_watered"),
            next_watering=data.get("next_watering"),
        )

    def to_dict(self) -> dict:
        # UserPlant 객체를 딕셔너리로 변환
        return {
            "id": self.id,
            "user_id": self.user_id,
            "plant_id": self.plant_id,
            "nickname": self.nickname,
            "image": self.image,
            "species_label": self.species_label,
            "species_label_ko": self.species_label_ko,
            "disease": self.disease,
            "watering_cycle": self.watering_cycle,
            "last_watered": str(self.last_watered) if self.last_watered else None,
            "next_watering": str(self.next_watering) if self.next_watering else None,
        }
