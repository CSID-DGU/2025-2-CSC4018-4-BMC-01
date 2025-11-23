"""
Weather Service - 날씨 비즈니스 로직
"""

import requests
from datetime import datetime, timedelta
import math
from config import Config


class WeatherService:
    # 날씨 비즈니스 로직 계층

    def __init__(self):
        self.api_key = Config.WEATHER_API_KEY
        self.api_url = Config.WEATHER_API_URL

    def get_weather(self, lat: float = 37.5665, lon: float = 126.9780) -> dict:
        # 날씨 정보 조회
        try:
            nx, ny = self._convert_to_grid(lat, lon)
            base_date, base_time = self._get_base_time()

            params = {
                "serviceKey": self.api_key,
                "pageNo": "1",
                "numOfRows": "100",
                "dataType": "JSON",
                "base_date": base_date,
                "base_time": base_time,
                "nx": nx,
                "ny": ny,
            }

            response = requests.get(self.api_url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            if data["response"]["header"]["resultCode"] != "00":
                raise Exception(f"API 에러: {data['response']['header']['resultMsg']}")

            return self._parse_weather_data(data, lat, lon, nx, ny)

        except Exception as e:
            raise Exception(f"날씨 조회 실패: {str(e)}")

    def _convert_to_grid(self, lat: float, lon: float) -> tuple:
        # 위경도를 격자 좌표로 변환
        RE = 6371.00877
        GRID = 5.0
        SLAT1 = 30.0
        SLAT2 = 60.0
        OLON = 126.0
        OLAT = 38.0
        XO = 43
        YO = 136

        DEGRAD = math.pi / 180.0

        re = RE / GRID
        slat1 = SLAT1 * DEGRAD
        slat2 = SLAT2 * DEGRAD
        olon = OLON * DEGRAD
        olat = OLAT * DEGRAD

        sn = math.tan(math.pi * 0.25 + slat2 * 0.5) / math.tan(math.pi * 0.25 + slat1 * 0.5)
        sn = math.log(math.cos(slat1) / math.cos(slat2)) / math.log(sn)
        sf = math.tan(math.pi * 0.25 + slat1 * 0.5)
        sf = math.pow(sf, sn) * math.cos(slat1) / sn
        ro = math.tan(math.pi * 0.25 + olat * 0.5)
        ro = re * sf / math.pow(ro, sn)

        ra = math.tan(math.pi * 0.25 + lat * DEGRAD * 0.5)
        ra = re * sf / math.pow(ra, sn)

        theta = lon * DEGRAD - olon
        if theta > math.pi:
            theta -= 2.0 * math.pi
        if theta < -math.pi:
            theta += 2.0 * math.pi
        theta *= sn

        nx = int(ra * math.sin(theta) + XO + 0.5)
        ny = int(ro - ra * math.cos(theta) + YO + 0.5)

        return nx, ny

    def _get_base_time(self) -> tuple:
        # API 호출용 기준 시간 계산
        now = datetime.now()
        base_times = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"]
        current = now.hour * 100 + now.minute

        for base_time in reversed(base_times):
            if current >= int(base_time) + 10:
                return now.strftime("%Y%m%d"), base_time

        yesterday = now - timedelta(days=1)
        return yesterday.strftime("%Y%m%d"), "2300"

    def _parse_weather_data(self, data: dict, lat: float, lon: float, nx: int, ny: int) -> dict:
        # 날씨 데이터 파싱
        items = data["response"]["body"]["items"]["item"]

        now = datetime.now()
        target_time = (now + timedelta(hours=1)).strftime("%H00")
        target_date = now.strftime("%Y%m%d")

        weather_data = {}
        for item in items:
            if item["fcstDate"] == target_date and item["fcstTime"] == target_time:
                category = item["category"]
                value = item["fcstValue"]

                if category == "TMP":
                    weather_data["temp"] = float(value)
                elif category == "REH":
                    weather_data["humidity"] = int(value)
                elif category == "SKY":
                    sky_codes = {"1": "맑음", "3": "구름많음", "4": "흐림"}
                    weather_data["sky"] = sky_codes.get(value, "알수없음")
                elif category == "PTY":
                    pty_codes = {"0": "없음", "1": "비", "2": "비/눈", "3": "눈", "4": "소나기"}
                    weather_data["precipitation"] = pty_codes.get(value, "없음")
                elif category == "POP":
                    weather_data["rain_prob"] = int(value)

        return {
            "lat": lat,
            "lon": lon,
            "grid": {"nx": nx, "ny": ny},
            "temp": weather_data.get("temp", 0),
            "humidity": weather_data.get("humidity", 0),
            "sky": weather_data.get("sky", "알수없음"),
            "precipitation": weather_data.get("precipitation", "없음"),
            "rain_probability": weather_data.get("rain_prob", 0),
            "description": f"{weather_data.get('sky', '')} ({weather_data.get('precipitation', '')})",
        }
