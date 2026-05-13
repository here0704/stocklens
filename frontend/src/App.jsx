import { useState, useEffect, useRef, useCallback } from "react";

// ─── 설정 ─────────────────────────────────────────────────────────────────────
const API_BASE = "https://stocklens-u81v.onrender.com";
const FINNHUB_KEY = "d82317hr01qrojfdqkogd82317hr01qrojfdqkp0";
const FINNHUB = "https://finnhub.io/api/v1";
const USE_MOCK = false;

// ─── 메인 네비게이션 (하단 탭바) ──────────────────────────────────────────────
const NAV = [
  { id: "sector", label: "종목", icon: "◈" },
  { id: "news",   label: "뉴스", icon: "◎" },
  { id: "watch",  label: "관심", icon: "★" },
];

// ─── 섹터 정의 ────────────────────────────────────────────────────────────────
const SECTORS = [
  { id: "ai",      label: "AI·반도체",      icon: "◈", color: "#00D4FF" },
  { id: "bio",     label: "바이오·헬스케어", icon: "◉", color: "#00FF94" },
  { id: "ev",      label: "전기차·배터리",   icon: "◆", color: "#FFAA00" },
  { id: "defense", label: "방산·우주",       icon: "◎", color: "#FF6B35" },
  { id: "finance", label: "금융·핀테크",     icon: "◐", color: "#B088FF" },
  { id: "energy",  label: "에너지·원자력",   icon: "◑", color: "#FF4D6D" },
];

// ─── 종목 데이터 ──────────────────────────────────────────────────────────────
const SECTOR_STOCKS = {
  ai: [
    { ticker:"NVDA",   name:"엔비디아",          market:"미장", price:132.5,  changeP:+2.47, mktCap:3200,  opIncome:87,   psRatio:36.8, valuation:"고평가", vol:0.032, trend:0.18, seed:11 },
    { ticker:"AMD",    name:"AMD",               market:"미장", price:165.2,  changeP:+3.41, mktCap:268,   opIncome:5.1,  psRatio:52.5, valuation:"고평가", vol:0.038, trend:0.10, seed:15 },
    { ticker:"AVGO",   name:"브로드컴",           market:"미장", price:248.3,  changeP:+1.92, mktCap:1160,  opIncome:28.4, psRatio:40.8, valuation:"고평가", vol:0.024, trend:0.14, seed:16 },
    { ticker:"MU",     name:"마이크론",           market:"미장", price:118.4,  changeP:+4.12, mktCap:131,   opIncome:12.2, psRatio:10.7, valuation:"저평가", vol:0.040, trend:0.20, seed:18 },
    { ticker:"MSFT",   name:"마이크로소프트",      market:"미장", price:458.2,  changeP:+0.92, mktCap:3400,  opIncome:119,  psRatio:28.6, valuation:"저평가", vol:0.018, trend:0.12, seed:19 },
    { ticker:"QCOM",   name:"퀄컴",              market:"미장", price:158.4,  changeP:+1.24, mktCap:171,   opIncome:11.2, psRatio:15.3, valuation:"저평가", vol:0.026, trend:0.08, seed:17 },
    { ticker:"005930", name:"삼성전자",           market:"국장", price:58400,  changeP:-0.34, mktCap:348.2, opIncome:43.6, psRatio:7.9,  valuation:"저평가", vol:0.022, trend:0.04, seed:12 },
    { ticker:"000660", name:"SK하이닉스",         market:"국장", price:198000, changeP:+2.32, mktCap:143.8, opIncome:23.5, psRatio:6.1,  valuation:"저평가", vol:0.028, trend:0.22, seed:13 },
    { ticker:"042700", name:"한미반도체",         market:"국장", price:142000, changeP:+5.21, mktCap:10.8,  opIncome:0.62, psRatio:17.4, valuation:"저평가", vol:0.045, trend:0.30, seed:112 },
    { ticker:"403870", name:"HPSP",             market:"국장", price:58200,  changeP:+3.82, mktCap:3.89,  opIncome:0.24, psRatio:16.2, valuation:"저평가", vol:0.038, trend:0.18, seed:113 },
  ],
  bio: [
    { ticker:"LLY",    name:"일라이 릴리",        market:"미장", price:792.3,  changeP:-1.55, mktCap:752,   opIncome:14.8, psRatio:50.8, valuation:"고평가", vol:0.026, trend:0.08, seed:22 },
    { ticker:"NVO",    name:"노보노디스크",        market:"미장", price:68.4,   changeP:+1.82, mktCap:1510,  opIncome:22.1, psRatio:68.3, valuation:"고평가", vol:0.024, trend:0.06, seed:23 },
    { ticker:"AMGN",   name:"암젠",              market:"미장", price:282.4,  changeP:+6.82, mktCap:151,   opIncome:8.2,  psRatio:18.4, valuation:"저평가", vol:0.018, trend:0.03, seed:26 },
    { ticker:"207940", name:"삼성바이오로직스",    market:"국장", price:1085000, changeP:+1.40, mktCap:71.2, opIncome:1.52, psRatio:46.8, valuation:"고평가", vol:0.025, trend:0.10, seed:21 },
    { ticker:"068270", name:"셀트리온",           market:"국장", price:168000, changeP:+2.71, mktCap:22.1,  opIncome:0.82, psRatio:26.9, valuation:"저평가", vol:0.030, trend:0.08, seed:29 },
    { ticker:"196170", name:"알테오젠",           market:"국장", price:342000, changeP:+8.31, mktCap:21.6,  opIncome:0.18, psRatio:120.0,valuation:"고평가", vol:0.050, trend:0.25, seed:210 },
  ],
  ev: [
    { ticker:"TSLA",   name:"테슬라",             market:"미장", price:178.4,  changeP:-1.76, mktCap:569,   opIncome:4.2,  psRatio:135.5,valuation:"고평가", vol:0.040, trend:-0.05,seed:31 },
    { ticker:"GM",     name:"GM",                market:"미장", price:52.8,   changeP:+2.14, mktCap:48,    opIncome:8.1,  psRatio:5.9,  valuation:"저평가", vol:0.024, trend:0.06, seed:35 },
    { ticker:"373220", name:"LG에너지솔루션",      market:"국장", price:312000, changeP:+0.64, mktCap:72.9,  opIncome:1.45, psRatio:50.3, valuation:"고평가", vol:0.022, trend:0.03, seed:32 },
    { ticker:"006400", name:"삼성SDI",            market:"국장", price:186000, changeP:+1.91, mktCap:12.8,  opIncome:0.52, psRatio:24.6, valuation:"저평가", vol:0.028, trend:0.05, seed:39 },
    { ticker:"051910", name:"LG화학",             market:"국장", price:248000, changeP:+1.63, mktCap:17.5,  opIncome:1.12, psRatio:15.6, valuation:"저평가", vol:0.024, trend:0.04, seed:310 },
    { ticker:"096770", name:"SK이노베이션",        market:"국장", price:104000, changeP:+3.42, mktCap:9.84,  opIncome:0.52, psRatio:18.9, valuation:"저평가", vol:0.030, trend:0.06, seed:311 },
  ],
  defense: [
    { ticker:"LMT",    name:"록히드마틴",          market:"미장", price:482.1,  changeP:+1.11, mktCap:112.4, opIncome:8.9,  psRatio:12.6, valuation:"저평가", vol:0.016, trend:0.06, seed:42 },
    { ticker:"RTX",    name:"RTX(레이시언)",        market:"미장", price:138.2,  changeP:+2.12, mktCap:185,   opIncome:10.2, psRatio:18.1, valuation:"저평가", vol:0.018, trend:0.07, seed:45 },
    { ticker:"012450", name:"한화에어로스페이스",   market:"국장", price:895000, changeP:+4.07, mktCap:36.8,  opIncome:1.42, psRatio:25.9, valuation:"저평가", vol:0.030, trend:0.25, seed:41 },
    { ticker:"047810", name:"한국항공우주(KAI)",   market:"국장", price:68400,  changeP:+3.21, mktCap:6.98,  opIncome:0.38, psRatio:18.4, valuation:"저평가", vol:0.028, trend:0.15, seed:410 },
    { ticker:"064350", name:"현대로템",            market:"국장", price:68200,  changeP:+4.82, mktCap:7.22,  opIncome:0.44, psRatio:16.4, valuation:"저평가", vol:0.035, trend:0.18, seed:411 },
    { ticker:"272210", name:"한화시스템",          market:"국장", price:42800,  changeP:+3.62, mktCap:4.84,  opIncome:0.24, psRatio:20.2, valuation:"저평가", vol:0.032, trend:0.20, seed:412 },
  ],
  finance: [
    { ticker:"JPM",    name:"JP모건",             market:"미장", price:243.8,  changeP:+0.78, mktCap:694,   opIncome:62.1, psRatio:11.2, valuation:"저평가", vol:0.016, trend:0.09, seed:51 },
    { ticker:"V",      name:"비자",               market:"미장", price:342.1,  changeP:+1.21, mktCap:692,   opIncome:21.2, psRatio:32.6, valuation:"저평가", vol:0.016, trend:0.10, seed:56 },
    { ticker:"GS",     name:"골드만삭스",          market:"미장", price:584.2,  changeP:+1.42, mktCap:192,   opIncome:14.2, psRatio:13.5, valuation:"저평가", vol:0.020, trend:0.08, seed:58 },
    { ticker:"105560", name:"KB금융",             market:"국장", price:89200,  changeP:-0.45, mktCap:36.1,  opIncome:5.8,  psRatio:6.2,  valuation:"저평가", vol:0.016, trend:0.05, seed:52 },
    { ticker:"055550", name:"신한지주",            market:"국장", price:62400,  changeP:+0.64, mktCap:29.5,  opIncome:4.82, psRatio:6.1,  valuation:"저평가", vol:0.016, trend:0.04, seed:510 },
    { ticker:"086790", name:"하나금융지주",         market:"국장", price:72800,  changeP:+0.69, mktCap:21.4,  opIncome:4.12, psRatio:5.2,  valuation:"저평가", vol:0.016, trend:0.04, seed:511 },
  ],
  energy: [
    { ticker:"CEG",    name:"콘스텔레이션에너지",   market:"미장", price:312.6,  changeP:+2.56, mktCap:98.2,  opIncome:3.1,  psRatio:31.7, valuation:"고평가", vol:0.026, trend:0.18, seed:61 },
    { ticker:"VST",    name:"비스트라에너지",       market:"미장", price:168.4,  changeP:+4.21, mktCap:51.2,  opIncome:3.8,  psRatio:13.5, valuation:"저평가", vol:0.030, trend:0.22, seed:65 },
    { ticker:"XOM",    name:"엑손모빌",            market:"미장", price:112.4,  changeP:+0.72, mktCap:474,   opIncome:36.1, psRatio:13.1, valuation:"저평가", vol:0.018, trend:0.04, seed:67 },
    { ticker:"082740", name:"한국전력",            market:"국장", price:21850,  changeP:+1.63, mktCap:14.0,  opIncome:4.2,  psRatio:3.3,  valuation:"저평가", vol:0.018, trend:0.08, seed:62 },
    { ticker:"036460", name:"한국가스공사",         market:"국장", price:38450,  changeP:+1.42, mktCap:3.52,  opIncome:0.72, psRatio:4.9,  valuation:"저평가", vol:0.022, trend:0.06, seed:610 },
    { ticker:"015760", name:"한전KPS",             market:"국장", price:42800,  changeP:+2.11, mktCap:1.44,  opIncome:0.12, psRatio:12.0, valuation:"저평가", vol:0.020, trend:0.10, seed:611 },
  ],
};

const ALL_STOCKS = Object.values(SECTOR_STOCKS).flat();

// ─── 모의 뉴스 피드 데이터 ────────────────────────────────────────────────────
// 실제 배포 시 GET /news/ticker/:ticker 로 대체
const MOCK_FEED = {
  ai: [
    { id:"ai1", ticker:"NVDA", stockName:"엔비디아", sectorId:"ai",
      title:"엔비디아 블랙웰 GPU, 2분기 수요 예상치 3배 초과…공급망 비상",
      press:"로이터", time:"14분 전", impact:"positive", priceMove:+3.2,
      summary:"엔비디아의 GB200 기반 블랙웰 GPU 수요가 내부 예측의 3배를 넘어서며 공급망 전체에 긴장감이 감돌고 있습니다. TSMC의 CoWoS 패키징 라인 풀 가동에도 불구하고 납기 지연이 우려되는 상황입니다. AWS·Azure·GCP 3사 모두 추가 발주를 넣은 것으로 알려졌습니다.",
      url:"https://www.reuters.com/technology/" },
    { id:"ai2", ticker:"000660", stockName:"SK하이닉스", sectorId:"ai",
      title:"SK하이닉스, HBM4 양산 돌입…엔비디아 블랙웰 탑재 확정",
      press:"한국경제", time:"38분 전", impact:"positive", priceMove:+4.1,
      summary:"SK하이닉스가 HBM4 양산 체제에 전격 돌입했습니다. 엔비디아 차세대 블랙웰 Ultra GPU에 탑재가 확정됐으며, 하반기 출하량은 당초 목표 대비 20% 상향 조정됐습니다.",
      url:"https://www.hankyung.com/" },
    { id:"ai3", ticker:"AMD", stockName:"AMD", sectorId:"ai",
      title:"AMD MI350 클라우드 채택 본격화…메타·오라클 공개 도입 선언",
      press:"블룸버그", time:"1시간 전", impact:"positive", priceMove:+2.8,
      summary:"메타와 오라클이 AMD MI350 AI 가속기 도입을 공식 선언했습니다. 엔비디아 H100 대비 40% 저렴한 가격이 채택 결정의 핵심 요인으로 꼽혔으며, 오픈소스 ROCm 생태계 개선도 높은 평가를 받았습니다.",
      url:"https://www.bloomberg.com/" },
    { id:"ai4", ticker:"005930", stockName:"삼성전자", sectorId:"ai",
      title:"삼성전자 파운드리, TSMC 2나노 대항마 SF2 수율 70% 돌파",
      press:"디일렉", time:"2시간 전", impact:"positive", priceMove:+1.8,
      summary:"삼성전자 파운드리 사업부의 SF2(2nm급) 공정 수율이 70%를 넘어섰습니다. TSMC N2 공정에 대적할 수 있는 수준으로, 퀄컴·엔비디아 등 주요 팹리스 고객사의 설계 검토가 시작됐다는 소식입니다.",
      url:"https://www.thelec.kr/" },
    { id:"ai5", ticker:"042700", stockName:"한미반도체", sectorId:"ai",
      title:"한미반도체 TC본더, HBM4에도 독점 채택…수주 잔고 사상 최대",
      press:"매일경제", time:"3시간 전", impact:"positive", priceMove:+6.4,
      summary:"한미반도체의 열압착 본딩(TC본더) 장비가 차세대 HBM4 패키징 공정에도 독점 채택됐습니다. 이에 따라 수주 잔고가 사상 최대치를 경신했으며, 증권가는 목표주가를 일제히 상향 조정하고 있습니다.",
      url:"https://www.mk.co.kr/" },
  ],
  bio: [
    { id:"bio1", ticker:"196170", stockName:"알테오젠", sectorId:"bio",
      title:"알테오젠 SC 플랫폼, 6번째 빅파마 계약…누적 마일스톤 2.5조 돌파",
      press:"바이오타임즈", time:"22분 전", impact:"positive", priceMove:+9.2,
      summary:"알테오젠이 글로벌 상위 제약사와 6번째 SC 변환 플랫폼 기술이전 계약을 체결했습니다. 계약금만 1,500억원 규모로, 누적 마일스톤 총액이 2.5조원을 돌파하며 국내 바이오 기술수출 신기록을 새로 썼습니다.",
      url:"https://www.biotimes.co.kr/" },
    { id:"bio2", ticker:"LLY", stockName:"일라이 릴리", sectorId:"bio",
      title:"일라이 릴리 젭바운드, 미국 시장점유율 45% 돌파…오젬픽 추월 임박",
      press:"파이낸셜타임즈", time:"1시간 전", impact:"positive", priceMove:+2.4,
      summary:"일라이 릴리의 비만치료제 젭바운드(티르제파타이드)의 미국 내 처방 시장 점유율이 45%를 돌파했습니다. 노보노디스크의 오젬픽을 근소한 차이로 추격하고 있으며, 연말에는 역전이 가능하다는 분석이 나옵니다.",
      url:"https://www.ft.com/" },
    { id:"bio3", ticker:"068270", stockName:"셀트리온", sectorId:"bio",
      title:"셀트리온 짐펜트라, 美 보험 급여 확대…환자 접근성 획기적 개선",
      press:"헬스코리아뉴스", time:"2시간 전", impact:"positive", priceMove:+3.1,
      summary:"미국 주요 보험사 3곳이 셀트리온의 짐펜트라를 급여 목록에 추가했습니다. 이에 따라 환자 본인부담금이 기존 대비 70% 줄어들며 처방 접근성이 크게 개선됩니다. 셀트리온은 연내 시장점유율 20% 달성을 목표로 하고 있습니다.",
      url:"https://www.hkn24.com/" },
    { id:"bio4", ticker:"AMGN", stockName:"암젠", sectorId:"bio",
      title:"암젠 MariTide 체중 감량 효과 22% 확인…GLP-1 시장 판도 변화 예고",
      press:"CNBC", time:"3시간 전", impact:"positive", priceMove:+7.8,
      summary:"암젠의 월 1회 투여 비만치료제 MariTide의 임상 2b상에서 72주간 22% 체중 감량 효과가 확인됐습니다. 기존 GLP-1 제제보다 투여 빈도가 낮아 환자 편의성이 높으며, 2027년 출시 시 시장 판도를 바꿀 것이라는 전망이 쏟아지고 있습니다.",
      url:"https://www.cnbc.com/" },
  ],
  ev: [
    { id:"ev1", ticker:"TSLA", stockName:"테슬라", sectorId:"ev",
      title:"테슬라 사이버캡 규제 승인 지연…경쟁사 웨이모와 격차 우려",
      press:"테크크런치", time:"31분 전", impact:"negative", priceMove:-2.9,
      summary:"테슬라의 완전자율주행 기반 로보택시 서비스 사이버캡의 오스틴 출시가 규제 당국의 추가 안전 점검 요구로 6월 이후로 밀릴 가능성이 높아졌습니다. 이미 샌프란시스코·피닉스 등지에서 상업 운행 중인 웨이모와의 격차에 대한 우려가 커지고 있습니다.",
      url:"https://techcrunch.com/" },
    { id:"ev2", ticker:"096770", stockName:"SK이노베이션", sectorId:"ev",
      title:"SK온 2분기 흑자 전환 확실시…배터리 업황 회복 신호탄",
      press:"에너지경제", time:"55분 전", impact:"positive", priceMove:+4.2,
      summary:"SK이노베이션의 배터리 자회사 SK온이 올 2분기 흑자 전환에 성공할 것이 거의 확실해졌습니다. GM향 배터리 공급 확대와 원재료 가격 하락이 맞물리며 영업이익이 예상을 크게 웃돌 것으로 전망됩니다.",
      url:"https://www.ekn.kr/" },
    { id:"ev3", ticker:"GM", stockName:"GM", sectorId:"ev",
      title:"GM 전기차 부문 2분기 첫 분기 흑자 달성…순수 EV 수익성 증명",
      press:"오토모티브뉴스", time:"2시간 전", impact:"positive", priceMove:+3.6,
      summary:"GM이 전기차 사업 부문에서 분기 기준 최초 흑자를 달성했습니다. 이쿼녹스 EV 판매 호조와 배터리 원가 절감이 핵심 원인으로, 순수 전기차만으로도 수익을 낼 수 있다는 것을 처음 증명했습니다.",
      url:"https://www.autonews.com/" },
  ],
  defense: [
    { id:"def1", ticker:"012450", stockName:"한화에어로스페이스", sectorId:"defense",
      title:"한화에어로, 사우디 K9 자주포 수출 협상 막바지…6조원 빅딜 임박",
      press:"방산저널", time:"18분 전", impact:"positive", priceMove:+5.8,
      summary:"한화에어로스페이스가 사우디아라비아와 K9 자주포 200문 수출 계약 협상을 마무리 단계에서 진행 중입니다. 계약 금액은 약 6조원으로 국내 방산 역사상 최대 단일 수출 계약이 될 전망입니다.",
      url:"https://www.kookbang.com/" },
    { id:"def2", ticker:"064350", stockName:"현대로템", sectorId:"defense",
      title:"현대로템 K2 전차, 루마니아 의회 최종 승인…계약 서명만 남아",
      press:"연합뉴스", time:"1시간 전", impact:"positive", priceMove:+5.3,
      summary:"루마니아 의회가 현대로템의 K2 흑표 전차 도입 예산안을 최종 승인했습니다. 계약 규모는 약 6조원으로, 이르면 이달 내 공식 서명이 이뤄질 예정입니다.",
      url:"https://www.yna.co.kr/" },
    { id:"def3", ticker:"LMT", stockName:"록히드마틴", sectorId:"defense",
      title:"록히드마틴, F-35 생산 월 15대 돌파…2027년 월 20대 목표",
      press:"디펜스뉴스", time:"2시간 전", impact:"positive", priceMove:+1.6,
      summary:"록히드마틴의 F-35 생산 속도가 월 15대를 돌파했습니다. 공급망 안정화와 생산 자동화 투자 효과가 가시화되고 있으며, 2027년 월 20대 생산을 목표로 하고 있습니다.",
      url:"https://www.defensenews.com/" },
    { id:"def4", ticker:"272210", stockName:"한화시스템", sectorId:"defense",
      title:"한화시스템 저궤도 위성통신, 해군 함정 탑재 계약 체결",
      press:"국방일보", time:"3시간 전", impact:"positive", priceMove:+4.1,
      summary:"한화시스템의 저궤도 위성통신 시스템이 해군 구축함에 탑재되는 계약을 체결했습니다. 민간 상용 서비스에 이어 군용 시장까지 진출하며 방산·우주 시너지를 현실화하고 있습니다.",
      url:"https://www.kookbang.com/" },
  ],
  finance: [
    { id:"fin1", ticker:"105560", stockName:"KB금융", sectorId:"finance",
      title:"KB금융 순이자마진 1.8% 돌파…국내 금융지주 중 최고 수준",
      press:"머니투데이", time:"27분 전", impact:"positive", priceMove:+1.2,
      summary:"KB금융지주의 1분기 순이자마진(NIM)이 1.8%를 돌파하며 국내 4대 금융지주 중 최고치를 기록했습니다. 대출 포트폴리오 고도화와 저원가성 예금 비중 확대가 주효했다는 분석입니다.",
      url:"https://www.mt.co.kr/" },
    { id:"fin2", ticker:"V", stockName:"비자", sectorId:"finance",
      title:"비자, 아시아 신흥국 결제 처리 건수 전년비 38% 폭증",
      press:"WSJ", time:"1시간 전", impact:"positive", priceMove:+1.4,
      summary:"비자의 아시아 신흥국 결제 처리 건수가 전년 동기 대비 38% 급증했습니다. 인도·인도네시아·베트남을 중심으로 한 현금에서 디지털 결제로의 전환이 가속화되고 있으며, 비자의 장기 성장 동력으로 주목받고 있습니다.",
      url:"https://www.wsj.com/" },
    { id:"fin3", ticker:"086790", stockName:"하나금융지주", sectorId:"finance",
      title:"하나금융 '환전 없는 해외결제' 출시…핀테크 혁신 가속",
      press:"파이낸셜뉴스", time:"2시간 전", impact:"positive", priceMove:+0.8,
      summary:"하나금융지주가 환전 과정 없이 원화로 해외에서 결제하는 서비스를 출시했습니다. 실시간 환율을 적용해 수수료를 기존 대비 70% 줄인 것이 특징으로, 해외 여행객을 중심으로 빠르게 확산되고 있습니다.",
      url:"https://www.fnnews.com/" },
  ],
  energy: [
    { id:"en1", ticker:"VST", stockName:"비스트라에너지", sectorId:"energy",
      title:"비스트라, 마이크로소프트와 10년 원전 PPA 체결…전력 대란 해법",
      press:"블룸버그", time:"42분 전", impact:"positive", priceMove:+5.1,
      summary:"비스트라에너지가 마이크로소프트와 원자력 발전 전력에 대한 10년 장기 전력구매계약(PPA)을 체결했습니다. AI 데이터센터의 전력 수요 급증을 배경으로, 무탄소 안정 전원인 원전의 전략적 가치가 다시 한번 부각됐습니다.",
      url:"https://www.bloomberg.com/" },
    { id:"en2", ticker:"082740", stockName:"한국전력", sectorId:"energy",
      title:"한국전력 전기요금 kWh당 12원 인상 확정…흑자 전환 가시권",
      press:"에너지경제", time:"1시간 전", impact:"positive", priceMove:+3.2,
      summary:"정부가 하반기 전기요금을 kWh당 12원 인상하기로 확정했습니다. 이번 인상으로 한국전력의 연간 추가 수입은 약 6조원에 달하며, 만성 적자 탈출과 함께 재무 건전성 회복이 기대됩니다.",
      url:"https://www.ekn.kr/" },
    { id:"en3", ticker:"CEG", stockName:"콘스텔레이션에너지", sectorId:"energy",
      title:"콘스텔레이션, 스리마일 원전 2호기 재가동 2026년 완료 목표",
      press:"로이터", time:"2시간 전", impact:"positive", priceMove:+2.8,
      summary:"콘스텔레이션에너지가 2019년 폐쇄됐던 스리마일 원전 2호기의 재가동 공사를 본격화했습니다. 2026년 완료를 목표로 하며, 완공 시 인근 AI 데이터센터 클러스터에 전력을 공급할 예정입니다.",
      url:"https://www.reuters.com/" },
    { id:"en4", ticker:"036460", stockName:"한국가스공사", sectorId:"energy",
      title:"한국가스공사, 호주 LNG 장기계약 갱신…2040년까지 안정적 공급",
      press:"가스신문", time:"3시간 전", impact:"positive", priceMove:+1.6,
      summary:"한국가스공사가 호주 최대 LNG 생산업체와 2040년까지 15년 장기 공급 계약을 갱신했습니다. 연간 약 420만톤 규모로, 국내 LNG 수입의 안정적 기반을 확보했습니다.",
      url:"https://www.gasnews.com/" },
  ],
};

// 전체 피드 (시간순 정렬 모의)
const ALL_FEED = Object.values(MOCK_FEED).flat().sort(() => Math.random() - 0.5);

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function genPriceHistory(base, vol, trend, seed = 1) {
  let r = seed;
  const lcg = () => { r = (r * 1664525 + 1013904223) & 0xffffffff; return (r >>> 0) / 0xffffffff; };
  const pts = []; let p = base * (0.85 + lcg() * 0.1);
  for (let i = 0; i < 30; i++) { p = p * (1 + trend / 30 + (lcg() - 0.5) * vol); pts.push(+p.toFixed(2)); }
  pts[pts.length - 1] = base; return pts;
}

// 네이버 금융 API로 국장 실시간 주가 fetch (Render 서버 프록시)
async function fetchKRQuote(ticker) {
  try {
    const res = await fetch(`${API_BASE}/kr-quote/${ticker}`);
    const d = await res.json();
    if (!d.price) return null;
    return d;
  } catch { return null; }
}
function toFinnhubSymbol(ticker) {
  if (/^\d{6}$/.test(ticker)) {
    const kosdaq = ["247540","091990","196170","086520","068270","035720","035420"];
    return kosdaq.includes(ticker) ? `${ticker}.KQ` : `${ticker}.KS`;
  }
  return ticker;
}

// Finnhub 실시간 주가 fetch
async function fetchLiveQuote(ticker) {
  try {
    const symbol = toFinnhubSymbol(ticker);
    const res = await fetch(`${FINNHUB}/quote?symbol=${symbol}&token=${FINNHUB_KEY}`);
    const data = await res.json();
    if (!data.c) return null; // c = current price
    return {
      price: data.c,
      change: data.d,       // d = change
      changeP: data.dp,     // dp = percent change
      high: data.h,
      low: data.l,
      prevClose: data.pc,
    };
  } catch { return null; }
}

async function fetchArticleBody(url) {
  if (USE_MOCK || !url || url === "#") {
    await new Promise(r => setTimeout(r, 700));
    return { bodyText: "실제 서버 연동 시 기사 본문이 자동으로 파싱되어 표시됩니다.\n\n네이버 뉴스, 한국경제, 연합뉴스, 로이터 등 국내외 주요 언론사 기사를 광고 없이 깔끔하게 보여줍니다.\n\n현재는 모의 데이터 모드로 동작 중입니다. server.js를 실행하고 USE_MOCK을 false로 설정하면 실제 기사 본문이 표시됩니다.", title: null, press: null };
  }
  try {
    const res = await fetch(`${API_BASE}/news/article?url=${encodeURIComponent(url)}`);
    return await res.json();
  } catch { return { bodyText: "기사를 불러오지 못했습니다.", title: null }; }
}

// ─── 디자인 토큰 ──────────────────────────────────────────────────────────────
const C = {
  bg:"#0A0B0F", surface:"#12141A", surfaceAlt:"#1A1C24",
  border:"#22252F", borderBright:"#2E3340",
  text:"#E8EAF0", textMuted:"#6B7080", textDim:"#40444F",
  accent:"#00D4FF", green:"#00FF94", red:"#FF4D6D",
  yellow:"#FFD600", purple:"#B088FF",
};

// ─── 기사 전문 모달 ───────────────────────────────────────────────────────────
function ArticleModal({ news, onClose }) {
  const sector = SECTORS.find(s => s.id === news.sectorId) || SECTORS[0];
  const color = sector.color;
  const [body, setBody] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchArticleBody(news.url).then(setBody);
  }, [news.url]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          messages:[{ role:"user", content:
            `다음 주식 뉴스 기사를 투자자 관점에서 분석해줘. 아래 형식으로 한국어로 간결하게 답해줘:\n\n📌 핵심 요약 (2문장)\n💹 주가 영향 (단기/중기 각 1문장)\n⚠️ 리스크 (있으면 1문장)\n\n제목: ${news.title}\n내용: ${body?.bodyText || news.summary}` }]
        })
      });
      const d = await res.json(); setAiResult(d.content?.[0]?.text || "분석 실패");
    } catch { setAiResult("분석 중 오류가 발생했습니다."); }
    setAiLoading(false);
  };

  const paragraphs = body?.bodyText?.split(/\n+/).filter(s => s.trim().length > 10) || [];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:3000, background:C.bg, display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto" }}>
      {/* 헤더 */}
      <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <button onClick={onClose} style={{ background:"none", border:"none", color:C.textMuted, fontSize:22, cursor:"pointer", padding:"0 4px", lineHeight:1 }}>←</button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:10, fontWeight:700, color, letterSpacing:"0.06em" }}>{sector.icon} {sector.label}</span>
            <span style={{ fontSize:10, color:C.textDim }}>·</span>
            <span style={{ fontSize:10, color:C.textDim }}>{news.stockName}</span>
          </div>
          <div style={{ fontSize:10, color:C.textDim, marginTop:1 }}>{news.press} · {news.time}</div>
        </div>
        {news.priceMove !== 0 && (
          <span style={{ fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:5, flexShrink:0,
            background:news.priceMove>0?"rgba(0,255,148,0.1)":"rgba(255,77,109,0.1)",
            color:news.priceMove>0?C.green:C.red }}>
            {news.priceMove>0?"▲":"▼"}{Math.abs(news.priceMove)}%
          </span>
        )}
      </div>

      {/* 본문 스크롤 */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 40px" }}>
        {news.url && news.url !== "#" && (
          <a href={news.url} target="_blank" rel="noopener noreferrer"
            style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:10, color:C.accent, textDecoration:"none", marginBottom:16, padding:"4px 11px", borderRadius:16, border:`1px solid ${C.accent}30`, background:C.accent+"08" }}>
            ↗ 원문 보기
          </a>
        )}
        <h2 style={{ fontSize:17, fontWeight:800, color:C.text, lineHeight:1.55, marginBottom:16, letterSpacing:"-0.02em" }}>
          {news.title}
        </h2>
        <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
          {news.press && <span style={{ fontSize:10, color:C.textMuted, padding:"2px 8px", borderRadius:10, background:C.surfaceAlt, border:`1px solid ${C.border}` }}>{news.press}</span>}
          <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:10,
            background:news.impact==="positive"?"rgba(0,255,148,0.1)":"rgba(255,77,109,0.1)",
            color:news.impact==="positive"?C.green:C.red,
            border:`1px solid ${news.impact==="positive"?"rgba(0,255,148,0.25)":"rgba(255,77,109,0.25)"}` }}>
            {news.impact==="positive"?"▲ 긍정 재료":"▼ 부정 재료"}
          </span>
        </div>

        {/* 본문 로딩 */}
        {!body ? (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[1,0.9,0.75,0.95,0.6,0.85].map((w,i) => (
              <div key={i} style={{ height:14, borderRadius:4, width:`${w*100}%`,
                background:`linear-gradient(90deg,${C.surfaceAlt} 0%,${C.border} 50%,${C.surfaceAlt} 100%)`,
                backgroundSize:"200%", animation:"shimmer 1.4s infinite", opacity:0.7 }}/>
            ))}
          </div>
        ) : paragraphs.length > 0 ? (
          <div style={{ marginBottom:24 }}>
            {paragraphs.map((p, i) => (
              <p key={i} style={{ fontSize:14, lineHeight:1.9, color:i===0?C.text:C.textMuted, marginBottom:14, wordBreak:"keep-all" }}>{p}</p>
            ))}
          </div>
        ) : (
          <p style={{ fontSize:14, lineHeight:1.9, color:C.textMuted, marginBottom:24 }}>{news.summary}</p>
        )}

        <div style={{ height:1, background:C.border, marginBottom:20 }}/>

        {/* AI 분석 */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.text }}>✦ AI 투자 분석</div>
            {!aiResult && !aiLoading && (
              <button onClick={runAI} style={{ fontSize:11, fontWeight:700, padding:"6px 16px", borderRadius:20, border:`1px solid ${color}50`, background:`${color}18`, color, cursor:"pointer" }}>분석하기</button>
            )}
          </div>
          {aiLoading && (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:16, background:C.surfaceAlt, borderRadius:10, color, fontSize:12 }}>
              <span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>◌</span>Claude가 분석 중입니다…
            </div>
          )}
          {aiResult && (
            <div style={{ padding:16, background:C.surfaceAlt, borderRadius:10, border:`1px solid ${color}25` }}>
              <div style={{ fontSize:13, lineHeight:1.85, color:C.textMuted, whiteSpace:"pre-wrap" }}>{aiResult}</div>
              <div style={{ fontSize:10, color:C.textDim, marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}` }}>※ AI 분석은 참고용이며 투자 결정의 근거로 사용할 수 없습니다.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 뉴스 카드 (피드용) ───────────────────────────────────────────────────────
function FeedCard({ item, onOpen }) {
  const sector = SECTORS.find(s => s.id === item.sectorId) || SECTORS[0];
  const up = item.priceMove > 0;
  const dn = item.priceMove < 0;

  return (
    <div onClick={() => onOpen(item)}
      style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
        padding:"14px 16px", marginBottom:10, cursor:"pointer",
        transition:"border-color 0.15s, background 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = sector.color+"50"}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      {/* 상단: 섹터 + 종목 + 시간 */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
        <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10,
          background:`${sector.color}18`, color:sector.color, border:`1px solid ${sector.color}30` }}>
          {sector.icon} {sector.label}
        </span>
        <span style={{ fontSize:10, color:C.textDim }}>·</span>
        <span style={{ fontSize:10, color:C.textMuted, fontWeight:600 }}>{item.stockName}</span>
        <span style={{ marginLeft:"auto", fontSize:10, color:C.textDim }}>{item.time}</span>
      </div>

      {/* 제목 */}
      <div style={{ fontSize:13, fontWeight:700, color:C.text, lineHeight:1.55, marginBottom:8 }}>
        {item.title}
      </div>

      {/* 요약 미리보기 */}
      <div style={{ fontSize:12, color:C.textMuted, lineHeight:1.6,
        display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden",
        marginBottom:10 }}>
        {item.summary}
      </div>

      {/* 하단: 출처 + 주가 영향 + 읽기 버튼 */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:10, color:C.textDim }}>{item.press}</span>
        {item.priceMove !== 0 && (
          <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10,
            background:up?"rgba(0,255,148,0.1)":dn?"rgba(255,77,109,0.1)":"transparent",
            color:up?C.green:dn?C.red:C.textMuted }}>
            당일 {up?"▲":dn?"▼":""}{item.priceMove !== 0 ? Math.abs(item.priceMove)+"%" : "-"}
          </span>
        )}
        <span style={{ marginLeft:"auto", fontSize:10, color:C.accent, fontWeight:600 }}>전문 읽기 →</span>
      </div>
    </div>
  );
}

// ─── 뉴스 피드 화면 ───────────────────────────────────────────────────────────
function NewsFeed() {
  const [feedTab, setFeedTab] = useState("all");
  const [article, setArticle] = useState(null);
  const [aiSummaries, setAiSummaries] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [liveFeed, setLiveFeed] = useState(null);

  useEffect(() => {
    if (USE_MOCK) return;
    setLiveFeed(null);
    const query = feedTab === "all" ? "주식 증시" : (SECTORS.find(s=>s.id===feedTab)?.label || "주식");
    fetch(`${API_BASE}/news/search?q=${encodeURIComponent(query)}&display=10`)
      .then(r => r.json())
      .then(data => {
        const items = (data.items || []).map((item, i) => ({
          id: `live_${i}`,
          ticker: "",
          stockName: "",
          sectorId: feedTab === "all" ? "ai" : feedTab,
          title: item.title,
          press: item.press,
          time: item.pubDate,
          url: item.url,
          summary: item.description,
          priceMove: 0,
          impact: "positive",
        }));
        setLiveFeed(items);
      })
      .catch(() => setLiveFeed(null));
  }, [feedTab]);

  const feedItems = USE_MOCK
    ? (feedTab === "all" ? ALL_FEED : (MOCK_FEED[feedTab] || []))
    : (liveFeed || (feedTab === "all" ? ALL_FEED : (MOCK_FEED[feedTab] || [])));

  const callQuickAI = async (e, item) => {
    e.stopPropagation();
    if (aiSummaries[item.id]) return;
    setAiLoading(p => ({ ...p, [item.id]: true }));
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:600,
          messages:[{ role:"user", content:`다음 주식 뉴스를 투자자 관점에서 3문장으로 핵심만 요약해줘. 마지막에 "→ [매수/매도/관망] 관점" 한 줄로 끝내줘.\n\n${item.title}\n${item.summary}` }]
        })
      });
      const d = await res.json();
      setAiSummaries(p => ({ ...p, [item.id]: d.content?.[0]?.text }));
    } catch {}
    setAiLoading(p => ({ ...p, [item.id]: false }));
  };

  const sector = SECTORS.find(s => s.id === feedTab);

  return (
    <div style={{ flex:1, overflowY:"auto" }}>
      {/* 피드 서브탭 */}
      <div style={{ padding:"14px 20px 0", position:"sticky", top:0, background:C.bg, zIndex:10, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", gap:6, overflowX:"auto", scrollbarWidth:"none", paddingBottom:14 }}>
          <button onClick={() => setFeedTab("all")} style={{ padding:"6px 14px", borderRadius:20, whiteSpace:"nowrap", cursor:"pointer", fontSize:12, fontWeight:feedTab==="all"?700:400, border:`1px solid ${feedTab==="all"?C.accent+"60":C.border}`, background:feedTab==="all"?C.accent+"18":"transparent", color:feedTab==="all"?C.accent:C.textMuted, transition:"all 0.15s" }}>
            🗞 전체
          </button>
          {SECTORS.map(s => (
            <button key={s.id} onClick={() => setFeedTab(s.id)} style={{ padding:"6px 14px", borderRadius:20, whiteSpace:"nowrap", cursor:"pointer", fontSize:12, fontWeight:feedTab===s.id?700:400, border:`1px solid ${feedTab===s.id?s.color+"60":C.border}`, background:feedTab===s.id?s.color+"18":"transparent", color:feedTab===s.id?s.color:C.textMuted, transition:"all 0.15s" }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 헤더 정보 */}
      <div style={{ padding:"14px 20px 10px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:C.text, letterSpacing:"-0.02em" }}>
              {feedTab === "all" ? "오늘의 주요 뉴스" : `${sector?.label} 주요 뉴스`}
            </div>
            <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>
              {feedItems.length}건 · {USE_MOCK ? "모의 데이터" : "실시간 업데이트"}
            </div>
          </div>
          {feedTab !== "all" && sector && (
            <div style={{ width:36, height:36, borderRadius:10, background:`${sector.color}18`, border:`1px solid ${sector.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:sector.color }}>
              {sector.icon}
            </div>
          )}
        </div>
      </div>

      {/* 뉴스 카드 목록 */}
      <div style={{ padding:"0 16px 100px" }}>
        {feedItems.map(item => {
          const sec = SECTORS.find(s => s.id === item.sectorId) || SECTORS[0];
          const up = item.priceMove > 0, dn = item.priceMove < 0;
          return (
            <div key={item.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, marginBottom:10, overflow:"hidden", transition:"border-color 0.15s" }}>
              {/* 카드 본체 */}
              <div onClick={() => setArticle(item)} style={{ padding:"14px 16px", cursor:"pointer" }}>
                {/* 섹터 + 종목 + 시간 */}
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                  <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10, background:`${sec.color}18`, color:sec.color, border:`1px solid ${sec.color}30` }}>
                    {sec.icon} {sec.label}
                  </span>
                  <span style={{ fontSize:10, color:C.textMuted, fontWeight:600 }}>{item.stockName}</span>
                  <span style={{ marginLeft:"auto", fontSize:10, color:C.textDim }}>{item.time}</span>
                </div>
                {/* 제목 */}
                <div style={{ fontSize:13, fontWeight:700, color:C.text, lineHeight:1.55, marginBottom:8 }}>
                  {item.title}
                </div>
                {/* 요약 2줄 미리보기 */}
                <div style={{ fontSize:12, color:C.textMuted, lineHeight:1.65,
                  display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", marginBottom:10 }}>
                  {item.summary}
                </div>
                {/* 하단 메타 */}
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:10, color:C.textDim }}>{item.press}</span>
                  {item.priceMove !== 0 && (
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10,
                      background:up?"rgba(0,255,148,0.1)":"rgba(255,77,109,0.1)",
                      color:up?C.green:C.red }}>
                      당일 {up?"▲":"▼"}{Math.abs(item.priceMove)}%
                    </span>
                  )}
                  <span style={{ marginLeft:"auto", fontSize:10, color:C.accent, fontWeight:600 }}>전문 읽기 →</span>
                </div>
              </div>

              {/* AI 빠른 요약 버튼 + 결과 */}
              <div style={{ borderTop:`1px solid ${C.border}`, padding:"8px 16px" }}>
                {!aiSummaries[item.id] ? (
                  <button onClick={e => callQuickAI(e, item)} disabled={aiLoading[item.id]}
                    style={{ fontSize:10, fontWeight:700, padding:"5px 12px", borderRadius:16,
                      border:`1px solid ${sec.color}40`, background:`${sec.color}12`, color:sec.color,
                      cursor:aiLoading[item.id]?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:6 }}>
                    {aiLoading[item.id]
                      ? <><span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>◌</span>분석 중…</>
                      : <>✦ AI 한줄 요약</>
                    }
                  </button>
                ) : (
                  <div style={{ fontSize:12, color:C.textMuted, lineHeight:1.7, padding:"4px 0" }}>
                    <span style={{ fontSize:10, fontWeight:700, color:sec.color, marginRight:6 }}>✦</span>
                    {aiSummaries[item.id]}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {article && <ArticleModal news={article} onClose={() => setArticle(null)}/>}
    </div>
  );
}

// ─── 종목 뷰 (기존 섹터 탭 화면) ─────────────────────────────────────────────
function MiniChart({ prices, color }) {
  if (!prices?.length) return <div style={{ width:80, height:36 }}/>;
  const min=Math.min(...prices),max=Math.max(...prices),range=max-min||1;
  const W=80,H=36,P=2,w=W-P*2,h=H-P*2;
  const tx=(i)=>P+(i/(prices.length-1))*w, ty=(v)=>P+h-((v-min)/range)*h;
  const pts=prices.map((v,i)=>`${tx(i)},${ty(v)}`).join(" ");
  const lc=prices[prices.length-1]>=prices[0]?C.green:C.red;
  const gId=`mc${color.replace(/\W/g,"")}`;
  return (
    <svg width={W} height={H} style={{ display:"block", flexShrink:0 }}>
      <defs><linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={lc} stopOpacity="0.3"/>
        <stop offset="100%" stopColor={lc} stopOpacity="0.01"/>
      </linearGradient></defs>
      <polygon points={`${tx(0)},${H-P} ${pts} ${tx(prices.length-1)},${H-P}`} fill={`url(#${gId})`}/>
      <polyline points={pts} fill="none" stroke={lc} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={tx(prices.length-1)} cy={ty(prices[prices.length-1])} r="2.5" fill={lc}/>
    </svg>
  );
}

function ExpandedChart({ prices }) {
  const [hov,setHov]=useState(null);
  const ref=useRef(null);
  const W=320,H=110,PL=8,PR=8,PT=14,PB=22,iw=W-PL-PR,ih=H-PT-PB;
  const min=Math.min(...prices),max=Math.max(...prices),range=max-min||1;
  const tx=(i)=>PL+(i/(prices.length-1))*iw, ty=(v)=>PT+ih-((v-min)/range)*ih;
  const pts=prices.map((v,i)=>`${tx(i).toFixed(1)},${ty(v).toFixed(1)}`).join(" ");
  const lc=prices[prices.length-1]>=prices[0]?C.green:C.red;
  const isKR=prices[prices.length-1]>1000;
  const onMove=(cx)=>{
    if(!ref.current)return;
    const r=ref.current.getBoundingClientRect();
    setHov(Math.max(0,Math.min(prices.length-1,Math.round((((cx-r.left)*(W/r.width))-PL)/iw*(prices.length-1)))));
  };
  return (
    <div style={{ position:"relative", margin:"12px 0 2px" }}>
      <svg ref={ref} width="100%" viewBox={`0 0 ${W} ${H}`} style={{ cursor:"crosshair", display:"block" }}
        onMouseMove={e=>onMove(e.clientX)} onMouseLeave={()=>setHov(null)}
        onTouchMove={e=>{e.preventDefault();onMove(e.touches[0].clientX);}} onTouchEnd={()=>setHov(null)}>
        <defs><linearGradient id="echart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lc} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={lc} stopOpacity="0.02"/>
        </linearGradient></defs>
        {[0.25,0.5,0.75].map(f=>(
          <line key={f} x1={PL} x2={W-PR} y1={PT+ih*(1-f)} y2={PT+ih*(1-f)} stroke={C.border} strokeWidth="1" strokeDasharray="3,3"/>
        ))}
        <polygon points={`${tx(0)},${H-PB} ${pts} ${tx(prices.length-1)},${H-PB}`} fill="url(#echart)"/>
        <polyline points={pts} fill="none" stroke={lc} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
        {hov!==null&&<>
          <line x1={tx(hov)} x2={tx(hov)} y1={PT} y2={H-PB} stroke={C.textDim} strokeWidth="1" strokeDasharray="3,2"/>
          <circle cx={tx(hov)} cy={ty(prices[hov])} r="3.5" fill={lc} stroke={C.bg} strokeWidth="1.5"/>
        </>}
        {[[0,"30일전"],[9,"20일"],[19,"10일"],[29,"오늘"]].map(([i,l])=>(
          <text key={l} x={tx(i)} y={H-5} textAnchor="middle" fontSize="8" fill={C.textDim} fontFamily="monospace">{l}</text>
        ))}
      </svg>
      {hov!==null&&(
        <div style={{ position:"absolute", top:2, left:"50%", transform:"translateX(-50%)", background:C.surfaceAlt, border:`1px solid ${C.borderBright}`, borderRadius:6, padding:"3px 10px", pointerEvents:"none", fontSize:11, fontWeight:700, color:C.text, whiteSpace:"nowrap" }}>
          {isKR?prices[hov].toLocaleString()+"원":"$"+prices[hov]?.toFixed(2)}
          <span style={{ fontSize:9, color:C.textMuted, marginLeft:6 }}>{30-hov}일 전</span>
        </div>
      )}
    </div>
  );
}

function Badge({ val }) {
  const hi=val==="고평가";
  return <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.06em", padding:"2px 7px", borderRadius:4, background:hi?"rgba(255,77,109,0.15)":"rgba(0,255,148,0.12)", color:hi?C.red:C.green, border:`1px solid ${hi?"rgba(255,77,109,0.3)":"rgba(0,255,148,0.25)"}` }}>{val}</span>;
}
function PSBar({ value, avg, color }) {
  const max=Math.max(value,avg)*1.3, pct=(v)=>Math.min((v/max)*100,100);
  return (
    <div style={{ position:"relative", height:6, background:"#1E2028", borderRadius:3 }}>
      <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${pct(value)}%`, background:color, borderRadius:3, transition:"width 0.6s" }}/>
      <div style={{ position:"absolute", top:-3, height:12, width:2, background:C.textMuted, borderRadius:1, left:`${pct(avg)}%`, transform:"translateX(-50%)" }}/>
    </div>
  );
}
function Chip({ changeP }) {
  const up=changeP>=0;
  return <span style={{ fontSize:11, fontWeight:600, padding:"2px 7px", borderRadius:4, background:up?"rgba(0,255,148,0.1)":"rgba(255,77,109,0.1)", color:up?C.green:C.red }}>{up?"▲":"▼"} {Math.abs(changeP).toFixed(2)}%</span>;
}

function NewsSection({ ticker, name, color }) {
  const [news, setNews] = useState(null);
  const [article, setArticle] = useState(null);
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState({});
  const sectorId = Object.entries(MOCK_FEED).find(([,arr]) => arr.some(n => n.ticker===ticker))?.[0] || "ai";

  useEffect(() => {
    setNews(null);
    if (USE_MOCK) {
      setTimeout(() => {
        const items = MOCK_FEED[sectorId]?.filter(n => n.ticker===ticker) || [];
        setNews(items.length ? items : (MOCK_FEED[sectorId]?.slice(0,2) || []));
      }, 400);
    } else {
      fetch(`${API_BASE}/news/ticker/${ticker}`)
        .then(r => r.json())
        .then(data => {
          const items = (data.items || []).map(item => ({
            title: item.title,
            press: item.press,
            time: item.pubDate,
            url: item.url,
            summary: item.description,
            priceMove: 0,
            impact: "positive",
            sectorId,
            stockName: name,
            ticker,
          }));
          setNews(items.length ? items : (MOCK_FEED[sectorId]?.slice(0,2) || []));
        })
        .catch(() => {
          const items = MOCK_FEED[sectorId]?.filter(n => n.ticker===ticker) || [];
          setNews(items.length ? items : (MOCK_FEED[sectorId]?.slice(0,2) || []));
        });
    }
  }, [ticker]);

  const callAI = async (idx, item) => {
    if (summaries[idx]) { setSummaries(p=>({...p,[`${idx}_open`]:!p[`${idx}_open`]})); return; }
    setLoading(p=>({...p,[idx]:true}));
    setSummaries(p=>({...p,[`${idx}_open`]:true}));
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:800,
          messages:[{ role:"user", content:`다음 주식 뉴스를 투자자 관점에서 3~4문장으로 핵심만 간결하게 한국어로 요약해줘. 주가 영향 요인도 명확히 언급해줘.\n\n제목: ${item.title}\n내용: ${item.summary}` }]
        })
      });
      const d = await res.json();
      setSummaries(p=>({...p,[idx]:d.content?.[0]?.text||item.summary}));
    } catch { setSummaries(p=>({...p,[idx]:item.summary})); }
    setLoading(p=>({...p,[idx]:false}));
  };

  if (!news) return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 0", color:C.textMuted, fontSize:12 }}>
      <span style={{ animation:"spin 1s linear infinite", display:"inline-block", color }}>◌</span>뉴스 불러오는 중…
    </div>
  );

  return (
    <>
      <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, letterSpacing:"0.08em", marginBottom:8 }}>최신 뉴스</div>
      {news.map((item, idx) => {
        const up=item.priceMove>0, dn=item.priceMove<0;
        const open=summaries[`${idx}_open`];
        return (
          <div key={idx} style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderLeft:`3px solid ${up?C.green:dn?C.red:C.border}`, borderRadius:8, padding:"11px 13px", marginBottom:8 }}>
            <div onClick={()=>setArticle(item)} style={{ fontSize:12, fontWeight:600, color:C.text, lineHeight:1.5, marginBottom:6, cursor:"pointer" }}>{item.title}</div>
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontSize:10, color:C.textDim }}>{item.press}</span>
              <span style={{ fontSize:10, color:C.textMuted }}>{item.time}</span>
              {item.priceMove!==0&&<span style={{ fontSize:10, fontWeight:600, padding:"1px 6px", borderRadius:3, background:up?"rgba(0,255,148,0.1)":"rgba(255,77,109,0.1)", color:up?C.green:C.red }}>당일 {up?"▲":"▼"}{Math.abs(item.priceMove)}%</span>}
              <div style={{ marginLeft:"auto", display:"flex", gap:5 }}>
                <button onClick={()=>setArticle(item)} style={{ fontSize:10, fontWeight:600, padding:"3px 9px", borderRadius:5, border:`1px solid ${C.border}`, background:"transparent", color:C.textMuted, cursor:"pointer" }}>전문 읽기</button>
                <button onClick={()=>callAI(idx,item)} style={{ fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:5, border:`1px solid ${color}40`, background:`${color}15`, color, cursor:"pointer" }}>AI 요약</button>
              </div>
            </div>
            {open&&<div style={{ marginTop:10, padding:"10px 12px", background:"#0D0F14", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, lineHeight:1.7, color:C.textMuted }}>
              {loading[idx]?<div style={{ display:"flex", alignItems:"center", gap:8, color }}><span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>◌</span>분석 중…</div>
                :<><div style={{ fontSize:10, fontWeight:700, color, marginBottom:6, letterSpacing:"0.06em" }}>✦ AI 요약</div>{summaries[idx]}</>}
            </div>}
          </div>
        );
      })}
      {article&&<ArticleModal news={article} onClose={()=>setArticle(null)}/>}
    </>
  );
}

function StockCard({ stock, color, avgPS, watchlist, toggleWatch }) {
  const [open,setOpen]=useState(false);
  const [livePrice,setLivePrice]=useState(null);
  const prices=useRef(genPriceHistory(stock.price,stock.vol,stock.trend,stock.seed)).current;
  const isKR=stock.market==="국장";

  // 실시간 주가 fetch (미장: Finnhub, 국장: 네이버 금융)
  useEffect(()=>{
    if(USE_MOCK) return;
    if(stock.market === "국장") {
      fetchKRQuote(stock.ticker).then(d => { if(d) setLivePrice(d); });
    } else {
      fetchLiveQuote(stock.ticker).then(d => { if(d) setLivePrice(d); });
    }
  },[stock.ticker]);

  const displayPrice = livePrice?.price ?? stock.price;
  const displayChangeP = livePrice?.changeP ?? stock.changeP;
  const displayMktCap = livePrice?.mktCap ?? (isKR ? stock.mktCap * 1e12 : stock.mktCap * 1e9);

  const priceStr=isKR?Math.round(displayPrice).toLocaleString()+"원":"$"+Number(displayPrice).toFixed(2);
  const mktStr=isKR?(displayMktCap/1e12).toFixed(1)+"조":"$"+(displayMktCap/1e12).toFixed(2)+"T";
  const opStr=isKR?stock.opIncome.toFixed(1)+"조":"$"+stock.opIncome.toFixed(1)+"B";
  const isLive = !!livePrice;
  const diff=((stock.psRatio-avgPS)/avgPS*100).toFixed(1);
  const isOver=stock.psRatio>avgPS;
  return (
    <div style={{ background:C.surface, border:`1px solid ${open?color+"40":C.border}`, borderRadius:10, overflow:"hidden", transition:"border-color 0.2s", marginBottom:8 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ padding:"14px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:40, height:40, borderRadius:8, background:`${color}15`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color, flexShrink:0 }}>{stock.ticker.slice(0,6)}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3, flexWrap:"wrap" }}>
            <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{stock.name}</span>
            <span style={{ fontSize:10, color:C.textDim, padding:"1px 5px", border:`1px solid ${C.border}`, borderRadius:3 }}>{stock.market}</span>
            {isLive && <span style={{ fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:3, background:"rgba(0,212,255,0.12)", color:C.accent, border:"1px solid rgba(0,212,255,0.3)" }}>실시간</span>}
            <Badge val={stock.valuation}/>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:12, color:C.textMuted }}>{priceStr}</span>
            <Chip changeP={displayChangeP}/>
          </div>
        </div>
        <MiniChart prices={prices} color={color}/>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
          <button onClick={e=>{e.stopPropagation();toggleWatch(stock.ticker);}} style={{ width:28, height:28, borderRadius:8, border:`1px solid ${watchlist.includes(stock.ticker)?C.yellow+"60":C.border}`, background:watchlist.includes(stock.ticker)?C.yellow+"18":"transparent", color:watchlist.includes(stock.ticker)?C.yellow:C.textDim, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>★</button>
          <span style={{ fontSize:10, color:isOver?C.red:C.green, fontWeight:600 }}>{isOver?"▲":"▼"}{Math.abs(diff)}%</span>
        </div>
      </div>
      {open&&(
        <div style={{ padding:"0 16px 16px", borderTop:`1px solid ${C.border}` }}>
          <ExpandedChart prices={prices}/>
          <div style={{ fontSize:10, color:C.textDim, textAlign:"center", marginBottom:12 }}>30일 주가 추이</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
            {[["시가총액",mktStr],["영업이익(연)",opStr],["시총/영업이익",stock.psRatio.toFixed(1)+"x"],["섹터 평균",avgPS.toFixed(1)+"x"]].map(([k,v])=>(
              <div key={k} style={{ background:C.surfaceAlt, borderRadius:7, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:C.textMuted, marginBottom:3 }}>{k}</div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:10, color:C.textMuted }}>섹터 내 상대 밸류에이션</span>
              <span style={{ fontSize:10, color:C.textMuted }}>평균 {avgPS.toFixed(1)}x</span>
            </div>
            <PSBar value={stock.psRatio} avg={avgPS} color={color}/>
          </div>
          <NewsSection ticker={stock.ticker} name={stock.name} color={color}/>
        </div>
      )}
    </div>
  );
}

function SectorView({ watchlist, toggleWatch }) {
  const [tab,setTab]=useState("ai");
  const [mkt,setMkt]=useState("전체");
  const [sort,setSort]=useState("default");
  const sector=SECTORS.find(s=>s.id===tab)||SECTORS[0];
  const sArr=SECTOR_STOCKS[tab]||[];
  const filtered=sArr.filter(s=>mkt==="전체"||s.market===mkt);
  const avgPS=sArr.reduce((a,b)=>a+b.psRatio,0)/Math.max(sArr.length,1);
  const sorted=[...filtered].sort((a,b)=>{
    if(sort==="underval")return a.psRatio-b.psRatio;
    if(sort==="change")return b.changeP-a.changeP;
    return 0;
  });
  return (
    <div style={{ flex:1, overflowY:"auto" }}>
      {/* 섹터 탭 */}
      <div style={{ display:"flex", gap:6, padding:"14px 20px", overflowX:"auto", scrollbarWidth:"none", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, background:C.bg, zIndex:10 }}>
        {SECTORS.map(s=>(
          <button key={s.id} onClick={()=>setTab(s.id)} style={{ padding:"7px 14px", borderRadius:20, whiteSpace:"nowrap", cursor:"pointer", border:`1px solid ${tab===s.id?s.color+"60":C.border}`, background:tab===s.id?s.color+"18":"transparent", color:tab===s.id?s.color:C.textMuted, fontSize:12, fontWeight:tab===s.id?700:400, transition:"all 0.18s" }}>
            <span style={{ marginRight:5 }}>{s.icon}</span>{s.label}
          </button>
        ))}
      </div>
      {/* 섹터 요약 */}
      <div style={{ padding:"12px 20px" }}>
        <div style={{ background:C.surface, border:`1px solid ${sector.color}25`, borderRadius:12, padding:"14px 16px", display:"flex", justifyContent:"space-between" }}>
          {[["섹터 평균",avgPS.toFixed(1)+"x",sector.color],["종목 수",filtered.length+"개",C.text],["저평가",filtered.filter(s=>s.valuation==="저평가").length+"개",C.green]].map(([l,v,col])=>(
            <div key={l}><div style={{ fontSize:11, color:C.textMuted, marginBottom:4 }}>{l}</div><div style={{ fontSize:20, fontWeight:800, color:col, letterSpacing:"-0.04em" }}>{v}</div></div>
          ))}
        </div>
      </div>
      {/* 필터 */}
      <div style={{ display:"flex", gap:6, padding:"0 20px 10px", flexWrap:"wrap", alignItems:"center" }}>
        {["전체","미장","국장"].map(m=>(
          <button key={m} onClick={()=>setMkt(m)} style={{ padding:"5px 12px", borderRadius:16, fontSize:11, cursor:"pointer", border:`1px solid ${mkt===m?C.accent+"50":C.border}`, background:mkt===m?C.accent+"12":"transparent", color:mkt===m?C.accent:C.textMuted, fontWeight:mkt===m?700:400 }}>{m}</button>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", gap:5 }}>
          {[["default","기본"],["underval","저평가순"],["change","등락률순"]].map(([v,l])=>(
            <button key={v} onClick={()=>setSort(v)} style={{ padding:"4px 9px", borderRadius:12, fontSize:10, cursor:"pointer", border:`1px solid ${sort===v?C.accent+"50":C.border}`, background:sort===v?C.accent+"10":"transparent", color:sort===v?C.accent:C.textMuted, fontWeight:sort===v?700:400 }}>{l}</button>
          ))}
        </div>
      </div>
      {/* 종목 리스트 */}
      <div style={{ padding:"0 20px 100px" }}>
        {sorted.map(s=><StockCard key={s.ticker} stock={s} color={sector.color} avgPS={avgPS} watchlist={watchlist} toggleWatch={toggleWatch}/>)}
      </div>
    </div>
  );
}

function WatchlistView({ watchlist, toggleWatch }) {
  const stocks=ALL_STOCKS.filter(s=>watchlist.includes(s.ticker));
  if(!stocks.length) return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40 }}>
      <div style={{ fontSize:40, marginBottom:14, color:C.yellow }}>★</div>
      <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:8 }}>관심 종목이 없어요</div>
      <div style={{ fontSize:12, color:C.textMuted, lineHeight:1.7, textAlign:"center" }}>종목 탭에서 ★ 버튼을<br/>눌러 관심 종목을 추가해보세요</div>
    </div>
  );
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"12px 20px 100px" }}>
      <div style={{ fontSize:11, color:C.textMuted, marginBottom:12, paddingTop:4 }}>{stocks.length}개 종목 저장됨</div>
      {stocks.map(s=>{
        const sid=Object.entries(SECTOR_STOCKS).find(([,arr])=>arr.some(x=>x.ticker===s.ticker))?.[0]||"ai";
        const si=SECTORS.find(x=>x.id===sid);
        const sa=SECTOR_STOCKS[sid]||[];
        const avg=sa.reduce((a,b)=>a+b.psRatio,0)/Math.max(sa.length,1);
        return <StockCard key={s.ticker} stock={s} color={si?.color||C.accent} avgPS={avg} watchlist={watchlist} toggleWatch={toggleWatch}/>;
      })}
    </div>
  );
}

// ─── 구독 모달 ────────────────────────────────────────────────────────────────
function SubModal({ onClose }) {
  const [sel,setSel]=useState("pro");
  const plans=[
    {id:"free",    name:"Free",    price:"무료",       feats:["섹터 2개","종목 5개","AI 요약 1일 5회"]},
    {id:"pro",     name:"Pro",     price:"₩9,900/월",  feats:["모든 섹터","실시간 뉴스 피드","AI 요약 무제한","기사 전문 읽기"]},
    {id:"premium", name:"Premium", price:"₩19,900/월", feats:["Pro 전체","포트폴리오 추적","맞춤 알림","텔레그램 연동"]},
  ];
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:480, background:C.surface, borderRadius:"20px 20px 0 0", border:`1px solid ${C.border}`, padding:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div><div style={{ fontSize:18, fontWeight:800, color:C.text }}>구독 플랜</div><div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>베타 기간: 모든 기능 무료</div></div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.textMuted, fontSize:18, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {plans.map(p=>(
            <div key={p.id} onClick={()=>setSel(p.id)} style={{ padding:"14px 16px", borderRadius:12, border:`1px solid ${sel===p.id?C.accent+"60":C.border}`, background:sel===p.id?C.accent+"08":C.surfaceAlt, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:sel===p.id?C.accent:C.text }}>{p.name}</span>
                  {p.id==="pro"&&<span style={{ fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:3, background:C.accent+"20", color:C.accent }}>추천</span>}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {p.feats.map((f,i)=><span key={i} style={{ fontSize:10, color:C.textMuted }}>· {f}</span>)}
                </div>
              </div>
              <div style={{ fontSize:13, fontWeight:800, color:sel===p.id?C.accent:C.textMuted, flexShrink:0, marginLeft:12 }}>{p.price}</div>
            </div>
          ))}
        </div>
        <button style={{ marginTop:16, width:"100%", padding:14, borderRadius:12, border:"none", background:`linear-gradient(135deg,${C.accent},${C.purple})`, color:"#000", fontSize:13, fontWeight:800, cursor:"pointer" }}>
          베타 기간 중 무료로 시작하기 →
        </button>
        <div style={{ textAlign:"center", marginTop:10, fontSize:10, color:C.textDim }}>이용자 수 1,000명 돌파 시 유료 전환 · 기존 이용자 30일 무료 유지</div>
      </div>
    </div>
  );
}

// ─── 메인 앱 ──────────────────────────────────────────────────────────────────
export default function App() {
  const [nav, setNav] = useState("sector");
  const [showSub, setShowSub] = useState(false);
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sl_v6") || "[]"); } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem("sl_v6", JSON.stringify(watchlist)); } catch {} }, [watchlist]);
  const toggleWatch = useCallback(t => setWatchlist(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]), []);

  return (
    <div style={{ fontFamily:"'Pretendard','Apple SD Gothic Neo',sans-serif", background:C.bg, height:"100dvh", display:"flex", flexDirection:"column", color:C.text, maxWidth:480, margin:"0 auto", overflow:"hidden" }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { display:none; }
        body { background:${C.bg}; overflow:hidden; }
      `}</style>

      {/* 헤더 */}
      <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:24, height:24, borderRadius:6, background:`linear-gradient(135deg,${C.accent},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:"#fff" }}>S</div>
            <span style={{ fontSize:16, fontWeight:800, color:C.text, letterSpacing:"-0.03em" }}>StockLens</span>
            {watchlist.length > 0 && <span style={{ fontSize:10, fontWeight:700, padding:"1px 7px", borderRadius:10, background:C.yellow+"20", color:C.yellow }}>★ {watchlist.length}</span>}
          </div>
          <div style={{ fontSize:10, color:C.textDim, marginTop:1 }}>미장/국장 · {USE_MOCK ? "모의 데이터" : "실시간"}</div>
        </div>
        <button onClick={() => setShowSub(true)} style={{ padding:"7px 16px", borderRadius:20, background:`linear-gradient(135deg,${C.accent}22,${C.purple}22)`, border:`1px solid ${C.accent}50`, color:C.accent, fontSize:11, fontWeight:700, cursor:"pointer" }}>
          무료 이용 중
        </button>
      </div>

      {/* 메인 컨텐츠 */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        {nav === "sector" && <SectorView watchlist={watchlist} toggleWatch={toggleWatch} />}
        {nav === "news"   && <NewsFeed />}
        {nav === "watch"  && <WatchlistView watchlist={watchlist} toggleWatch={toggleWatch} />}
      </div>

      {/* 하단 탭바 */}
      <div style={{ flexShrink:0, borderTop:`1px solid ${C.border}`, background:C.bg, display:"flex", padding:"8px 0 calc(8px + env(safe-area-inset-bottom))" }}>
        {NAV.map(n => {
          const active = nav === n.id;
          const colors = { sector:C.accent, news:"#FF6B35", watch:C.yellow };
          const col = colors[n.id];
          return (
            <button key={n.id} onClick={() => setNav(n.id)}
              style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", padding:"6px 0" }}>
              <div style={{ fontSize:18, color:active?col:C.textDim, transition:"color 0.15s", lineHeight:1 }}>{n.icon}</div>
              <div style={{ fontSize:10, fontWeight:active?700:400, color:active?col:C.textDim, transition:"color 0.15s", letterSpacing:"0.02em" }}>{n.label}</div>
              {active && <div style={{ width:20, height:2, borderRadius:1, background:col, marginTop:1 }}/>}
            </button>
          );
        })}
      </div>

      {showSub && <SubModal onClose={() => setShowSub(false)} />}
    </div>
  );
}
