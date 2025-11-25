"""
AI Service - 식물 종류 및 병충해 판별
Google Cloud AI API와 통신하여 이미지 분석
"""

import logging
import requests
from typing import Optional
from repositories import PlantRepository, UserPlantRepository

logger = logging.getLogger(__name__)


class AIService:
    # AI 이미지 분석 서비스

    AI_API_URL = "https://smartpot-api-551846265142.asia-northeast3.run.app/infer"

    def __init__(
        self,
        plant_repository: PlantRepository = None,
        user_plant_repository: UserPlantRepository = None,
    ):
        self.plant_repo = plant_repository or PlantRepository()
        self.user_plant_repo = user_plant_repository or UserPlantRepository()

    def analyze_image(self, image_file) -> dict:
        """
        AI API에 이미지를 전송하여 분석 결과 받기

        Args:
            image_file: 이미지 파일 객체 (Flask request.files['file'])

        Returns:
            dict: AI 분석 결과
            {
                "mode": "plant" 또는 "disease",
                "pred_label": "primula",
                "pred_label_ko": "앵초",
                "confidence": 0.63
            }
        """
        try:
            # 스트림을 처음으로 되돌림 (이미 읽혀진 경우 대비)
            image_file.stream.seek(0)

            # 파일 내용을 읽어서 전송 (스트림 문제 방지)
            file_content = image_file.read()

            # Google Cloud AI API에 맞는 형식으로 전송
            files = {"file": (image_file.filename, file_content, image_file.content_type)}

            logger.debug(f"AI API 요청 전송: {self.AI_API_URL}")
            logger.debug(f"파일명: {image_file.filename}, 크기: {len(file_content)} bytes")

            response = requests.post(self.AI_API_URL, files=files, timeout=30)

            logger.debug(f"AI API 응답 코드: {response.status_code}")
            logger.debug(f"AI API 응답 내용: {response.text[:200]}")

            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "mode": result.get("mode"),
                    "pred_label": result.get("pred_label"),
                    "pred_label_ko": result.get("pred_label_ko"),
                    "confidence": result.get("confidence"),
                }
            else:
                return {"success": False, "error": f"AI API error: {response.status_code}", "details": response.text}

        except requests.exceptions.Timeout:
            return {"success": False, "error": "AI API timeout"}
        except Exception as e:
            logger.error(f"AI 분석 중 예외 발생: {e}")
            return {"success": False, "error": str(e)}

    def analyze_species_only(self, image_file) -> dict:
        """
        식물 종류 분석만 수행 (저장하지 않음)
        사용자가 결과를 확인하고 직접 저장할 수 있도록 분석 결과만 반환

        Args:
            image_file: 이미지 파일 객체

        Returns:
            dict: AI 분석 결과 + plants DB 검색 결과
        """
        # AI 분석
        ai_result = self.analyze_image(image_file)

        if not ai_result.get("success"):
            return ai_result

        pred_label = ai_result.get("pred_label")
        pred_label_ko = ai_result.get("pred_label_ko")

        # plants DB에서 검색
        plants = self.plant_repo.search(pred_label_ko)  # 한글 라벨로 검색

        plant_info = None
        if plants:
            plant = plants[0]
            plant_info = {
                "plant_id": plant.id,
                "ai_label_en": plant.ai_label_en,
                "ai_label_ko": plant.ai_label_ko,
                "wateringperiod": plant.wateringperiod or 7,
                "ideallight": plant.ideallight,
                "toleratedlight": plant.toleratedlight,
                "watering": plant.watering,
                "tempmin_celsius": plant.tempmin_celsius,
                "tempmax_celsius": plant.tempmax_celsius,
            }

        return {
            "success": True,
            "ai_label_en": pred_label,
            "ai_label_ko": pred_label_ko,
            "confidence": ai_result.get("confidence"),
            "plant_info": plant_info,  # DB에서 찾은 식물 정보 (없으면 None)
        }

    def identify_species(self, user_id: int, image_file, nickname: str = None, image_path: str = None) -> dict:
        """
        식물 종류 판별 (mode="plant")
        pred_label로 plants DB 검색 후 user_plant 생성

        Args:
            user_id: 사용자 ID
            image_file: 이미지 파일 객체
            nickname: 식물 닉네임 (선택)
            image_path: 이미지 저장 경로 (선택)

        Returns:
            dict: 생성된 user_plant 정보
        """
        # AI 분석
        ai_result = self.analyze_image(image_file)

        if not ai_result.get("success"):
            return ai_result

        pred_label = ai_result.get("pred_label")
        pred_label_ko = ai_result.get("pred_label_ko")

        # plants DB에서 검색 (한글 라벨로)
        plants = self.plant_repo.search(pred_label_ko)

        if plants:
            # 찾은 식물 사용
            plant = plants[0]
            plant_id = plant.id
            wateringperiod = plant.wateringperiod or 7
        else:
            # 못 찾으면 plant_id=None 사용
            plant_id = None
            wateringperiod = 7

        # user_plant 생성
        user_plant_id = self.user_plant_repo.save(
            user_id=user_id,
            plant_id=plant_id,
            nickname=nickname or pred_label_ko,
            image=image_path,
            ai_label_en=pred_label,
            ai_label_ko=pred_label_ko,
            wateringperiod=wateringperiod,
        )

        # 생성된 정보 조회
        user_plants = self.user_plant_repo.find_by_user(user_id)
        created_plant = next((p for p in user_plants if p["id"] == user_plant_id), None)

        return {
            "success": True,
            "mode": "plant",
            "user_plant": created_plant,
            "ai_result": ai_result,
        }

    def diagnose_disease(self, user_plant_id: int, image_file) -> dict:
        """
        병충해 판별 (mode="disease")
        pred_label_ko를 user_plant의 disease 필드에 저장

        Args:
            user_plant_id: 사용자 식물 ID
            image_file: 이미지 파일 객체

        Returns:
            dict: 병충해 진단 결과
        """
        # AI 분석
        ai_result = self.analyze_image(image_file)

        if not ai_result.get("success"):
            return ai_result

        pred_label_ko = ai_result.get("pred_label_ko")

        # user_plant의 disease 필드 업데이트
        success = self.user_plant_repo.update(user_plant_id=user_plant_id, disease=pred_label_ko)

        if not success:
            return {"success": False, "error": "Failed to update disease information"}

        return {
            "success": True,
            "mode": "disease",
            "user_plant_id": user_plant_id,
            "disease": pred_label_ko,
            "ai_result": ai_result,
        }
