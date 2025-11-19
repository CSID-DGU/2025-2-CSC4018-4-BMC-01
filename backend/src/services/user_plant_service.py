"""
UserPlant Service - 사용자-식물 비즈니스 로직
"""

from typing import List
from repositories import UserPlantRepository, PlantRepository


class UserPlantService:
    # 사용자-식물 관계 비즈니스 로직 계층

    def __init__(self, user_plant_repository: UserPlantRepository = None, plant_repository: PlantRepository = None):
        self.user_plant_repo = user_plant_repository or UserPlantRepository()
        self.plant_repo = plant_repository or PlantRepository()

    def add_plant(self, user_id: int, plant_id: int, nickname: str = None, watering_cycle: int = None) -> dict:
        """사용자에게 식물 추가"""
        # 식물 존재 여부 확인
        plant = self.plant_repo.find_by_id(plant_id)
        if not plant:
            raise ValueError(f"식물을 찾을 수 없습니다: {plant_id}")

        user_plant_id = self.user_plant_repo.save(user_id, plant_id, nickname, watering_cycle)

        return {"id": user_plant_id}

    def get_user_plants(self, user_id: int) -> List[dict]:
        """사용자의 식물 목록 조회"""
        return self.user_plant_repo.find_by_user(user_id)

    def record_watering(self, user_plant_id: int) -> bool:
        """물주기 기록"""
        success = self.user_plant_repo.update_watering(user_plant_id)
        if not success:
            raise ValueError(f"식물을 찾을 수 없습니다: {user_plant_id}")
        return True

    def remove_plant(self, user_plant_id: int) -> None:
        """사용자 식물 삭제"""
        self.user_plant_repo.delete(user_plant_id)
