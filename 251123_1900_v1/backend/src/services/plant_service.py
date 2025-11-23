"""
Plant Service - 식물 비즈니스 로직
"""

from typing import List, Optional
from models import Plant
from repositories import PlantRepository


class PlantService:
    # 식물 비즈니스 로직 계층

    def __init__(self, plant_repository: PlantRepository = None):
        self.plant_repo = plant_repository or PlantRepository()

    def get_all(self) -> List[dict]:
        # 전체 식물 목록 조회
        plants = self.plant_repo.find_all()
        return [plant.to_dict() for plant in plants]

    def get_by_id(self, plant_id: int) -> Optional[dict]:
        # 특정 식물 조회
        plant = self.plant_repo.find_by_id(plant_id)
        return plant.to_dict() if plant else None

    def search(self, keyword: str) -> List[dict]:
        # 식물 검색
        if not keyword or len(keyword.strip()) == 0:
            return []

        plants = self.plant_repo.search(keyword)
        return [plant.to_dict() for plant in plants]
