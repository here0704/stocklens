# StockLens 배포 가이드

미장/국장 테마별 밸류에이션 & 실시간 뉴스 피드 앱

---

## 구조

```
stocklens/
├── frontend/   → Vercel 배포 (React + Vite)
└── backend/    → Railway 배포 (Node.js + Express)
```

---

## 1단계 — GitHub에 올리기

```bash
# 이 폴더를 GitHub에 올림
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/YOUR_ID/stocklens.git
git push -u origin main
```

---

## 2단계 — 백엔드를 Railway에 배포

1. **https://railway.app** 접속 → GitHub 로그인
2. **New Project → Deploy from GitHub repo** 클릭
3. `stocklens` 저장소 선택
4. **Root Directory** → `backend` 입력 후 Deploy
5. 배포 완료 후 **Settings → Domains → Generate Domain** 클릭
   - 예: `stocklens-backend.up.railway.app` 생성됨
6. **Variables 탭** → 아래 값 추가 (선택):
   ```
   NAVER_CLIENT_ID=네이버_클라이언트_ID
   NAVER_CLIENT_SECRET=네이버_시크릿
   ```

---

## 3단계 — 프론트엔드를 Vercel에 배포

1. **https://vercel.com** 접속 → GitHub 로그인
2. **New Project → Import** → `stocklens` 저장소 선택
3. 설정 화면에서:
   - **Root Directory** → `frontend` 입력
   - **Framework Preset** → Vite 자동 감지됨
4. **Environment Variables** 탭 → 아래 값 추가:
   ```
   VITE_API_URL = https://stocklens-backend.up.railway.app
   ```
   (2단계에서 생성된 Railway URL)
5. **Deploy** 클릭

배포 완료! `https://stocklens.vercel.app` 주소 생성됨

---

## 4단계 — 도메인 연결 (선택)

커스텀 도메인(`stocklens.co.kr` 등)을 사용하려면:
- Vercel 대시보드 → Settings → Domains → 도메인 입력
- DNS 설정에서 CNAME을 `cname.vercel-dns.com` 으로 지정

---

## 로컬 개발

```bash
# 백엔드 실행
cd backend
npm install
node server.js   # http://localhost:4000

# 프론트엔드 실행 (새 터미널)
cd frontend
npm install
npm run dev      # http://localhost:5173
```

---

## 네이버 API 키 발급 (뉴스 기능 강화)

1. https://developers.naver.com → 애플리케이션 등록
2. 사용 API → **검색** 선택
3. Client ID / Secret 복사
4. Railway Variables에 입력

키 없이도 크롤링 폴백으로 뉴스가 동작하지만,
API 키가 있으면 더 안정적으로 뉴스를 가져올 수 있음

---

## 이후 업데이트 방법

코드 수정 후:
```bash
git add .
git commit -m "업데이트 내용"
git push
```
→ Vercel/Railway 자동으로 재배포 (약 1~2분)
