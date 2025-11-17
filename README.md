# dip_dev Branch 🌿

**스마트 화분 관리 앱의 이미지 전처리 + 분류 모델 모듈**

---

## 📘 프로젝트 정보

- **프로젝트명** : 스마트 화분 관리 어플리케이션 개발
- **플랫폼** : Android
- **구성원** :  
  - 19 조준혁 junhyeok0119@gmail.com · 브랜치 담당자
  - 18 유성식 ryuryu2000@naver.com
  - 22 정태호 t2222h@naver.com
  - 22 채희주 heisalive012@naver.com

---

## 🗂️ 디렉터리 구조

```
dip_dev/
├─ outputs/                      # 추론 결과 json
├─ samples/                      # 학습용 이미지 샘플
│  ├─ plants/
│  └─ leaves/
├─ src/
│  ├─ data/
│  │   ├─ image.py               # 입출력, 리사이즈, 정규화, 텐서 변환 등
│  │   └─ morphology.py          # 경로② 전용 모폴로지 연산
│  ├─ models/            
│  │   ├─ species.py             # 경로① 종 분류
│  │   └─ disease.py             # 경로② 병충해 분류
│  ├─ io/                        # 출력 보조용 {name, ko_name} 맵
│  │   ├─ label_map_species.json
│  │   └─ label_map_disease.json
│  ├─ train/
│  │   ├─ checkpoints            # 학습 체크포인트
│  │   ├─ histories              # 학습 로그
│  │   ├─ labels                 # 종/병충해 레이블
│  │   ├─ splits                 # 데이터셋 분할 정보
│  │   └─ train_classifier.py    # 모델 학습 코드
│  ├─ config.yaml                # 공통 규칙 설정(경로, 파라미터 값 등) 
│  └─ router.py                  # 파일명 기반 ①/② 분기, 파이프라인 실행
├─ app.py
├─ Dockerfile
├─ house_plants.json             # 원예 식물 데이터시트
├─ README.md
└─ requirements.txt
```

---

## 🔧 파이프라인 규칙

- 입력은 단일 이미지 1장
- router.py의 파일명 규칙으로 분기:
  - 경로①: 식물 사진 → router.py → image.py → species.py → 종 분류
  - 경로②: 잎사귀 사진 → router.py → image.py → (morphology.py) → disease.py → 병충해 분류
- 출력은 입력 이미지 파일과 동일한 이름의 json 파일 1개

---

## 📤 결과 스키마(JSON) 예시

**종 분류**
```
  "stage": "infer",
  "mode": "disease",
  "pred_class": 2,
  "pred_label": "Early_blight",
  "pred_label_ko": "겹무늬병",
  "confidence": 0.5041054487228394,
  "topk": [
  ...
}
```

**병충해 분류**
```
{
  "stage": "infer",
  "mode": "species",
  "pred_class": 74,
  "pred_label": "primula",
  "pred_label_ko": "앵초",
  "confidence": 0.6328405141830444,
  "topk": [
  ...
}
```

## 📝 API 테스트

```
curl -X POST \
  -F "file=@samples/bacterical_spot_leaf.jpg" \
  https://smartpot-api-551846265142.asia-northeast3.run.app/infer

curl -X POST -F "file=@samples/bacterical_spot_leaf.jpg" https://smartpot-api-551846265142.asia-northeast3.run.app/infer
```
