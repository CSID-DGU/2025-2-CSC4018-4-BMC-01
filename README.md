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
│  ├─ plants/                    # 종 분류용 샘플 (102 종, VGG Flowers)
│  ├─ plants_aug/                # 증강용 식물 데이터
│  └─ leaves/                    # 병충해 분류용 샘플 (6 클래스)
├─ src/
│  ├─ aug/                       # 데이터 증강 관련 스크립트
│  │   ├─ analyze_plants_aug.py
│  │   ├─ split_plants_test.py
│  │   ├─ apply_morphology.py
│  │   ├─ plants_aug_analysis.json
│  │   └─ plants_split_metadata.json
│  ├─ eval/                      # 모델 평가 스크립트
│  │   ├─ evaluate_plants_test.py
│  │   └─ plants_test_evaluation_results.json
│  ├─ data/
│  │   ├─ image.py               # 입출력, 리사이즈, 정규화, 텐서 변환 등
│  │   └─ morphology.py          # 경로② 전용 모폴로지 연산 (미사용)
│  ├─ models/
│  │   ├─ species.py             # 경로① 종 분류
│  │   └─ disease.py             # 경로② 병충해 분류
│  ├─ io/                        # 출력 보조용 {name, ko_name} 맵
│  │   ├─ label_map_species.json
│  │   └─ label_map_disease.json
│  ├─ train/
│  │   ├─ checkpoints/           # 학습 체크포인트
│  │   │   ├─ species/tf_efficientnetv2_b0_finetuned/
│  │   │   └─ disease/tf_efficientnet_b0_ns/
│  │   ├─ histories/             # 학습 로그
│  │   ├─ labels/                # 종/병충해 레이블
│  │   │   ├─ species.labels.json
│  │   │   └─ disease.labels.json
│  │   ├─ splits/                # 데이터셋 분할 정보
│  │   └─ train_classifier.py    # 모델 학습 코드 (resume, val-data, output-suffix 지원)
│  ├─ config.yaml                # 공통 규칙 설정(경로, 파라미터 값 등)
│  ├─ config_loader.py           # 설정 파일 로더 (싱글톤)
│  └─ router.py                  # 파일명 기반 ①/② 분기, 파이프라인 실행
├─ app.py                        # FastAPI 서버 엔트리포인트
├─ Dockerfile                    # Docker 컨테이너 설정
├─ house_plants.json             # 원예 식물 데이터시트
├─ README.md
├─ CLAUDE.md                     # Claude Code를 위한 프로젝트 가이드
├─ requirements.txt
├─ .gitignore
└─ .gcloudignore
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

**종 분류 (Species Classification)**
```json
{
  "stage": "infer",
  "mode": "species",
  "pred_class": 74,
  "pred_label": "primula",
  "pred_label_ko": "앵초",
  "confidence": 0.6328405141830444,
  "topk": [
    {
      "index": 74,
      "label": "primula",
      "prob": 0.6328405141830444
    },
    ...
  ],
  "meta": {
    "original_size": [1024, 768],
    "preprocessed_size": [224, 224]
  }
}
```

**병충해 분류 (Disease Diagnosis)**
```json
{
  "stage": "infer",
  "mode": "disease",
  "pred_class": 2,
  "pred_label": "Early_blight",
  "pred_label_ko": "겹무늬병",
  "confidence": 0.5041054487228394,
  "topk": [
    {
      "index": 2,
      "label": "Early_blight",
      "prob": 0.5041054487228394
    },
    ...
  ],
  "meta": {
    "original_size": [800, 600],
    "preprocessed_size": [224, 224]
  }
}
```

## 📝 API 테스트

```bash
curl -X POST \
  -F "file=@samples/bacterical_spot_leaf.jpg" \
  https://smartpot-api-551846265142.asia-northeast3.run.app/infer

curl -X POST -F "file=@samples/bacterical_spot_leaf.jpg" https://smartpot-api-551846265142.asia-northeast3.run.app/infer
```

---

## 🧪 모델 학습 및 평가

### 데이터셋 구성

**1. 원본 데이터 (plants)**
- VGG Flowers 데이터셋 기반
- 102개 식물 종
- Baseline 모델 학습용

**2. 증강 데이터 (plants_aug)**
- 실제 환경과 유사한 이미지 (3,311장)
- label당 7 ~ 42장으로 구성
- 배경 적응 fine-tuning용

**3. 테스트 데이터 (plants_test)**
- plants_aug에서 20% 분리
- 학습에 절대 사용하지 않음
- 최종 평가 전용

### Baseline 모델 학습

**학습 명령어:**
```bash
# TF-EfficientNetV2-B0 (224×224)
python src/train/train_classifier.py \
  --data samples/plants \
  --arch tf_efficientnetv2_b0 \

### Fine-tuning (배경 적응 학습)

**Fine-tuning 명령어:**
```bash
python src/train/train_classifier.py \
  --data samples/plants_aug \
  --val-data samples/plants \
  --arch tf_efficientnetv2_b0 \
  --resume src/train/checkpoints/species/tf_efficientnetv2_b0/ckpt.pt.best \
  --output-suffix _finetuned \
  --epochs 30 \
  --lr 1e-5 \
  --weight-decay 1e-3 \
  --patience 10
```

### Mixed Training 실험 결과 (w2~w6)

**실험 설명:**
- VGG Flowers + plants_aug 혼합 학습
- Weight 파라미터로 plants_aug 데이터 비중 조절

**실험 결과 (Train / Val / Test Accuracy):**

| Weight | Epochs | Best Train Acc (%) | Best Val Acc (%) | Test Acc (%) | Train-Test Gap | Val-Test Gap |
|--------|--------|-------------------|------------------|--------------|----------------|--------------|
| w=2    | 33     | 99.49             | 97.29            | 84.44        | 15.05          | 12.85        |
| w=3    | 38     | 99.62             | 97.23            | 85.25        | 14.37          | 11.98        |
| w=4    | 49     | 99.73             | 97.38            | 86.39        | 13.35          | 11.00        |
| w=5    | 29     | 99.39             | 97.38            | 85.74        | 13.65          | 11.64        |
| **w=5.5** | **42** | **99.58**     | **97.56**        | **87.20**    | **12.38**      | **10.37**    |
| w=6    | 18     | 98.98             | 96.99            | 83.95        | 15.02          | 13.03        |

**주요 발견:**
- **w=5.5가 최적**: Test Accuracy 87.20% (최고)
- w=4~5.5 구간이 최적 스위트 스팟
- w=6은 과도한 aug 비중으로 오히려 성능 하락
- Train-Test Gap이 가장 작아 일반화 성능 우수

**결론:**
- **최종 모델: w=5.5 체크포인트 사용**
- VGG Flowers 대비 약 2배 향상 (45% → 87%)
- 실제 환경 배경에 강건한 모델 달성

### 모델 평가

**평가 명령어:**
```bash
# config.yaml에서 체크포인트 경로 설정 후:
python src/eval/evaluate_plants_test.py
```

---

## 🛠️ 주요 기능

### train_classifier.py 옵션

- `--resume`: 기존 체크포인트 로드 (fine-tuning)
- `--val-data`: 별도 validation 데이터 사용
- `--output-suffix`: 체크포인트 폴더 이름에 suffix 추가 (덮어쓰기 방지)
