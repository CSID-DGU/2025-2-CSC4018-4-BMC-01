"""
User 도메인 모델
"""

from dataclasses import dataclass


@dataclass
class User:
    # 사용자 도메인 객체

    id: int
    name: str

    @classmethod
    def from_dict(cls, data: dict):
        # 딕셔너리에서 User 객체 생성
        return cls(id=data.get("id"), name=data.get("name"))

    def to_dict(self) -> dict:
        # User 객체를 딕셔너리로 변환
        return {"id": self.id, "name": self.name}
