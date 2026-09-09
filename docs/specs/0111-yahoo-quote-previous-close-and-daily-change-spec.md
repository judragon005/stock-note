# 0111 規格書：Yahoo 報價解析昨日收盤價與當日漲跌幅校正 (Yahoo Quote Previous Close & Daily Change Fix Spec)

## 1. 概述 (Overview)

本規格定義修復 Yahoo Finance 報價解析引擎中，誤將圖表起點價格 `meta.chartPreviousClose` 當作「昨日收盤價 (Previous Close)」，導致全站當日價差（Change）、當日漲跌幅（Change Percent）與當日部位損益（Today's PnL）被嚴重扭曲放大數倍的重大計算缺陷。透過優先解析官方今日價差與昨收欄位、安全倒推真實昨收價，徹底恢復與券商真實行情 100% 精準對齊。

---

## 2. 根本原因與現場還原 (Root Cause & Reproduction)

### 2.1 缺陷現象
以 00636 國泰中國A50 (2026-09-09 當日收盤) 為例：
- **券商 APP 行情**：現價 `27.27`，今日跌幅 `▼ 0.11 (-0.40%)`，昨收價為 `27.38`。
- **本系統過去畫面**：現價 `27.27`，今日跌幅卻顯示 `-0.86 (-3.06%)`，今日損益高達 `-8,600 元`。

### 2.2 程式碼致命根源
在 `src/engine/priceFetcher.ts` 之 `parseYahooQuoteResponse`：
- 系統發起請求帶有 `range=3mo`。
- `meta.chartPreviousClose` 在 Yahoo API 的定義是：**整張圖表查詢範圍（3 個月前）開始前一日的歷史收盤價（28.13）**，根本不是昨天的收盤價！
- 原始碼卻使用：
  ```typescript
  const prevClose = typeof meta.chartPreviousClose === 'number' ? meta.chartPreviousClose : ...;
  const change = price - prevClose; // 27.27 - 28.13 = -0.86 (誤拿今日比 3 個月前！)
  ```
- 事實上，Yahoo API 官方早就在 `meta` 中提供真實今日數據：
  - `meta.regularMarketChange` 或 `meta.fulldayChange`：`-0.11`
  - `meta.regularMarketChangePercent` 或 `meta.fulldayChangePercent`：`-0.402%`

---

## 3. 功能需求與詳細規格 (Functional Specifications)

### 3.1 報價解析引擎重構 (`src/engine/priceFetcher.ts`)
在 `parseYahooQuoteResponse` 中：
1. **優先提取今日真實價差與漲跌幅**：
   - 今日價差 `change`：
     - 若 `typeof meta.regularMarketChange === 'number'` ➔ 採用 `meta.regularMarketChange`；
     - 否則若 `typeof meta.fulldayChange === 'number'` ➔ 採用 `meta.fulldayChange`；
     - 否則若 `typeof meta.regularMarketPreviousClose === 'number'` ➔ `price - meta.regularMarketPreviousClose`；
     - 否則若 `typeof meta.previousClose === 'number'` ➔ `price - meta.previousClose`；
     - 否則預設為 `0`。
   - 今日漲跌幅 `changePercent`：
     - 若 `typeof meta.regularMarketChangePercent === 'number'` ➔ 採用 `meta.regularMarketChangePercent`；
     - 否則若 `typeof meta.fulldayChangePercent === 'number'` ➔ 採用 `meta.fulldayChangePercent`；
     - 否則依推導之 `prevClose` 計算：`prevClose > 0 ? (change / prevClose) * 100 : 0`。
2. **正確推導昨日收盤價 (`previousClose`)**：
   - 優先取 `meta.regularMarketPreviousClose` 或 `meta.previousClose`；
   - 若兩者皆無但 `change` 存在，依標準會計定義倒推：`price - change`（例如 $27.27 - (-0.11) = 27.38$）；
   - **嚴格禁止使用 `chartPreviousClose` 作為昨日收盤價**（僅在整張圖表為 1d/5d 極短期且無任何其他欄位時方可作為最後備援，或徹底廢除其作為昨收價之依據）。

### 3.2 匯率解析同步修復 (`parseYahooExchangeRateResponse`)
- 同步排查 `src/engine/priceFetcher.ts` 之 `parseYahooExchangeRateResponse`，避免 `chartPreviousClose` 污染美元兌台幣匯率的當日波動。

---

## 4. 驗收標準 (Acceptance Criteria)

1. **單元測試驗證**：
   - 傳入 00636 真實 Yahoo Meta（`price: 27.27`, `fulldayChange: -0.11`, `chartPreviousClose: 28.13`），解析結果之 `change` 必須為 `-0.11`，`changePercent` 必須為 `-0.402%`，`previousClose` 必須為 `27.38`，絕不可出現 `-0.86` 或 `28.13`。
2. **回歸防護**：
   - 現有單元測試（包含美股、台股、TWSE OpenAPI 備援解析）100% 通過。
   - `npx vitest run` 57 個測試套件、654+ 個測試全數綠燈。
3. **TypeScript 構建**：
   - `npm run build` 0 型別錯誤。
