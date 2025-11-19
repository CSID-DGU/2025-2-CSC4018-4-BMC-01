"""
User Service - 사용자 비즈니스 로직
"""

from typing import Optional
from models import User
from repositories import UserRepository


class UserService:
    # 사용자 비즈니스 로직 계층

    def __init__(self, user_repository: UserRepository = None):
        self.user_repo = user_repository or UserRepository()

    def create(self, name: str) -> dict:
        # 사용자 생성
        if not name or len(name.strip()) == 0:
            raise ValueError("이름은 필수입니다")

        user_id = self.user_repo.save(name.strip())
        return {"id": user_id, "name": name.strip()}

    def get_by_id(self, user_id: int) -> Optional[dict]:
        # 사용자 조회
        user = self.user_repo.find_by_id(user_id)
        return user.to_dict() if user else None
