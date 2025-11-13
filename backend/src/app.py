"""
Flask API 서버
"""

from weather import get_weather

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from crud import (
    get_all_plants,
    get_plant_by_id,
    search_plants,
    create_user,
    get_user,
    add_user_plant,
    get_user_plants,
    update_watering,
    delete_user_plant,
)

app = Flask(__name__)
CORS(app)  # CORS 허용 (클라이언트 접근 가능)

# DB 경로 설정
current_dir = os.path.dirname(__file__)
parent_dir = os.path.dirname(current_dir)
DB_PATH = os.path.join(parent_dir, "database", "plants.db")


# 식물 관련 API


@app.route("/api/plants", methods=["GET"])
def api_get_plants():
    # 전체 식물 목록
    try:
        plants = get_all_plants(DB_PATH)
        return jsonify({"success": True, "count": len(plants), "data": plants})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/plants/<int:plant_id>", methods=["GET"])
def api_get_plant(plant_id):
    # 특정 식물 조회
    try:
        plant = get_plant_by_id(DB_PATH, plant_id)
        if plant:
            return jsonify({"success": True, "data": plant})
        else:
            return jsonify({"success": False, "error": "Plant not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/plants/search", methods=["GET"])
def api_search_plants():
    # 식물 검색
    try:
        keyword = request.args.get("q", "")
        if not keyword:
            return jsonify({"success": False, "error": "Query parameter required"}), 400

        plants = search_plants(DB_PATH, keyword)
        return jsonify({"success": True, "count": len(plants), "data": plants})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# 사용자 관련 API


@app.route("/api/users", methods=["POST"])
def api_create_user():
    # 사용자 생성
    try:
        data = request.get_json()
        name = data.get("name")

        if not name:
            return jsonify({"success": False, "error": "Name required"}), 400

        user_id = create_user(DB_PATH, name)
        return jsonify({"success": True, "data": {"id": user_id, "name": name}}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/users/<int:user_id>", methods=["GET"])
def api_get_user(user_id):
    # 사용자 조회
    try:
        user = get_user(DB_PATH, user_id)
        if user:
            return jsonify({"success": True, "data": user})
        else:
            return jsonify({"success": False, "error": "User not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# 사용자-식물 관련 API


@app.route("/api/users/<int:user_id>/plants", methods=["POST"])
def api_add_user_plant(user_id):
    # 사용자에게 식물 추가
    try:
        data = request.get_json()
        plant_id = data.get("plant_id")
        nickname = data.get("nickname")
        watering_cycle = data.get("watering_cycle")

        if plant_id is None:
            return jsonify({"success": False, "error": "plant_id required"}), 400

        up_id = add_user_plant(DB_PATH, user_id, plant_id, nickname, watering_cycle)
        if up_id:
            return jsonify({"success": True, "data": {"id": up_id}}), 201
        else:
            return jsonify({"success": False, "error": "Plant not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/users/<int:user_id>/plants", methods=["GET"])
def api_get_user_plants(user_id):
    # 사용자 식물 목록
    try:
        user_plants = get_user_plants(DB_PATH, user_id)
        return jsonify({"success": True, "count": len(user_plants), "data": user_plants})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/user-plants/<int:user_plant_id>/water", methods=["PUT"])
def api_update_watering(user_plant_id):
    # 물주기 기록
    try:
        success = update_watering(DB_PATH, user_plant_id)
        if success:
            return jsonify({"success": True, "message": "Watering recorded"})
        else:
            return jsonify({"success": False, "error": "UserPlant not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/user-plants/<int:user_plant_id>", methods=["DELETE"])
def api_delete_user_plant(user_plant_id):
    # 사용자 식물 삭제
    try:
        delete_user_plant(DB_PATH, user_plant_id)
        return jsonify({"success": True, "message": "Plant deleted"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# 기상청 API


@app.route("/api/weather", methods=["GET"])
def api_get_weather():
    # 날씨 정보 (GPS 지원)
    try:
        # GPS 좌표 받기 (없으면 서울 기본값)
        lat = request.args.get("lat", type=float, default=37.5665)
        lon = request.args.get("lon", type=float, default=126.9780)

        weather = get_weather(lat, lon)

        if weather:
            return jsonify({"success": True, "data": weather})
        else:
            return jsonify({"success": False, "error": "Weather unavailable"}), 503
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# 서버 실행

if __name__ == "__main__":
    print("Flask 서버 시작")
    app.run(debug=True, host="0.0.0.0", port=5000)
