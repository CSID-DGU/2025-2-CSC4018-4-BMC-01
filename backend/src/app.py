"""
Flask API 서버
"""

from flask import Flask, request, jsonify
from flask_cors import CORS

from services import PlantService, UserService, UserPlantService, WeatherService
from config import Config


app = Flask(__name__)
CORS(app)

# Service 인스턴스 생성
plant_service = PlantService()
user_service = UserService()
user_plant_service = UserPlantService()
weather_service = WeatherService()


# ========== 식물 관련 API ==========


@app.route("/api/plants", methods=["GET"])
def api_get_plants():
    # 전체 식물 목록
    try:
        plants = plant_service.get_all()
        return jsonify({"success": True, "count": len(plants), "data": plants})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/plants/<int:plant_id>", methods=["GET"])
def api_get_plant(plant_id):
    # 특정 식물 조회
    try:
        plant = plant_service.get_by_id(plant_id)
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

        plants = plant_service.search(keyword)
        return jsonify({"success": True, "count": len(plants), "data": plants})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ========== 사용자 관련 API ==========


@app.route("/api/users", methods=["POST"])
def api_create_user():
    # 사용자 생성
    try:
        data = request.get_json()
        name = data.get("name")

        if not name:
            return jsonify({"success": False, "error": "Name required"}), 400

        user = user_service.create(name)
        return jsonify({"success": True, "data": user}), 201
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/users/<int:user_id>", methods=["GET"])
def api_get_user(user_id):
    # 사용자 조회
    try:
        user = user_service.get_by_id(user_id)
        if user:
            return jsonify({"success": True, "data": user})
        else:
            return jsonify({"success": False, "error": "User not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ========== 사용자-식물 관련 API ==========


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

        result = user_plant_service.add_plant(user_id, plant_id, nickname, watering_cycle)
        return jsonify({"success": True, "data": result}), 201
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/users/<int:user_id>/plants", methods=["GET"])
def api_get_user_plants(user_id):
    # 사용자 식물 목록
    try:
        user_plants = user_plant_service.get_user_plants(user_id)
        return jsonify({"success": True, "count": len(user_plants), "data": user_plants})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/user-plants/<int:user_plant_id>/water", methods=["PUT"])
def api_update_watering(user_plant_id):
    # 물주기 기록
    try:
        user_plant_service.record_watering(user_plant_id)
        return jsonify({"success": True, "message": "Watering recorded"})
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/user-plants/<int:user_plant_id>", methods=["DELETE"])
def api_delete_user_plant(user_plant_id):
    # 사용자 식물 삭제
    try:
        user_plant_service.remove_plant(user_plant_id)
        return jsonify({"success": True, "message": "Plant deleted"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ========== 날씨 관련 API ==========


@app.route("/api/weather", methods=["GET"])
def api_get_weather():
    # 날씨 정보
    try:
        lat = request.args.get("lat", type=float, default=37.5665)
        lon = request.args.get("lon", type=float, default=126.9780)

        weather = weather_service.get_weather(lat, lon)
        return jsonify({"success": True, "data": weather})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 503


# ========== 서버 실행 ==========

if __name__ == "__main__":
    print("Flask 서버 시작")
    print(f"DB 경로: {Config.DB_PATH}")
    app.run(debug=Config.FLASK_DEBUG, host=Config.FLASK_HOST, port=Config.FLASK_PORT)
