# Ticket 03: 美股真實 20D OHLCV 日 K 抓取、入庫與真實 CMF 資金流計算

## 狀態
- 狀態: `completed`
- 關聯規格: `docs/specs/0120-dual-market-smart-money-zero-loss-and-atomic-resilience-spec.md` (模組三)
- 關聯 Issue: #35
- 標籤: `enhancement,ready-for-agent`

## 任務目標
徹底拔除 `src/components/ChipsWorkspace.tsx` 與持倉美股計算中所有的 `Array.from` 虛擬模擬日 K 代碼；接軌 Yahoo Finance 官方 Chart API，將美股持倉與全市場美股焦點 Top 25 標的的真實 20~60 根日 K（含 Open, High, Low, Close, Volume）抓取並寫入 IndexedDB `ohlcvStore`，以真實量價結構計算標準 20 日 CMF（佳慶資金流向）。

## 具體修改清單
1. **`src/engine/smartMoneyFetcher.ts` 或 `src/engine/historicalOhlcvBackfill.ts`**：
   - 封裝 `fetchUsRealCandlesAndCmf(symbols: string[])`，批次拉取並將真實 20D OHLCV 與 CMF 寫入快取。
   - 驗證真實 CMF 計算符合標準 Chaikin Money Flow 公式。
2. **`src/components/ChipsWorkspace.tsx`**：
   - 移除 `filterMarketFocusList` 內針對美股的 `Array.from({ length: 20 })` 模擬代碼。
   - 移除持倉美股中的 `Array.from({ length: 20 })` 模擬代碼。
   - 在美股模式（US）與全市場模式（ALL）中，採用真實抓取並快取之美股日 K 與真實 CMF 計算氣泡位置與歷史時序位移點。
3. **單元測試 (`src/engine/smartMoneyEngine.test.ts` & `src/components/ChipsWorkspace.test.ts`)**：
   - 驗證美股真實日 K 成功計算 CMF，且絕無虛擬模擬資料殘留。

## 驗收標準
- [ ] 美股氣泡 Y 軸強度與時序播放 100% 依據真實 20D OHLCV 計算。
- [ ] 專案中無任何美股虛擬 K 線合成邏輯殘留。
- [ ] `npm test` 100% 通過。
