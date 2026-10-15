# 技術債 0051: 未來現金流投影慣性配息庫動態學習與跨市場擴展 (Projected Cashflow Dynamic Profile Learning)

* **建立日期**：2026-10-15
* **狀態**：`OPEN`
* **優先級**：`P3 (Low)`
* **來源**：Code Review (Spec 0183 / Issue #254)
* **標籤**：`Feature` · `Refactor` · `ProjectedCashflow` · `Dividend` · `Lakehouse`

---

## 1. 現狀診斷與背景 (Context & Problem)

在 Spec 0183 實作中，`src/engine/projectedCashflowEngine.ts` 引入了 `DEFAULT_DIVIDEND_PROFILES` 靜態對應庫，涵蓋台灣熱門月配（00929, 00934, 00936, 00940）、季配（0056, 00878, 00919, 00713, 2330 等）與半年配標的。

### 存在痛點
1. **靜態寫死**：冷門個股或新掛牌 ETF 若未在靜態表內，系統預設降級為 8 月發放年配股，無法自動感知其季配或半年配節奏。
2. **美股覆蓋率**：美股標的（如 AAPL, MSFT, O, SCHD 等）的配息頻率尚未納入預設靜態表，需依賴使用者手動指定自訂設定檔 (`customPayoutRates`)。

---

## 2. 建議解法與架構演進 (Proposed Solution)

結合本機 SQLite 數據湖倉已有的歷史配息與公司行動數據，由靜態常數演進為「動態歷史頻率推導引擎」：

```text
[持股清單] ➔ [查詢 SQLite corporate_action_calendar / historical_dividends]
          ➔ [自動推導近 2 年除息次數與慣性月份 (如每年 3, 6, 9, 12)]
          ➔ [動態生成 PayoutRateConfig 緩存] ➔ [投影未來 12 個月現金流]
```

1. **歷史頻率動態推算**：自本地除息資料庫統計特定代碼每年除息筆數（12 次判定為月配，4 次判定為季配，2 次判定為半年配），並提取歷史慣性發放月份。
2. **三層優先級機制**：`使用者自訂覆蓋` > `資料庫歷史動態學習` > `DEFAULT_DIVIDEND_PROFILES 兜底常數`。

---

## 3. 預期效益 (Benefits)

1. **全市場自適應**：台股 2,000+ 檔標的與美股數千檔標的均能自動精準投影現金流月份，無需手動維護龐大字典。
2. **維護成本歸零**：ETF 若更改配息頻率（例如由年配改為季配），系統在同步最新除息公告後自動學習適應。
