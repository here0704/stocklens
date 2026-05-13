/**
 * StockLens 프록시 서버
 * - Yahoo Finance2 로 주가/재무 데이터 가져오기
 * - NodeCache 로 캐싱 (주가 5분, 재무 24시간)
 * - CORS 허용 → 프론트엔드에서 직접 호출 가능
 *
 * 실행: node server.js  (기본 포트 4000)
 * 환경변수: PORT=4000  (선택)
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const yahooFinance = require("yahoo-finance2").default;
const NodeCache = require("node-cache");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 4000;

// ── 캐시 설정 ──────────────────────────────────────────────────
const priceCache = new NodeCache({ stdTTL: 300 });       // 5분
const fundamentalCache = new NodeCache({ stdTTL: 86400 }); // 24시간
const newsCache = new NodeCache({ stdTTL: 600 });         // 10분

app.use(cors());
app.use(express.json());

// ── 헬퍼 ───────────────────────────────────────────────────────

/**
 * 한국 종목 티커를 Yahoo Finance 형식으로 변환
 * 005930 → 005930.KS  (코스피)
 * 000660 → 000660.KS
 */
function toYahooTicker(ticker) {
  if (/^\d{6}$/.test(ticker)) {
    // 코스닥 종목 (티커가 0으로 시작하지 않는 일부)은 .KQ
    // 간단히 코스피/코스닥 구분: 실제론 별도 매핑 필요
    const kosdaq = ["247540","091990","196170","086520","068270","035720","035420","035900","251270"];
    return kosdaq.includes(ticker) ? `${ticker}.KQ` : `${ticker}.KS`;
  }
  return ticker; // 미국 주식은 그대로
}

/**
 * 영업이익 추출 (Yahoo Finance incomeStatementHistory 기준)
 * financials.incomeStatementHistory.incomeStatementHistory[0].ebit
 */
function extractOpIncome(quoteSummary) {
  try {
    const stmt = quoteSummary?.incomeStatementHistory?.incomeStatementHistory?.[0];
    return stmt?.ebit?.raw ?? stmt?.operatingIncome?.raw ?? null;
  } catch { return null; }
}

// ── 라우트 ─────────────────────────────────────────────────────

/**
 * GET /quote/:ticker
 * 현재 주가, 등락, 시가총액 반환
 */
app.get("/quote/:ticker", async (req, res) => {
  const raw = req.params.ticker;
  const ticker = toYahooTicker(raw);
  const cacheKey = `quote_${ticker}`;
  const cached = priceCache.get(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const q = await yahooFinance.quoteSummary(ticker, { modules: ["price"] });
    const p = q.price;
    const isKR = ticker.endsWith(".KS") || ticker.endsWith(".KQ");
    const data = {
      ticker: raw,
      name: p.longName || p.shortName || raw,
      price: p.regularMarketPrice?.raw ?? p.regularMarketPrice,
      change: p.regularMarketChange?.raw ?? p.regularMarketChange,
      changeP: p.regularMarketChangePercent?.raw ?? p.regularMarketChangePercent,
      mktCap: p.marketCap?.raw ?? p.marketCap,
      currency: p.currency,
      market: isKR ? "국장" : "미장",
      volume: p.regularMarketVolume?.raw ?? p.regularMarketVolume,
      updatedAt: new Date().toISOString(),
    };
    priceCache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message, ticker });
  }
});

/**
 * GET /fundamentals/:ticker
 * 영업이익, 재무 요약 반환 (24h 캐시)
 */
app.get("/fundamentals/:ticker", async (req, res) => {
  const raw = req.params.ticker;
  const ticker = toYahooTicker(raw);
  const cacheKey = `fund_${ticker}`;
  const cached = fundamentalCache.get(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const summary = await yahooFinance.quoteSummary(ticker, {
      modules: ["incomeStatementHistory", "defaultKeyStatistics", "financialData"],
    });

    const opIncome = extractOpIncome(summary);
    const fin = summary?.financialData;
    const stat = summary?.defaultKeyStatistics;

    const data = {
      ticker: raw,
      opIncome,                                          // 단위: 원 or USD
      revenue: fin?.totalRevenue?.raw ?? null,
      grossProfit: fin?.grossProfits?.raw ?? null,
      ebitda: fin?.ebitda?.raw ?? null,
      peRatio: stat?.forwardPE?.raw ?? null,
      pbRatio: stat?.priceToBook?.raw ?? null,
      eps: stat?.forwardEps?.raw ?? null,
      updatedAt: new Date().toISOString(),
    };
    fundamentalCache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message, ticker });
  }
});

/**
 * GET /history/:ticker?range=1mo
 * 주가 히스토리 (차트용)
 * range: 1mo | 3mo | 6mo | 1y
 */
app.get("/history/:ticker", async (req, res) => {
  const raw = req.params.ticker;
  const ticker = toYahooTicker(raw);
  const range = req.query.range || "1mo";
  const cacheKey = `hist_${ticker}_${range}`;
  const cached = priceCache.get(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const interval = range === "1mo" ? "1d" : range === "3mo" ? "1d" : "1wk";
    const result = await yahooFinance.historical(ticker, {
      period1: getPeriodStart(range),
      interval,
    });

    const data = {
      ticker: raw,
      range,
      prices: result.map(d => ({
        date: d.date.toISOString().slice(0, 10),
        close: d.close,
        open: d.open,
        high: d.high,
        low: d.low,
        volume: d.volume,
      })),
      updatedAt: new Date().toISOString(),
    };
    priceCache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message, ticker });
  }
});

/**
 * GET /batch?tickers=NVDA,005930,META
 * 여러 종목 주가 한번에 (섹터 로딩용)
 */
app.get("/batch", async (req, res) => {
  const tickers = (req.query.tickers || "").split(",").filter(Boolean).slice(0, 20);
  if (!tickers.length) return res.status(400).json({ error: "tickers required" });

  const results = await Promise.allSettled(
    tickers.map(async (raw) => {
      const ticker = toYahooTicker(raw);
      const cacheKey = `quote_${ticker}`;
      const cached = priceCache.get(cacheKey);
      if (cached) return { ...cached, cached: true };

      const q = await yahooFinance.quoteSummary(ticker, { modules: ["price"] });
      const p = q.price;
      const isKR = ticker.endsWith(".KS") || ticker.endsWith(".KQ");
      const data = {
        ticker: raw,
        price: p.regularMarketPrice?.raw ?? p.regularMarketPrice,
        change: p.regularMarketChange?.raw ?? p.regularMarketChange,
        changeP: p.regularMarketChangePercent?.raw ?? p.regularMarketChangePercent,
        mktCap: p.marketCap?.raw ?? p.marketCap,
        currency: p.currency,
        market: isKR ? "국장" : "미장",
        updatedAt: new Date().toISOString(),
      };
      priceCache.set(cacheKey, data);
      return data;
    })
  );

  const output = {};
  results.forEach((r, i) => {
    if (r.status === "fulfilled") output[tickers[i]] = r.value;
    else output[tickers[i]] = { error: r.reason?.message };
  });
  res.json(output);
});

/**
 * GET /sector-tickers
 * 섹터별 티커 목록 반환 (프론트엔드 초기 로딩용)
 */
app.get("/sector-tickers", (req, res) => {
  res.json(SECTOR_TICKERS);
});

// ── 헬퍼 ───────────────────────────────────────────────────────

function getPeriodStart(range) {
  const now = new Date();
  switch (range) {
    case "1mo": return new Date(now.setMonth(now.getMonth() - 1));
    case "3mo": return new Date(now.setMonth(now.getMonth() - 3));
    case "6mo": return new Date(now.setMonth(now.getMonth() - 6));
    case "1y":  return new Date(now.setFullYear(now.getFullYear() - 1));
    default:    return new Date(now.setMonth(now.getMonth() - 1));
  }
}

// ── 섹터별 티커 마스터 데이터 ──────────────────────────────────
// 실제 서비스: DB 또는 별도 JSON 파일로 관리 권장

const SECTOR_TICKERS = {
  ai: {
    label: "AI·반도체",
    tickers: [
      // 미장
      { ticker: "NVDA",  name: "엔비디아",      market: "미장" },
      { ticker: "AMD",   name: "AMD",           market: "미장" },
      { ticker: "INTC",  name: "인텔",          market: "미장" },
      { ticker: "QCOM",  name: "퀄컴",          market: "미장" },
      { ticker: "AVGO",  name: "브로드컴",       market: "미장" },
      { ticker: "MU",    name: "마이크론",       market: "미장" },
      { ticker: "AMAT",  name: "어플라이드머티리얼즈", market: "미장" },
      { ticker: "LRCX",  name: "램리서치",       market: "미장" },
      { ticker: "META",  name: "메타",          market: "미장" },
      { ticker: "MSFT",  name: "마이크로소프트", market: "미장" },
      // 국장
      { ticker: "005930", name: "삼성전자",      market: "국장" },
      { ticker: "000660", name: "SK하이닉스",    market: "국장" },
      { ticker: "012510", name: "더존비즈온",    market: "국장" },
      { ticker: "042700", name: "한미반도체",    market: "국장" },
      { ticker: "336370", name: "솔브레인홀딩스", market: "국장" },
    ],
  },
  bio: {
    label: "바이오·헬스케어",
    tickers: [
      { ticker: "LLY",    name: "일라이 릴리",   market: "미장" },
      { ticker: "NVO",    name: "노보노디스크",   market: "미장" },
      { ticker: "JNJ",    name: "존슨앤존슨",     market: "미장" },
      { ticker: "ABBV",   name: "애브비",         market: "미장" },
      { ticker: "MRK",    name: "머크",           market: "미장" },
      { ticker: "PFE",    name: "화이자",         market: "미장" },
      { ticker: "AMGN",   name: "암젠",           market: "미장" },
      { ticker: "GILD",   name: "길리어드",       market: "미장" },
      { ticker: "207940", name: "삼성바이오로직스", market: "국장" },
      { ticker: "068270", name: "셀트리온",       market: "국장" },
      { ticker: "196170", name: "알테오젠",       market: "국장" },
      { ticker: "091990", name: "셀트리온헬스케어", market: "국장" },
      { ticker: "086520", name: "에코프로",       market: "국장" },
    ],
  },
  ev: {
    label: "전기차·배터리",
    tickers: [
      { ticker: "TSLA",   name: "테슬라",         market: "미장" },
      { ticker: "RIVN",   name: "리비안",         market: "미장" },
      { ticker: "NIO",    name: "니오",           market: "미장" },
      { ticker: "LCID",   name: "루시드모터스",   market: "미장" },
      { ticker: "GM",     name: "GM",             market: "미장" },
      { ticker: "F",      name: "포드",           market: "미장" },
      { ticker: "373220", name: "LG에너지솔루션", market: "국장" },
      { ticker: "247540", name: "에코프로비엠",   market: "국장" },
      { ticker: "051910", name: "LG화학",         market: "국장" },
      { ticker: "006400", name: "삼성SDI",        market: "국장" },
      { ticker: "096770", name: "SK이노베이션",   market: "국장" },
      { ticker: "003490", name: "대한항공",       market: "국장" },
    ],
  },
  defense: {
    label: "방산·우주",
    tickers: [
      { ticker: "LMT",    name: "록히드마틴",     market: "미장" },
      { ticker: "RTX",    name: "RTX",           market: "미장" },
      { ticker: "NOC",    name: "노스롭그루먼",   market: "미장" },
      { ticker: "GD",     name: "제너럴다이나믹스", market: "미장" },
      { ticker: "BA",     name: "보잉",           market: "미장" },
      { ticker: "SPCE",   name: "버진갤럭틱",     market: "미장" },
      { ticker: "RKLB",   name: "로켓랩",         market: "미장" },
      { ticker: "012450", name: "한화에어로스페이스", market: "국장" },
      { ticker: "047810", name: "한국항공우주",   market: "국장" },
      { ticker: "064350", name: "현대로템",       market: "국장" },
      { ticker: "000885", name: "한화",           market: "국장" },
      { ticker: "272210", name: "한화시스템",     market: "국장" },
    ],
  },
  finance: {
    label: "금융·핀테크",
    tickers: [
      { ticker: "JPM",    name: "JP모건",         market: "미장" },
      { ticker: "BAC",    name: "뱅크오브아메리카", market: "미장" },
      { ticker: "GS",     name: "골드만삭스",     market: "미장" },
      { ticker: "V",      name: "비자",           market: "미장" },
      { ticker: "MA",     name: "마스터카드",     market: "미장" },
      { ticker: "PYPL",   name: "페이팔",         market: "미장" },
      { ticker: "SQ",     name: "블록(스퀘어)",   market: "미장" },
      { ticker: "105560", name: "KB금융",         market: "국장" },
      { ticker: "055550", name: "신한지주",       market: "국장" },
      { ticker: "086790", name: "하나금융지주",   market: "국장" },
      { ticker: "316140", name: "우리금융지주",   market: "국장" },
      { ticker: "003550", name: "LG",            market: "국장" },
    ],
  },
  energy: {
    label: "에너지·원자력",
    tickers: [
      { ticker: "CEG",    name: "콘스텔레이션에너지", market: "미장" },
      { ticker: "VST",    name: "비스트라",       market: "미장" },
      { ticker: "NRG",    name: "NRG에너지",      market: "미장" },
      { ticker: "XOM",    name: "엑손모빌",       market: "미장" },
      { ticker: "CVX",    name: "셰브론",         market: "미장" },
      { ticker: "NEE",    name: "넥스트에라에너지", market: "미장" },
      { ticker: "BE",     name: "블룸에너지",      market: "미장" },
      { ticker: "082740", name: "한국전력",       market: "국장" },
      { ticker: "036460", name: "한국가스공사",   market: "국장" },
      { ticker: "015760", name: "한국전력기술",   market: "국장" },
      { ticker: "017390", name: "서울가스",       market: "국장" },
    ],
  },
};

// ── 뉴스 ───────────────────────────────────────────────────────

const DART_KEY = process.env.DART_KEY || "6bd36145db1a88fbee15483d7ca0f08daddfc614";
const AdmZip = require("adm-zip");
const { parseStringPromise } = require("xml2js");

// corp_code 매핑 테이블 (종목코드 → corp_code)
const corpCodeMap = {};
let corpCodeLoaded = false;

async function loadCorpCodes() {
  try {
    console.log("DART 기업코드 로딩 중...");
    const res = await axios.get(
      `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${DART_KEY}`,
      { responseType: "arraybuffer", timeout: 30000 }
    );
    const zip = new AdmZip(Buffer.from(res.data));
    const xmlEntry = zip.getEntries().find(e => e.entryName.endsWith(".xml"));
    if (!xmlEntry) throw new Error("XML 파일 없음");
    const xml = xmlEntry.getData().toString("utf8");
    const parsed = await parseStringPromise(xml);
    const corps = parsed?.result?.list || [];
    for (const c of corps) {
      const stockCode = c.stock_code?.[0]?.trim();
      const corpCode = c.corp_code?.[0]?.trim();
      if (stockCode && corpCode && stockCode.length === 6) {
        corpCodeMap[stockCode] = corpCode;
      }
    }
    corpCodeLoaded = true;
    console.log(`DART 기업코드 로딩 완료: ${Object.keys(corpCodeMap).length}개`);
  } catch (err) {
    console.error("DART 기업코드 로딩 실패:", err.message);
  }
}
loadCorpCodes();

/**
 * GET /dart/financials/:ticker
 * DART에서 국장 종목 최근 영업이익 가져오기
 */
app.get("/dart/financials/:ticker", async (req, res) => {
  const ticker = req.params.ticker;
  const cacheKey = `dart_${ticker}`;
  const cached = fundamentalCache.get(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    if (!corpCodeLoaded) return res.status(503).json({ error: "기업코드 로딩 중, 잠시 후 재시도" });
    const corpCode = corpCodeMap[ticker];
    if (!corpCode) return res.status(404).json({ error: "기업 없음", ticker });

    const year = new Date().getFullYear();
    let opIncome = null;

    for (const bsnsYear of [year - 1, year - 2]) {
      try {
        const finRes = await axios.get("https://opendart.fss.or.kr/api/fnlttSinglAcnt.json", {
          params: {
            crtfc_key: DART_KEY,
            corp_code: corpCode,
            bsns_year: String(bsnsYear),
            reprt_code: "11011",
          },
          timeout: 8000,
        });
        const items = finRes.data?.list || [];
        const opItem = items.find(i =>
          i.account_nm?.includes("영업이익") && i.fs_div === "CFS"
        ) || items.find(i => i.account_nm?.includes("영업이익"));

        if (opItem?.thstrm_amount) {
          opIncome = parseInt(opItem.thstrm_amount.replace(/,/g, ""), 10);
          break;
        }
      } catch { continue; }
    }

    const data = { ticker, corpCode, opIncome, updatedAt: new Date().toISOString() };
    fundamentalCache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /kr-quote/:ticker
 * 네이버 금융 국장 실시간 주가 프록시 (CORS 우회)
 */
app.get("/kr-quote/:ticker", async (req, res) => {
  const ticker = req.params.ticker;
  const cacheKey = `krquote_${ticker}`;
  const cached = priceCache.get(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });
  try {
    const response = await axios.get(
      `https://polling.finance.naver.com/api/realtime/domestic/stock/${ticker}`,
      { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://finance.naver.com" }, timeout: 5000 }
    );
    const d = response.data?.datas?.[0];
    if (!d) return res.status(404).json({ error: "종목 없음" });
    const isRising = d.compareToPreviousPrice?.code === "2";
    const data = {
      ticker,
      price: d.closePriceRaw,
      change: isRising ? d.compareToPreviousClosePriceRaw : -d.compareToPreviousClosePriceRaw,
      changeP: isRising ? parseFloat(d.fluctuationsRatioRaw) : -parseFloat(d.fluctuationsRatioRaw),
      high: d.highPriceRaw,
      low: d.lowPriceRaw,
      mktCap: d.marketValueFullRaw,
      updatedAt: new Date().toISOString(),
    };
    priceCache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 네이버 금융 뉴스 검색
 * GET /news/search?q=삼성전자&display=5
 *
 * 네이버 검색 API 키가 없으면 네이버 금융 RSS로 대체
 * 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
 */
app.get("/news/search", async (req, res) => {
  const q = req.query.q || "";
  const display = Math.min(parseInt(req.query.display) || 5, 10);
  if (!q) return res.status(400).json({ error: "q required" });

  const cacheKey = `news_${q}_${display}`;
  const cached = newsCache.get(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  // ① 네이버 검색 API (키가 있을 때)
  if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
    try {
      const naverRes = await axios.get("https://openapi.naver.com/v1/search/news.json", {
        params: { query: q, display, sort: "date" },
        headers: {
          "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
          "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
        },
        timeout: 5000,
      });
      const items = naverRes.data.items.map(cleanNaverItem);
      const data = { query: q, items, source: "naver_api", fetchedAt: new Date().toISOString() };
      newsCache.set(cacheKey, data);
      return res.json(data);
    } catch (err) {
      console.warn("Naver API failed, falling back to RSS:", err.message);
    }
  }

  // ② 네이버 금융 RSS 폴백
  try {
    const encoded = encodeURIComponent(q);
    const rssUrl = `https://finance.naver.com/news/news_search.naver?searchType=searchHistory&query=${encoded}&x=0&y=0`;
    const rssRes = await axios.get(
      `https://search.naver.com/search.naver?where=news&query=${encoded}+주식&sm=tab_opt&sort=1&photo=0&field=0&pd=0&ds=&de=&docid=&related=0&mynews=0&office_type=0&office_section_code=0&news_office_checked=&nso=so:dd,p:all,a:all&start=1`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; StockLens/1.0)" }, timeout: 6000 }
    );
    const $ = cheerio.load(rssRes.data);
    const items = [];
    $("div.news_wrap").each((i, el) => {
      if (i >= display) return false;
      const title = $(el).find("a.news_tit").text().trim();
      const url   = $(el).find("a.news_tit").attr("href") || "";
      const desc  = $(el).find("div.dsc_wrap").text().trim().slice(0, 200);
      const press = $(el).find("a.info.press").text().trim();
      const pubDate = $(el).find("span.info").last().text().trim();
      if (title) items.push({ title, url, description: desc, press, pubDate });
    });
    const data = { query: q, items, source: "naver_scrape", fetchedAt: new Date().toISOString() };
    newsCache.set(cacheKey, data);
    return res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 티커별 뉴스 (종목명으로 자동 검색)
 * GET /news/ticker/:ticker
 */
app.get("/news/ticker/:ticker", async (req, res) => {
  const raw = req.params.ticker;
  // 티커 → 종목명 매핑 (서버 내 SECTOR_TICKERS 활용)
  const stockInfo = findStockByTicker(raw);
  const query = stockInfo?.name || raw;
  const display = parseInt(req.query.display) || 5;

  const cacheKey = `newsticker_${raw}_${display}`;
  const cached = newsCache.get(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const encoded = encodeURIComponent(query + " 주가");
    const scrapeRes = await axios.get(
      `https://search.naver.com/search.naver?where=news&query=${encoded}&sm=tab_opt&sort=1&start=1`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; StockLens/1.0)" }, timeout: 6000 }
    );
    const $ = cheerio.load(scrapeRes.data);
    const items = [];
    $("div.news_wrap").each((i, el) => {
      if (i >= display) return false;
      const title   = $(el).find("a.news_tit").text().trim();
      const url     = $(el).find("a.news_tit").attr("href") || "";
      const desc    = $(el).find("div.dsc_wrap").text().trim().slice(0, 300);
      const press   = $(el).find("a.info.press").text().trim();
      const pubDate = $(el).find("span.info").last().text().trim();
      if (title) items.push({ title, url, description: desc, press, pubDate });
    });
    const data = { ticker: raw, name: query, items, source: "naver_scrape", fetchedAt: new Date().toISOString() };
    newsCache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 기사 본문 크롤링
 * GET /news/article?url=https://...
 *
 * 네이버 뉴스 / 한국경제 / 이데일리 등 주요 언론사 지원
 * 타 사이트는 메타 description + og:description 폴백
 */
app.get("/news/article", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "url required" });

  const cacheKey = `article_${url}`;
  const cached = newsCache.get(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const pageRes = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      timeout: 8000,
      maxRedirects: 5,
    });
    const $ = cheerio.load(pageRes.data);

    // 사이트별 본문 셀렉터
    const SELECTORS = [
      "#dic_area",            // 네이버 뉴스
      "#newsct_article",      // 네이버 뉴스 (신형)
      ".article_body",        // 한국경제
      "#articleBodyContents", // 조선일보
      ".article-body",        // 이데일리
      "#news_body_area",      // 연합뉴스
      "#content-body",        // 서울경제
      ".news_body",           // 일반
      "article",              // 시맨틱 HTML
    ];

    let bodyText = "";
    for (const sel of SELECTORS) {
      const el = $(sel);
      if (el.length) {
        // 광고·스크립트 제거
        el.find("script, style, .ad, .advertisement, figure").remove();
        bodyText = el.text().replace(/\s{2,}/g, "\n").trim();
        if (bodyText.length > 100) break;
      }
    }

    // 폴백: og:description
    if (!bodyText) {
      bodyText = $('meta[property="og:description"]').attr("content")
        || $('meta[name="description"]').attr("content")
        || "본문을 가져올 수 없습니다.";
    }

    const title = $('meta[property="og:title"]').attr("content") || $("title").text().trim();
    const image = $('meta[property="og:image"]').attr("content") || "";
    const press = $('meta[property="og:site_name"]').attr("content") || "";

    const data = {
      url, title, bodyText: bodyText.slice(0, 3000), // 최대 3000자
      image, press, fetchedAt: new Date().toISOString(),
    };
    newsCache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message, url });
  }
});

// ── 헬퍼 함수 ──────────────────────────────────────────────────

function cleanNaverItem(item) {
  const strip = (s) => s?.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").trim() || "";
  return {
    title: strip(item.title),
    url: item.link || item.originallink,
    description: strip(item.description),
    press: item.originallink ? new URL(item.originallink).hostname.replace("www.", "") : "",
    pubDate: item.pubDate,
  };
}

function findStockByTicker(ticker) {
  for (const sector of Object.values(SECTOR_TICKERS)) {
    const found = sector.tickers.find(t => t.ticker === ticker);
    if (found) return found;
  }
  return null;
}

// ── 서버 시작 ───────────────────────────────────────────────────

app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔══════════════════════════════════════╗
║       StockLens API Server           ║
║       http://localhost:${PORT}           ║
╚══════════════════════════════════════╝

엔드포인트:
  GET /health                         서버 상태
  GET /quote/:ticker                  단일 종목 주가
  GET /batch?tickers=NVDA,005930      다중 종목 주가
  GET /fundamentals/:ticker           재무 데이터
  GET /history/:ticker?range=1mo      주가 히스토리
  GET /sector-tickers                 섹터별 티커 목록

  GET /news/search?q=삼성전자          뉴스 검색
  GET /news/ticker/:ticker             종목별 최신 뉴스
  GET /news/article?url=https://...    기사 본문 크롤링

네이버 API 키 설정 시 더 안정적인 뉴스 제공:
  NAVER_CLIENT_ID / NAVER_CLIENT_SECRET (.env)
  `);
});
