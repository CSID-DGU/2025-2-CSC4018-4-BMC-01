"""
Flask API 서버
"""

from flask import Flask, request, jsonify
from flask_cors import CORS

from services import PlantService, UserService, UserPlantService, WeatherService, AIService
from config import Config


app = Flask(__name__)
CORS(app)

# Service 인스턴스 생성
plant_service = PlantService()
user_service = UserService()
user_plant_service = UserPlantService()
weather_service = WeatherService()
ai_service = AIService()


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
        plant_id = data.get("plant_id")  # None 가능
        nickname = data.get("nickname")
        image = data.get("image")
        species_label = data.get("species_label")
        species_label_ko = data.get("species_label_ko")
        watering_cycle = data.get("watering_cycle")

        # plant_id는 선택적 (None일 수 있음)
        result = user_plant_service.add_plant(
            user_id, plant_id, nickname, image, species_label, species_label_ko, watering_cycle
        )
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


@app.route("/api/user-plants/<int:user_plant_id>", methods=["PUT"])
def api_update_user_plant(user_plant_id):
    # 사용자 식물 정보 수정
    try:
        data = request.get_json()
        print(f"[UPDATE] 식물 수정 요청: user_plant_id={user_plant_id}")
        print(f"[UPDATE] 받은 데이터: {list(data.keys())}")

        nickname = data.get("nickname")
        watering_cycle = data.get("watering_cycle")
        last_watered = data.get("last_watered")
        image = data.get("image")

        if image:
            print(f"[UPDATE] 이미지 업데이트: {image[:50]}...")

        user_plant_service.update_plant(user_plant_id, nickname, watering_cycle, last_watered, image)
        return jsonify({"success": True, "message": "Plant updated"})
    except ValueError as e:
        print(f"[UPDATE] 업데이트 실패 (ValueError): {e}")
        return jsonify({"success": False, "error": str(e)}), 404
    except Exception as e:
        print(f"[UPDATE] 업데이트 실패 (Exception): {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/user-plants/<int:user_plant_id>", methods=["DELETE"])
def api_delete_user_plant(user_plant_id):
    # 사용자 식물 삭제
    print(f"[DELETE] 식물 삭제 요청: user_plant_id={user_plant_id}")
    try:
        user_plant_service.remove_plant(user_plant_id)
        print(f"[DELETE] 식물 삭제 완료: user_plant_id={user_plant_id}")
        return jsonify({"success": True, "message": "Plant deleted"})
    except Exception as e:
        print(f"[DELETE] 식물 삭제 실패: {e}")
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


# ========== AI 이미지 분석 API ==========


@app.route("/api/ai/analyze", methods=["POST"])
def api_analyze_species():
    # 식물 종류 분석만 수행 (저장하지 않음)
    try:
        # 파일 업로드 확인
        if "file" not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"success": False, "error": "Empty filename"}), 400

        # AI 분석 (저장하지 않음)
        result = ai_service.analyze_species_only(file)

        if result.get("success"):
            return jsonify(result)
        else:
            return jsonify(result), 500

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/ai/identify-species", methods=["POST"])
def api_identify_species():
    # 식물 종류 판별 (mode="plant")
    try:
        # 파일 업로드 확인
        if "file" not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"success": False, "error": "Empty filename"}), 400

        # 폼 데이터에서 파라미터 가져오기
        user_id = request.form.get("user_id", type=int)
        nickname = request.form.get("nickname")
        image_path = request.form.get("image_path")

        if not user_id:
            return jsonify({"success": False, "error": "user_id required"}), 400

        # AI 분석 및 식물 등록
        result = ai_service.identify_species(user_id, file, nickname, image_path)

        if result.get("success"):
            return jsonify(result), 201
        else:
            return jsonify(result), 500

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/ai/diagnose-disease", methods=["POST"])
def api_diagnose_disease():
    # 병충해 판별 (mode="disease")
    print("[DISEASE] 병충해 분석 요청 시작")
    try:
        # 파일 업로드 확인
        if "file" not in request.files:
            print("[DISEASE] 오류: 파일 없음")
            return jsonify({"success": False, "error": "No file provided"}), 400

        file = request.files["file"]
        if file.filename == "":
            print("[DISEASE] 오류: 파일명 없음")
            return jsonify({"success": False, "error": "Empty filename"}), 400

        # 폼 데이터에서 파라미터 가져오기
        user_plant_id = request.form.get("user_plant_id", type=int)
        print(f"[DISEASE] user_plant_id: {user_plant_id}, file: {file.filename}")

        if not user_plant_id:
            print("[DISEASE] 오류: user_plant_id 없음")
            return jsonify({"success": False, "error": "user_plant_id required"}), 400

        # AI 분석 및 병충해 정보 저장
        print(f"[DISEASE] AI 분석 시작...")
        result = ai_service.diagnose_disease(user_plant_id, file)
        print(f"[DISEASE] AI 분석 결과: {result.get('success')}")

        if result.get("success"):
            return jsonify(result)
        else:
            print(f"[DISEASE] AI 분석 실패: {result.get('error')}")
            return jsonify(result), 500

    except Exception as e:
        print(f"[DISEASE] 예외 발생: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ========== 서버 실행 ==========

if __name__ == "__main__":
    print("Flask 서버 시작")
    print(f"DB 경로: {Config.DB_PATH}")
    app.run(debug=Config.FLASK_DEBUG, host=Config.FLASK_HOST, port=Config.FLASK_PORT)
