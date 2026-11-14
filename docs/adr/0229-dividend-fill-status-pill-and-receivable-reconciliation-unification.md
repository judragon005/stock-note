# ADR 0229: 股利實質填息全覆蓋、雙軌應收對帳統一與現金流全時態對齊架構決策 (Spec 0229)

## 狀態 (Status)

已接受 (Accepted) · 已實作 (Implemented)

## 背景與問題陳述 (Context & Problem Statement)

在「股利收益日誌與現金流全景」面板中，長期存在以下三大領域與體驗缺陷：
1. **填息膠囊無故消失（Disappearing Fill Status Pill）**：在歷史入帳明細表中，原本應顯示「實質填息」或「貼息中」之膠囊，一旦標的在庫存中已被全數平倉賣出（清倉），或缺乏除息參考價時，前端因條件短路直接回傳 `null`，造成膠囊消失與整欄空白。
2. **雙軌資料庫分裂（Split-Brain Database Syndrome）**：上方「⚡ 除息待入帳行事曆」消費的是外部除權息爬蟲所生成的應收池，而下方明細消費的是交易資料庫。當使用者已記錄未來預約交易（如 2026-12-16 華邦電 NT$ 8,000）時，上方行事曆卻大字宣稱「目前暫無記錄」，產生嚴重的資料矛盾與信任度危機。
3. **現金流時態口徑混淆（Temporal Mismatch In Cashflow Displays）**：頂部「未來 12 個月現金流預估行事曆」金額與下方「2026 各月份分佈長條圖」數值加總存在時態落差（前者的滾動 12 個月 vs 後者的自然年度），缺乏清楚口徑提示。

## 決策內容 (Decision Outcome)

1. **填息狀態自癒四態化 (Self-Healing Four-State Pipeline)**：
   - 擴充 `dividendMetricsEngine` 的 `DividendFillStatus` 為 `'FILLED' | 'UNFILLED' | 'CLOSED_POSITION' | 'PENDING_DATA'`。
   - 當持倉為空時，標記為 `CLOSED_POSITION`（「已結清部位」）；缺乏除息參考價時標記為 `PENDING_DATA`（「待補除息價」）。
   - 封裝獨立元件 `DividendFillStatusBadge`，徹底移除 `if (!fillStatus) return null` 類的條件短路，保證 100% 渲染。
2. **雙軌應收股利中樞統一 (Unified Dividend Receivable Hub)**：
   - 於 `dividendAggregator.ts` 建立領域純函式 `buildUnifiedPendingReceivables(...)`。
   - 將外部應收池（`scopedReceivables`）與交易流水線中未到期的預約股利進行相容聯集與去重合成，確保全看板消費單一事實來源 (SSOT)。
3. **動態時態區間標籤解耦**：
   - 在 `DividendCalendarCard` 動態計算並展示 `[滾動 12 個月: YYYY/MM ~ YYYY/MM]` 區間標籤，明確解耦自然年度與滾動預估。

## 正面效益 (Positive Consequences)

- 全域 100% 杜絕填息膠囊隱形空白，清倉與缺價標的均具備友善標籤。
- 上方行事曆與下方明細待入帳筆數與金額 100% 鏡像同步，徹底消滅雙軌矛盾。
- 現金流時間維度界定清晰，投資人不再產生加總落差之誤解。
- 遵循 KISS 與 TDD 原則，0 外部套件引入，測試 100% 通過。

## 負面後果與權衡 (Negative Consequences)

- 預約交易在未實際到期前會作為虛擬應收實體（`virtual_*`）展現在行事曆中，需確保狀態轉換與點擊入帳之冪等性。
