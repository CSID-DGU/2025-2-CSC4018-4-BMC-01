# 어플리케이션 설정

import os


class Config:

    # DB 경로
    BASE_DIR = os.path.dirname(os.path.dirname(__file__))
    DB_PATH = os.path.join(BASE_DIR, "database", "plants.db")
    UPDATED_DATA_PATH = os.path.join(BASE_DIR, "data", "house_plants_updated.json")

    # Flask 설정
    FLASK_HOST = "0.0.0.0"
    FLASK_PORT = 5000
    FLASK_DEBUG = True

    # 기상청 API
    WEATHER_API_KEY = "5621048a47e5a1f37bdb05a7dd8c567dca6034fbde9af3a9cd320293cfff84dc"
    WEATHER_API_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
