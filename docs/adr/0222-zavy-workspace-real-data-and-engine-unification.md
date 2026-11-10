# ADR-0222: Zavy 慢富週期與配置工作區全鏈路真實數據驅動與既有引擎統一架構決策

* **狀態 (Status)**：`ACCEPTED`
* **日期 (Date)**：2026-11-10
* **關聯規格 (Spec)**：[`docs/specs/0222-zavy-workspace-real-data-and-engine-unification-spec.md`](file:///d:/APP/股票紀錄/docs/specs/0222-zavy-workspace-real-data-and-engine-unification-spec.md)
* **關聯 Issue**：[#478](https://github.com/judragon005/stock-note/issues/478)

---

## 1. 背景與問題 (Context and Problem Statement)

在 Spec 0221 初版交付後，針對 `ZavySlowWealthWorkspace` 進行端到端數據真實性審核，發現四大核心問題：
1. **鏡頭一（總經指南針）依賴寫死假數據**：前端寫死 `51.5 / 53.8 / 11.5%`，且後端 `ingest-macro-sentiment.cjs` 在使用者未設定 `FRED_API_KEY` 時直接回傳 `null`，未利用免費免 Key 的 FRED 官方公開 CSV 端點（`fredgraph.csv`）與本地 SQLite 現成的 `tw_monthly_revenue`（1,957 家上市櫃公司真實月營收）。
2. **鏡頭二（市場寬度與融資去槓桿）SQL 統計失真**：`getMarketMultiHorizonBreadth` 將台美交易日聯集計算導致單一市場交易日不足 200 天（`200MA = 0.0%`）、混入 4,660 檔 6 碼認購/認售權證稀釋寬度、單筆跨日美股覆蓋台股母體、融資餘額未過濾殘缺交易日（算出 `-81.2%` 假減幅）、大盤回撤死查不存在的 `^TWII` 而未 Fallback 至現成 `0050`。
3. **落底核對表硬編碼死常數**：`zavySlowWealthEngine.ts` 硬編碼 `isAtBollingerLowerBand: false` 與 `isBadNewsDivergenceObserved: false`。
4. **鏡頭三（A/B 雙軌配置）重複造輪子**：未呼叫專案內早已寫好並通過測試的 `rebalancingEngine.ts`（`calculateAssetClassRebalancePlan`）與 `monteCarloFireEngine.ts`（`calculateSlowWealthFireMetrics`），反而重寫了一套寫死 `currentEquityWeightPercent: 80`、`usdToTwdRate = 32` 且忽略股票質押 `LoanRecord` 的簡陋死代碼。

---

## 2. 決策結果 (Decision Outcome)

我們決定採取 **「100% 本地 SQLite 湖倉 + 外部免費免 Key API + 既有核心引擎委託統一」** 架構：

1. **零外部私有 CSV 依賴，善用免 Key FRED CSV 與本地 `tw_monthly_revenue`**：
   - 嚴禁讀取任何位於專案目錄外的私人檔案（如 `D:\APP\諮詢\私人\慢富之路` 下的 CSV），確保任何使用者電腦皆可獨立運行。
   - 在 `ingest-macro-sentiment.cjs` 內建免 Key FRED CSV 備援（`https://fred.stlouisfed.org/graph/fredgraph.csv?id=...`），免 Key 自動獲取 `DGS10`、`DGS2`、`T10Y2Y`、`BAMLH0A0HYM2`、`BAMLH0A3HYC`、`T10YIE`、`CPIAUCSL` 及美國製造業新訂單 (`AMTMNO`) 與存貨 (`AMTMTI`) 年增率。
   - 台灣基本面動能直接由 SQLite `tw_monthly_revenue`（過濾 4 碼普通股）動態算出「企業營收擴張擴散指數（Diffusion Index）」與「全市場總營收年增率（YoY %）」。
2. **市場寬度隔離定錨、權證過濾與 `0050` 大盤代理 Fallback**：
   - 台美市場各自定錨最新有效交易日與 200 日視窗；台股僅納入 4 碼普通股與 `00` 開頭 ETF（剔除 6 碼權證）。
   - 融資聚合加上 `HAVING COUNT(margin_balance) >= 1500` 防殘缺日污染；大盤回撤、布林通道下軌與利空鈍化優先查 `^TWII`，若無則自動以 `0050` 日 K 動態計算。
3. **廢除重複造輪子，單一真相來源委託（Single Source of Truth）**：
   - `zavySlowWealthEngine.ts` 移除重複計算迴圈與硬編碼常數，直接呼叫 `calculateAssetClassRebalancePlan` 與 `calculateSlowWealthFireMetrics`。

---

## 3. 權衡與影響 (Consequences)

* **優點 (Positive)**：
  - 100% 數據真實可溯源，免 API Key 開箱即用，消除所有寫死假數字與 `200MA = 0.0%` Bug。
  - 消除重複造輪子，使股票質押還款、設質鎖定四階減碼、股息活水導流與 30x 順序風險模擬與全系統保持 100% 一致。
* **缺點與緩解 (Negative & Mitigation)**：
  - 無網路且本地 SQLite 尚未初始化時，部分指標可能為 `null`；UI 採誠實空狀態（顯示 `--`），絕不回退至假數字。

