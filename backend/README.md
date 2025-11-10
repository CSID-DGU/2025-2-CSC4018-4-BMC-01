# 🌱 BMC Plant Backend

식물 관리 앱 백엔드 서버

## 역할

- 식물 정보 데이터베이스 관리
- API 서버 구축
- 기상청 API 연동

## 기술 스택

Python 3.13, SQLite3

## 실행

```bash
conda create -n bmc python=3.13
conda activate bmc
pip install pandas numpy requests python-dotenv
```

## 구조

```
backend/
├── database/    # DB 스키마 및 초기화
├── data/        # 식물 데이터 (JSON)
└── src/         # 소스 코드 (파싱, CRUD)
```

## 데이터베이스 스키마

### plants (식물 정보)

- 209개 실내 식물 데이터
- 온도, 물주기, 빛 조건 등

### users (사용자)

- 사용자 이름(별명)

### user_plants (사용자-식물 관계)

- 사용자가 키우는 식물
- 물주기 기록 및 일정

## 개발 현황

- [x] 프로젝트 초기 설정
- [x] DB 스키마 설계 (plants, users, user_plants)
- [x] DB 초기화 스크립트 작성
- [x] JSON 파싱 기능 구현
- [x] 식물 데이터 삽입 (209개)
- [x] CRUD 함수 구현 (사용자/식물 관리)
- [ ] API 서버 구축
- [ ] 기상청 API 연동
