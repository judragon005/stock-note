# 規格書 0163：券商法人級全維度數據湖倉稽核、歷史籌碼斷層回補與台美雙軌自動化日更管線 (Spec 0163)

## Problem Statement

經 2026-10-03 穿透式稽核本機 SQLite 數據湖倉 (`market_history.db` 154 MB)、每日同步模組 (`scripts/market-sync/`) 與本機歷史庫，發現系統雖然具備 97 萬筆日 K 線基礎，但在「券商法人專業維度」與「自動化同步穩定性」上存在數個嚴重缺陷與斷層：

1. **三大法人籌碼歷史出現近 1.5 個月嚴重斷層**：
   - 既有本機歷史 CSV 僅至 2026-08-14，全市場核心個股（如 2330 台積電、2454 聯發科、2317 鴻海等）在 `tw_institutional_chips` 表中的歷史記錄全數停留在 2026-08-14。
   - 2026-08-15 至 2026-10-02 期間之 35 個交易日完全缺失三大法人買賣超，導致主力戰情室法人累計買賣超與長期集中度失真。
2. **每日定時同步存在欄位映射相容性 Bug**：
   - `scripts/market-sync/market-sync-core.cjs` 產生的物件欄位名稱為 `foreignNetShares`, `trustNetShares`, `dealerNetShares`。
   - `scripts/market-sync/ingest-tw-t86.cjs` 的入庫陳述式卻讀取 `item.foreignNet`, `item.trustNet`, `item.dealerNet`。
   - 屬性鍵名不匹配導致每日定時寫入的買賣超數據被強制轉型為 `0`，嚴重破壞日常日更有效性。
3. **擴展法人籌碼（融資融券、借券賣出 SBL、當沖率）未接入每日同步**：
   - 雖然已存在模組 `ingest-tw-extended-chips.cjs`，但 `sync-tw-market.cjs` 每日定時排程**未曾呼叫此管線**，亦未下載 TWSE MI_MARGN、TWT93U、TWTB4U，導致融資券、借券賣出與當沖比率在日常同步中漏失。
4. **美股主流標的符號轉譯錯誤造成 351 檔同步失敗**：
   - 在 `sync_checkpoints` 中記錄 351 檔 FAILED，抽樣發現如波克夏海瑟威（`BRK.A`、`BRK.B`）、布朗霍文（`BF.B`）等標的因點號 (`.`) 未轉譯為 Yahoo Finance 要求的連字符號 (`-`)，導致抓取時回傳 HTTP 404。
5. **缺少法人頂級決策維度（集保千張大戶持股比、月營收動能）**：
   - 券商法人研判籌碼鎖碼的決定性指標「每週 TDCC 集保股權分散表（千張大戶持股比）」以及研判基本面成長的「月營收 (YoY/MoM)」尚未建表持久化。

---

## Solution

建立端到端完整的「券商法人級全維度數據湖倉稽核、修復、回補與雙軌定時日更管線 (Broker-Grade Lakehouse & Dual-Market Pipeline)」：

1. **修正管線映射與特殊代碼轉譯 Bug**：
   - 修復 `sync-tw-market.cjs` 與 `ingest-tw-t86.cjs` 之鍵名映射，支援 `foreignNetShares` 與 `foreignNet` 雙向相容。
   - 實作美股符號轉譯正規化（如 `BRK.A/B` ➔ `BRK-A/B`，`BF.B` ➔ `BF-B`），重試並清空 351 檔美股失敗 Checkpoints。
2. **擴展 SQLite 湖倉專業法人資料表 (Schema Enhancement)**：
   - **集保千張大戶股權表** (`tw_tdcc_distribution`)：收錄標的代碼、統計日期、千張大戶持股比例 (`over_1000_ratio`)、400張以上大戶持股比例 (`over_400_ratio`)、總股東人數 (`total_shareholders`)。
   - **月營收與成長表** (`tw_monthly_revenue`)：收錄標的代碼、年月 (`YYYY-MM`)、當月營收、去年同期營收、年增率 (`yoy_rate`)、月增率 (`mom_rate`)、創歷史新高標記。
   - 在既有 `tw_institutional_chips` 健全維護：三大法人買賣超、融資餘額/增減、融券餘額/增減、券資比、借券賣出餘額 (SBL Balance) 與當沖率。
3. **背景非阻塞「歷史籌碼斷層回補管線 (Backfill Gap Pipeline)」**：
   - 建立獨立回補腳本 `backfill-historical-chips-gap.cjs`，自 2026-08-15 起至 2026-10-02 止，自動遍歷該區間內之交易日，批次向 TWSE/TPEx 官方介面抓取全市場 T86、融資券與當沖數據，以 Transaction 批次寫入 SQLite，不阻塞正在運行的前端 Dev Server。
   - 內建 Exponential Backoff 防封鎖節流機制。
4. **全面升級台美雙軌每日自動化排程 (Dual Automated Daily Pipelines)**：
   - **台股盤後日更 (每日 16:00)**：整包同步 TWSE/TPEx 收盤日 K + 三大法人 T86 + 融資融券 + 借券賣出 + 當沖率，寫入 `market_history.db` 並沉澱至 `tw_market_summary.json`。
   - **美股收盤日更 (每日 08:00)**：增量拉取 S&P 500 與主流美股日 K，自動 Checkpoint 續傳。
   - **TDCC 集保週更 (每週五 19:00)**：自動抓取台灣集保結算所最新股權分散表並落庫。
   - **月營收月更 (每月 11 日 09:00)**：自動抓取全市場最新月營收並落庫。
5. **零漏水稽核報告自動產出 (Zero-Data-Loss Audit Report)**：
   - 每次排程運行完畢自動更新 `.scratch/market-cache/sync_audit_report.json`，詳細列出當日各表存入筆數、覆蓋率、耗時與異常清單。

---

## User Stories

1. **作為台股波段投資人**，我希望在主力戰情室查詢 2330 或 2454 時，能看見從 2025 年 9 月一直到昨日（2026-10-02）連續不中斷的 250 天三大法人買賣超柱狀圖與累計買賣超折線，不再有 8/15 之後的斷層。
2. **作為量化空方/避險交易者**，我希望在籌碼數據中查閱借券賣出餘額 (SBL Balance) 與券資比，能每日自動更新，以精準掌握法人避險空單佈局與軋空風險。
3. **作為主力籌碼研究員**，我希望系統能每週自動更新集保千張大戶持股比率，讓我能一眼看出主力大戶是否在股價整理區持續吃貨鎖碼。
4. **作為價值成長型投資人**，我希望資料庫收錄每檔個股的月營收 YoY 與 MoM，並在前端提供月營收創歷史新高標籤，作為選股決策的濾網。
5. **作為美股投資人**，我希望查詢巴菲特波克夏（BRK.B）等個股時，系統不再拋出 HTTP 404，且能穩定獲取 250+ 交易日完整日 K。
6. **作為系統管理者**，我希望背景全量補全能安靜完成且不造成網路 IP 被封鎖，日後每天下午 16:00 與早上 08:00 電腦開機時自動完成日更，前端打開即秒開零等待。

---

## Implementation Decisions

### 1. 數據表結構定義與遷移 (Schema DDL & Migrations)

在 `scripts/market-sync/sqlite-db-core.cjs` 中擴展初始化：

```sql
-- 1. 集保千張大戶與股權分散表
CREATE TABLE IF NOT EXISTS tw_tdcc_distribution (
  symbol TEXT NOT NULL,
  date TEXT NOT NULL,                -- YYYY-MM-DD (通常為每週五結算日)
  total_shareholders INTEGER,        -- 總股東人數
  over_400_ratio REAL,               -- 400 張以上大戶持股比例 (%)
  over_1000_ratio REAL,              -- 1000 張以上大戶持股比例 (%)
  under_10_ratio REAL,               -- 10 張以下散戶持股比例 (%)
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (symbol, date)
);
CREATE INDEX IF NOT EXISTS idx_tdcc_symbol_date ON tw_tdcc_distribution(symbol, date DESC);

-- 2. 月營收與成長表
CREATE TABLE IF NOT EXISTS tw_monthly_revenue (
  symbol TEXT NOT NULL,
  year_month TEXT NOT NULL,          -- YYYY-MM
  revenue REAL NOT NULL,             -- 當月營收 (千元)
  last_year_revenue REAL,            -- 去年同月營收 (千元)
  yoy_rate REAL,                     -- 年增率 (%)
  mom_rate REAL,                     -- 月增率 (%)
  is_all_time_high INTEGER DEFAULT 0,-- 是否創歷史新高 (1/0)
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (symbol, year_month)
);
CREATE INDEX IF NOT EXISTS idx_revenue_symbol ON tw_monthly_revenue(symbol, year_month DESC);
```

### 2. 歷史斷層回補引擎 (`backfill-historical-chips-gap.cjs`)
- 計算當前 `tw_institutional_chips` 最早斷層日（2026-08-15）至最新交易日（2026-10-02）。
- 排除週末與國定假日（2026-09-25 中秋節等），產生待回補交易日列表（約 35 個交易日）。
- 依序對每日調用官方 TWSE/TPEx T86 與融資融券介面，單日數據在單一事務內寫入，並記錄每步進度與日誌。
- 每次請求間隔 1,500ms ~ 2,000ms，遇 429 自動 backoff 等待 15s，確保安全穩定。

### 3. 日更排程閉環整合 (`sync-tw-market.cjs` & `sync-us-market.cjs`)
- 整合 `ingest-tw-quotes.cjs`、`ingest-tw-t86.cjs`、`ingest-tw-extended-chips.cjs`。
- 確保所有物件傳遞之鍵名相容（容許 `foreignNetShares` 與 `foreignNet`）。
- 每次更新完畢自動刷新 `market_history.db`、`tw_market_summary.json` 與 `sync_audit_report.json`。

---

## Testing Decisions

### 1. 測試品質原則
- 遵循紅-綠-重構 (TDD) 循環，在公開介面縫隙編寫單元與整合測試。
- 100% 覆蓋欄位相容性、斷點續傳、非零數值驗證與特殊標的轉譯。

### 2. 測試縫隙 (Test Seams)
- **Seam 1: T86 與擴展籌碼解析與入庫縫隙 (`tests/market-sync/chips-ingestion.test.ts`)**
  - 驗證傳入 `foreignNetShares: -5914` 時，`saveTwT86ToSqlite` 能成功將 `-5914` 寫入 `foreign_net`，而非 `0`。
  - 驗證融資餘額、借券賣出餘額與當沖率能正確透過 `saveTwExtendedChipsToSqlite` 寫入同一列。
- **Seam 2: 美股符號相容性轉譯縫隙 (`tests/market-sync/us-symbol-normalizer.test.ts`)**
  - 驗證 `normalizeUsSymbol('BRK.B') === 'BRK-B'`、`normalizeUsSymbol('BF.B') === 'BF-B'`、`normalizeUsSymbol('AAPL') === 'AAPL'`。
- **Seam 3: 湖倉資料完整度與連續性驗收縫隙 (`tests/market-sync/lakehouse-integrity.test.ts`)**
  - 驗證 2330 於回補後，`tw_institutional_chips` 於 2026-08-15 至 2026-10-02 區間無任何遺漏交易日，且數值皆非預設假值。

---

## Out of Scope
1. 分時 Level 2 / Tick 級每秒盤口深度快照（維持日 K 與日級籌碼維度）。
2. 期貨、外匯與加密貨幣合約籌碼。
3. 付費彭博 / 路透終端機私有資料庫介面。

---

## Further Notes
- 本工程完成後，本機 SQLite 數據湖倉將躍升為機構級資料中心，不僅徹底解決當前主力戰情室的 8/15 籌碼斷層，更為日後的「集保大戶跟隨策略」與「營收成長動能選股」鋪平道路。
