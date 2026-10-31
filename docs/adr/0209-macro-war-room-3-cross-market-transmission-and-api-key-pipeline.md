# 0209 ADR: 宏觀戰情室 3.0 — 台美費半跨市傳導鏈、總經波段雙溫度計、已配置 API 金鑰池全自動接線與跨模組孤島貫通 (Macro War Room 3.0: Cross-Market SOX/ADR Transmission, Macro-Swing Dual Thermometer, Encrypted API Key Pool Pipeline, and Cross-Module Integration)

## 狀態 (Status)

* **狀態：** `APPROVED`
* **決策日期：** 2026-10-30
* **關聯 Issue：** #359
* **對應規格書：** [`docs/specs/0209-macro-war-room-3-cross-market-transmission-and-api-key-pipeline-spec.md`](file:///d:/APP/股票紀錄/docs/specs/0209-macro-war-room-3-cross-market-transmission-and-api-key-pipeline-spec.md)

---

## 脈絡與問題陳述 (Context & Problem Statement)

針對「宏觀戰情室 (`WarRoomWorkspace.tsx`)」及全專案 80+ 個底層引擎進行三輪法人與長期/波段實戰投資視角深度調研後，發現以下四大結構性問題：

1. **假數據硬編碼與已配置 API 金鑰池斷鏈**：
   - `DEFAULT_MACRO_SNAPSHOT` 與 `macroPulseStorage.ts` 硬編碼黃金現貨為 `2515.2`（混淆 `GLD` ETF 與 `GC=F` 國際黃金現貨/期貨 3,000~4,000+ USD/oz），並以 `Math.sin`/`Math.cos` 產生 30 天假歷史數據；UI「重新整理數據」按鈕以 `Math.random()` 造假；後端 `sync-us-market.cjs` 與 `bootstrap-lakehouse-full.cjs` 寫死 `4.12 / 18.25 / 54.0` 假常數。
   - 使用者已於 `UnifiedApiKeyManager` 申請並配置 `FRED`、`FinMind`、`Finnhub`、`FMP`、`Tiingo`、`Alpha Vantage` 等 9 大金融 API 金鑰池，但 `globalKeyRotator` 啟動時未自動載入 `loadEncryptedKeyPool()`，亦未橋接至後端 `/api/market/macro`，導致聯準會利率、CPI、高收益債利差與台股大盤融資維持率停留在寫死假值。
2. **缺乏台美分流與費城半導體 (`^SOX`) / 台積電 ADR (`TSM`) 跨市場傳導鏈**：
   - 漏納對台股與電子波段影響最關鍵的 **費城半導體指數 (`^SOX`)**、**台積電 ADR (`TSM`) 溢折價率 (%)**、**台美四大指數 (`^TWII`, `^SOX`, `^GSPC`, `^IXIC`) 20MA/60MA 波段位階與乖離率**，以及 **台股大盤漲跌家數騰落廣度 (Market Breadth) 與三大法人現貨買賣超**（無法識破「拉積盤」陷阱）。
3. **長線總經與短線波段訊號打架**：
   - 單一評分混雜長線慢變數与短線快變數，缺乏獨立的「🧭 長線總經配置溫度計」與「⚡ 短中期波段戰術溫度計」，且未接入 `marketStatusEngine` 呈現台美跨時區開休市狀態。
4. **全專案 12 個既有專業引擎淪為孤島**：
   - 戰情室總資產誤用純股票市值而非 `effectiveNavTWD`；可動用現金未扣除 T+2 待交割淨流出 (`pendingSettlements`) 與近 7 日 `dcaSchedulerEngine` 扣款；未接入 `lookThroughEngine`（僅寫死 4 檔 ETF）、`rebalancingEngine`（寫死 `2.8%`）、`marginStressEngine`（無借款時寫死 `250%` 假維持率）、`fxBreakdown`（美股成本匯率緩衝墊）、本地 SQLite/IndexedDB 日 K 水合（雙動能顯示 `-999%`）、`riskAlertEngine`、`dispositionWindowEngine`、`behavioralAuditEngine`、`estimateExDividendIndexImpactPoints`、`strategyPinEngine` 與全站 `colorTheme` 紅綠漲跌變數。

---

## 決策結果 (Decision Outcome)

遵循 KISS 原則、第一性原理與「零新第三方套件、零新申請 API Key、100% 複用既有純函式引擎」方針，採納四大工程單元決策：

1. **打通已配置 API 金鑰池與多源真實宏觀管線 (`/api/market/macro`)**：
   - 建立 `ensureKeyPoolHydrated()` 自動將 `loadEncryptedKeyPool()` 注入 `globalKeyRotator`，並透過本地安全 Header 橋接至 `/api/market/macro`，串聯 **FRED 官方總經 API**、**FinMind 台股籌碼 API**、**Finnhub/FMP 財報日曆**、**Yahoo Finance v8 (`^SOX`, `TSM`, `GC=F`, `CL=F`, `DX-Y.NYB`, `TWD=X`, `^VIX`, `^TNX`)**、**台灣期交所 OpenAPI** 與 **本地 SQLite Lakehouse 全市場騰落廣度/法人現貨聚合**，100% 根除所有 `Math.sin`/`Math.random` 與寫死常數。
2. **建立「總經配置 × 波段戰術」雙溫度計與費半/ADR 傳導引擎 (`macroAdvisorEngine.ts`)**：
   - 實作 `evaluateMacroDualThermometer` 與 `calculateTsmcAdrPremium`，分離長線總倉位上限 (%) 與短線波段買賣訊號（含拉積盤偵測），動態依 VIX 縮放 1-Day 95% VaR，並於無借款時誠實標示零槓桿（廢除 `250%` 假維持率）。
3. **貫通全專案 12 大既有引擎**：
   - 全面接線 `effectiveNavTWD`、扣除 T+2 在途交割與 7 日 DCA 之「真·自由可動用子彈」、`lookThroughEngine` 真實半導體穿透權重與費半壓力測試、`rebalancingEngine` 真實偏離度、`marginStressEngine` 斷頭緩衝、`fxBreakdown` 美股匯差緩衝墊、本地真實 OHLCV K 線水合、`riskAlertEngine`、`dispositionWindowEngine`、`behavioralAuditEngine` 與 `estimateExDividendIndexImpactPoints`。
4. **「30 秒盤前決策漏斗」高內聚子元件拆解與全站主題色對齊**：
   - 拆解為 `MacroDualThermometerBar`、`MacroStrategyPinBar`、`PortfolioShieldAndAmmoCard` 等子元件，提供 `🌐 全球 / 🇹🇼 台股 / 🇺🇸 美股` 三視角切換（與頂部 `Header` 雙向同步）、持股一鍵跳轉（全息技術面 / 個股 AI 戰情室 / 下單彈窗），並全面改用 `var(--gain-color)` / `var(--loss-color)` 對齊台美紅綠漲跌主題。

