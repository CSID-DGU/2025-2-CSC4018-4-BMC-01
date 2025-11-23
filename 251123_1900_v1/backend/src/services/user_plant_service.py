"""
UserPlant Service - 사용자-식물 비즈니스 로직
"""

import json
from typing import List, Optional
from repositories import UserPlantRepository, PlantRepository
from config import Config


class UserPlantService:
    # 사용자-식물 관계 비즈니스 로직 계층

    def __init__(self, user_plant_repository: UserPlantRepository = None, plant_repository: PlantRepository = None):
        self.user_plant_repo = user_plant_repository or UserPlantRepository()
        self.plant_repo = plant_repository or PlantRepository()
        self._plant_care_data = None

    def _load_plant_care_data(self) -> list:
        """house_plants_updated.json 데이터 로드 (캐싱)"""
        if self._plant_care_data is None:
            with open(Config.UPDATED_DATA_PATH, 'r', encoding='utf-8') as f:
                self._plant_care_data = json.load(f)
        return self._plant_care_data

    def _get_care_info_by_label(self, label_ko: str) -> Optional[dict]:
        """AI 라벨(한국어)로 관리 정보 찾기"""
        plants = self._load_plant_care_data()
        for plant in plants:
            if plant.get('ai_label_ko') == label_ko:
                return {
                    'tempmax_celsius': plant.get('tempmax', {}).get('celsius'),
                    'tempmin_celsius': plant.get('tempmin', {}).get('celsius'),
                    'light_info': plant.get('ideallight'),
                    'watering_info': plant.get('watering')
                }
        return None

    def add_plant(
        self,
        user_id: int,
        plant_id: int = None,
        nickname: str = None,
        image: str = None,
        species_label: str = None,
        species_label_ko: str = None,
        watering_cycle: int = None,
    ) -> dict:
        """사용자에게 식물 추가"""
        # plant_id가 있는 경우에만 식물 존재 여부 확인
        if plant_id is not None:
            plant = self.plant_repo.find_by_id(plant_id)
            if not plant:
                raise ValueError(f"식물을 찾을 수 없습니다: {plant_id}")

        # AI 라벨이 있는 경우 관리 정보 찾기
        care_info = None
        if species_label_ko:
            care_info = self._get_care_info_by_label(species_label_ko)

        # 관리 정보 저장 (AI 라벨이 있고 매칭되는 정보가 있을 때만)
        user_plant_id = self.user_plant_repo.save(
            user_id=user_id,
            plant_id=plant_id,
            nickname=nickname,
            image=image,
            species_label=species_label,
            species_label_ko=species_label_ko,
            watering_cycle=watering_cycle,
            tempmax_celsius=care_info['tempmax_celsius'] if care_info else None,
            tempmin_celsius=care_info['tempmin_celsius'] if care_info else None,
            light_info=care_info['light_info'] if care_info else None,
            watering_info=care_info['watering_info'] if care_info else None
        )

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

    def update_plant(self, user_plant_id: int, nickname: str = None, watering_cycle: int = None, last_watered: str = None, image: str = None) -> bool:
        """사용자 식물 정보 수정"""
        success = self.user_plant_repo.update(user_plant_id, nickname=nickname, image=image, watering_cycle=watering_cycle, last_watered=last_watered)
        if not success:
            raise ValueError(f"식물을 찾을 수 없습니다: {user_plant_id}")
        return True

    def remove_plant(self, user_plant_id: int) -> None:
        """사용자 식물 삭제"""
        self.user_plant_repo.delete(user_plant_id)
