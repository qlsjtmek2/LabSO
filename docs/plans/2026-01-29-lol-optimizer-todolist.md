# LoL Optimizer (LabSO) - 개발 계획 (TodoList)

> 생성일: 2026-01-29
> 목표: 롤 적응형 빌드 및 장인 분석 웹 애플리케이션 MVP
> 예상 일정: 4주

## 📋 프로젝트 개요
- **목적**: 롤 콤보 데미지 계산 및 장인 플레이(동선/빌드) 분석
- **핵심 기능**: 콤보 계산기, 장인 타임라인 분석, 상황별 아이템 추천
- **기술 스택**: Next.js, TypeScript, Tailwind, Supabase, Riot API

---

## 🎯 Phase 1: 프로젝트 초기화 및 Riot API 연동
기반 환경을 구축하고 Riot API 통신을 확인합니다.

- [ ] Next.js 프로젝트 생성 (TypeScript, Tailwind)
- [ ] Riot Developer Portal 계정 확인 및 API Key 발급
- [ ] 환경 변수 설정 (`RIOT_API_KEY`)
- [ ] Riot API 래퍼 유틸리티 구현 (`fetchRiot(url)`)
- [ ] API 테스트: 소환사 정보 조회 (`Summoner-V4`)
- [ ] API 테스트: 최근 매치 리스트 조회 (`Match-V5`)

## 🎯 Phase 2: 정적 데이터(DataDragon) 구축
챔피언과 아이템 정보를 계산하기 위해 데이터를 수집합니다.

- [ ] DataDragon 버전 확인 및 데이터 가져오기 스크립트 작성
- [ ] 챔피언 기본 스탯(공격력, 성장체력 등) 파싱 및 저장
- [ ] 챔피언 스킬 계수(Q/W/E/R 데미지 공식) DB화 (수동/자동 병행 필요)
- [ ] 아이템 스탯 및 가격 정보 파싱
- [ ] UI: 챔피언 및 아이템 선택기(Selector) 구현

## 🎯 Phase 3: 콤보 데미지 계산기 (Calculator Feature)
사용자가 입력한 콤보의 데미지를 계산하는 핵심 기능입니다.

- [ ] 계산 엔진: 레벨별 챔피언 스탯 계산 로직 구현
- [ ] 계산 엔진: 아이템 스탯 합산 로직 구현
- [ ] 계산 엔진: 스킬 데미지 공식 적용 (계수 반영)
- [ ] UI: 레벨 슬라이더, 아이템 6칸 드래그앤드롭
- [ ] UI: 콤보 시퀀스 입력기 (버튼 클릭으로 콤보 생성)
- [ ] 결과 뷰: 물리/마법/고정 데미지 차트 표시

## 🎯 Phase 4: 장인 분석기 코어 (Expert Analysis - Backend)
특정 유저의 매치 데이터를 심층 분석합니다.

- [ ] 매치 상세 데이터 조회 (`Match-V5`) 구현
- [ ] 타임라인 데이터 조회 (`Match-V5 Timeline`) 구현
- [ ] 분석 로직: 상대 라이너(Lane Opponent) 자동 감지
- [ ] 분석 로직: 시간대별 아이템 구매 이벤트 추출
- [ ] 분석 로직: 스킬 레벨업 순서 추출
- [ ] 데이터 캐싱: 조회한 매치 정보를 DB(Supabase)에 저장하여 API 호출 절약

## 🎯 Phase 5: 장인 분석기 시각화 (Expert Analysis - Frontend)
분석된 데이터를 시각적으로 표현합니다.

- [ ] 동선 히트맵: 미니맵 이미지 위에 좌표(x,y) 점 찍기 (Recharts/Canvas)
- [ ] 빌드 타임라인: 게임 시간축(X축)에 따른 아이템 아이콘 표시
- [ ] 비교 분석 뷰: "장인은 이 타이밍에 집을 갔다" vs "평균 유저" (MVP 이후 고도화)

## 🎯 Phase 6: 배포 및 최적화
- [ ] Vercel 배포 설정
- [ ] Riot API Rate Limit 처리 (에러 핸들링 및 재시도 로직 강화)
- [ ] 프로덕션 API Key 신청 준비 (Riot 정책 준수 점검)
