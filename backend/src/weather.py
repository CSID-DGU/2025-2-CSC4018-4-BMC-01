"""
기상청 단기예보 API 연동 (GPS 지원)
"""

import requests
from datetime import datetime, timedelta
import math


API_KEY = "5621048a47e5a1f37bdb05a7dd8c567dca6034fbde9af3a9cd320293cfff84dc"
BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"


def convert_to_grid(lat, lon):
    """
    위경도를 기상청 격자 좌표로 변환

    Args:
        lat: 위도
        lon: 경도

    Returns:
        tuple: (nx, ny)
    """
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


def get_base_time():
    """
    단기예보 기준 시간 계산

    발표 시각: 02:10, 05:10, 08:10, 11:10, 14:10, 17:10, 20:10, 23:10
    """
    now = datetime.now()

    base_times = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"]
    current = now.hour * 100 + now.minute

    for base_time in reversed(base_times):
        # 발표 후 10분 이후부터 조회 가능
        if current >= int(base_time) + 10:
            return now.strftime("%Y%m%d"), base_time

    # 이전 날 마지막 발표
    yesterday = now - timedelta(days=1)
    return yesterday.strftime("%Y%m%d"), "2300"


def get_weather(lat=37.5665, lon=126.9780):
    """
    단기예보 조회

    Args:
        lat: 위도 (기본: 서울)
        lon: 경도 (기본: 서울)
    """
    try:
        # 위경도를 격자 좌표로 변환
        nx, ny = convert_to_grid(lat, lon)

        base_date, base_time = get_base_time()

        params = {
            "serviceKey": API_KEY,
            "pageNo": "1",
            "numOfRows": "100",
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
        }

        response = requests.get(BASE_URL, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        # 에러 체크
        result_code = data["response"]["header"]["resultCode"]
        if result_code != "00":
            error_msg = data["response"]["header"]["resultMsg"]
            print(f"API 에러: {error_msg}")
            return None

        items = data["response"]["body"]["items"]["item"]

        # 가장 가까운 시간의 데이터 추출
        now = datetime.now()
        target_time = (now + timedelta(hours=1)).strftime("%H00")
        target_date = now.strftime("%Y%m%d")

        weather_data = {}
        for item in items:
            if item["fcstDate"] == target_date and item["fcstTime"] == target_time:
                category = item["category"]
                value = item["fcstValue"]

                if category == "TMP":  # 기온
                    weather_data["temp"] = float(value)
                elif category == "REH":  # 습도
                    weather_data["humidity"] = int(value)
                elif category == "SKY":  # 하늘상태
                    sky_codes = {"1": "맑음", "3": "구름많음", "4": "흐림"}
                    weather_data["sky"] = sky_codes.get(value, "알수없음")
                elif category == "PTY":  # 강수형태
                    pty_codes = {"0": "없음", "1": "비", "2": "비/눈", "3": "눈", "4": "소나기"}
                    weather_data["precipitation"] = pty_codes.get(value, "없음")
                elif category == "POP":  # 강수확률
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

    except Exception as e:
        print(f"날씨 API 에러: {e}")
        import traceback

        traceback.print_exc()
        return None


if __name__ == "__main__":
    print("기상청 단기예보 테스트\n")

    base_date, base_time = get_base_time()
    print(f"기준시각: {base_date} {base_time}\n")

    # 서울 테스트
    print("=== 서울 ===")
    weather = get_weather(37.5665, 126.9780)
    if weather:
        print(f"위치: {weather['lat']}, {weather['lon']}")
        print(f"격자: {weather['grid']}")
        print(f"온도: {weather['temp']}°C")
        print(f"습도: {weather['humidity']}%")
        print(f"강수확률: {weather['rain_probability']}%")
        print(f"날씨: {weather['description']}")

    print("\n=== 부산 ===")
    weather = get_weather(35.1796, 129.0756)
    if weather:
        print(f"위치: {weather['lat']}, {weather['lon']}")
        print(f"격자: {weather['grid']}")
        print(f"온도: {weather['temp']}°C")
        print(f"습도: {weather['humidity']}%")
        print(f"강수확률: {weather['rain_probability']}%")
        print(f"날씨: {weather['description']}")
