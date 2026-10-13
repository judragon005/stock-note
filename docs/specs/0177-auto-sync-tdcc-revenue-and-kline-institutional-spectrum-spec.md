# 0177 Spec: TDCC 與月營收全自動新鮮度自癒入庫與主 K 線圖法人級色譜重構規格書

## 1. 概述與問題陳述 (Overview & Problem Statement)

### 1.1 背景與問題痛點
在 AI 主力戰情室日常使用中，發現以下三個關鍵缺陷：
1. **數據基準日固化與被動維護 (Reactive Maintenance)**：
   * 卡片 19（TDCC 集保千張大戶趨勢）與卡片 20（月營收與成長趨勢）過去寫死固定日期（`2026-10-02` 與 `2026-08`）。
   * 系統缺乏動態推算市場已過結算週期的機制，必須仰賴使用者發現、提報 Issue、再由工程師手動執行入庫，嚴重違反自動化自癒（Self-Healing）原則。
2. **主 K 線圖底部分界線重疊瑕疵 (K-Line Border Glitch)**：
   * 主 K 線圖底部與副圖之間出現兩條平行的灰色橫線。
   * 經程式碼溯源，主圖繪製了 `y1={klineHeight}` (Y=220) 分割線，而副圖繪製了 `y1={subchartTop}` (Y=230) 分界線，間隔 10px 形成鐵軌般冗餘線條，干擾判讀。
3. **MA 均線顏色混淆與法人季線隱形 (MA Color Collision & Invisible 60MA)**：
   * MA20（月線 `#c084fc` 粉紫）與 MA250（年線 `#a855f7` 深紫）處於同一紫色系，均線交會時極難區分。
   * 法人核心波段生死線 MA60（季線）採用灰色虛線，在暗黑主題下如同次要輔助格線，嚴重背離操盤實戰直覺。

### 1.2 目標 (Goals)
1. 建立 **TDCC 與月營收全自動新鮮度動態自癒管線**：以純領域函數動態推算結算點，並將新鮮度評估與非同步背景追趕深度整合至 Vite 中介層，實現使用者零感知（Silent & Non-blocking）的自動入庫。
2. 消除主 K 線圖雙灰色橫線，收斂為單一俐落的副圖微光分割線。
3. 重構 MA 均線為券商法人級高辨識度光譜（MA5 黃、MA10 青藍、MA20 洋紅、MA60 亮橘實線、MA250 尊爵紫），消除色相衝突。

---

## 2. 第一性原理與業務領域邏輯 (Domain Logic & Principles)

### 2.1 台灣市場週期結算規則
```
[週五 21:00 結算] ─── TDCC 集保股權分散表 (每週一次) ───> 錨點：本週五 (若未滿 21:00 或其他平日則退回上週五)
[每月 10 日 17:30] ─── MOPS 公開資訊觀測站月營收 (每月一次) ──> 錨點：上個月 (10 日前則錨定上上個月)
```

1. **TDCC 週五結算錨點純函數 (`getLatestSettledTdccFriday`)**：
   * 時區：台北時間 (UTC+8)。
   * 若當前為週五 (`day === 5`)：
     * 若時間 $\ge$ 21:00：結算當日 (`YYYY-MM-DD`)。
     * 若時間 $<$ 21:00：退回上週五 (7 天前)。
   * 若為非週五（週六至週四）：退回至剛過去之週五（扣除 `(day + 7 - 5) % 7` 天）。
2. **月營收申報截止錨點純函數 (`getLatestSettledRevenueMonth`)**：
   * 時區：台北時間 (UTC+8)。
   * 若當前日期已超過當月 10 日 17:30：錨點為上個月 (`YYYY-MM`)。
   * 若當前日期在當月 10 日 17:30 之前：錨點為上上個月 (`YYYY-MM`)。

### 2.2 券商法人級 MA 均線色譜定義
深色暗黑背景下，5 條均線色彩必須在色相環（Hue）上 100% 互斥，且不得與紅漲綠跌或年線紫色混淆：

| 均線代碼 | 週期意涵 | 規範色碼 | 視覺定義 | 繪製樣式 |
| :--- | :--- | :--- | :--- | :--- |
| **MA5** | 週線 (極短線攻擊) | `#eab308` | 亮黃 (High-Alert Yellow) | 實線 1.6px |
| **MA10** | 雙週線 (短線支撐) | `#06b6d4` | 青藍 (Cyan Sky) | 實線 1.5px |
| **MA20** | 月線 (短波段生命線) | `#ec4899` | 洋紅/桃紅 (Magenta) | 實線 1.5px (徹底避開紫色) |
| **MA60** | 季線 (法人波段生死線) | `#f97316` | 亮橘 (Vibrant Orange) | **實線 1.5px (廢除灰色虛線)** |
| **MA250** | 年線 (長期多空基石) | `#a855f7` | 尊爵紫 (Deep Violet) | 實線 1.6px |

---

## 3. 系統架構變更與模組邊界 (System Architecture)

### 3.1 模組 1：市場新鮮度服務擴展 (`scripts/market-sync/market-freshness-service.cjs`)
* 新增並導出 `getLatestSettledTdccFriday(now?: Date): string`。
* 新增並導出 `getLatestSettledRevenueMonth(now?: Date): string`。
* 擴展 `checkMarketFreshness(db, now?: Date)`：
  * 查詢 `tw_tdcc_distribution` 的 `MAX(date)`。
  * 查詢 `tw_monthly_revenue` 的 `MAX(year_month)`。
  * 比較資料庫最新值與動態錨點，產出 `tdcc.isStale` 與 `revenue.isStale` 布林旗標。

### 3.2 模組 2：入庫腳本動態錨點化 (`ingest-tw-tdcc.cjs` & `ingest-tw-monthly-revenue.cjs`)
* `runTdccIngestion(customDbPath, targetDate, backfillWeeks)`：
  * 若未指定 `targetDate`，預設自動呼叫 `getLatestSettledTdccFriday()` 作為起始錨點。
* `runMonthlyRevenueIngestion(customDbPath, targetYearMonth, backfillMonths)`：
  * 若未指定 `targetYearMonth`，預設自動呼叫 `getLatestSettledRevenueMonth()` 作為起始錨點。

### 3.3 模組 3：中介層背景追趕整合 (`scripts/market-sync/vite-market-middleware.cjs`)
* 中介層啟動巡檢與 `/api/market/sync-status` 路由：
  * 巡檢判定條件納入 `freshness.tdcc?.isStale` 與 `freshness.revenue?.isStale`。
* `triggerCatchupTask(customDbPath)` 追趕任務：
  * 依序在背景非同步執行 `runTwMarketSync`、`runTdccIngestion`、`runMonthlyRevenueIngestion`。
  * 嚴格受 `CATCHUP_COOLDOWN_MS` (10 分鐘冷卻鎖) 保護，防止前端多重併發觸發。

### 3.4 模組 4：主 K 線圖重疊線消除與均線光譜重構 (`src/components/aiForceDashboard/cards/KLineChartCard.tsx`)
* 導出型別安全常數 `KLINE_MA_COLORS`。
* 移除 Y=220 處的冗餘格線，僅保留 Y=230 (`subchartTop`) 單一副圖分界線。
* 將頂部 Legend、查價狀態列 Tooltip、以及 SVG `<polyline>` 的顏色與樣式全面對齊 `KLINE_MA_COLORS`。

---

## 4. 驗收標準 (Acceptance Criteria)

- [ ] **AC 1：TDCC 週五動態結算錨點純函數精確性**
  * 週五 21:00 後回傳當日 `YYYY-MM-DD`。
  * 週五 21:00 前回傳上週五（7 天前）。
  * 週六至週四回傳剛過去之週五。
- [ ] **AC 2：月營收申報截止動態錨點純函數精確性**
  * 當月 10 日 17:30 後回傳上個月 `YYYY-MM`。
  * 當月 10 日 17:30 前回傳上上個月 `YYYY-MM`。
  * 跨年度 1 月份邊界正確回退至前一年 11/12 月。
- [ ] **AC 3：資料庫新鮮度結構化評估**
  * `checkMarketFreshness(db)` 回傳包含 `tdcc` 與 `revenue` 的最新值、錨點值與 `isStale` 狀態。
  * 空資料庫容錯回傳 `isStale = false`。
- [ ] **AC 4：中介層背景自癒與冷卻鎖保護**
  * 偵測到陳舊時，非同步呼叫入庫作業，不中斷任何 HTTP 請求。
  * 10 分鐘冷卻期間內阻絕重複觸發。
- [ ] **AC 5：主 K 線圖雙灰色橫線消除**
  * 主圖與副圖之間僅有一條單一微光分割線，視覺乾淨。
- [ ] **AC 6：券商法人級 MA 均線光譜**
  * MA20 為洋紅 `#ec4899`、MA60 為亮橘 `#f97316` 實線，5 條均線色彩互斥。
  * 圖例標籤與繪製折線顏色一致。
- [ ] **AC 7：工程質量與零破壞防禦**
  * 單元測試 100% 通過（`npm test` 綠燈）。
  * TypeScript 型別檢查 0 錯誤（`npm run build` 綠燈）。

---

## 5. 非目標 (Non-Goals)
* 本次迭代不進行外部 TDCC 官網實體爬蟲的反爬逆向破解，專注於動態時間序列與中介層自動自癒機制的工程閉環。
