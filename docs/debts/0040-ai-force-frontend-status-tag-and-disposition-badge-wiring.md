# 技術債 0040: AI 主力戰情室前端狀態標籤與處置警示徽章端到端串接

- **建立日期**: 2026-10-01
- **解決日期**: 2026-10-01 (已於 v8.67.0 解決，詳見 ADR 0156 / PR #140)
- **來源**: Code Review (Spec 0155 / Issue #138 Ticket 13)
- **狀態**: `RESOLVED`
- **優先級**: `P3 (Low)`
- **標籤**: `Feature` · `UI` · `AiForceDashboard` · `Lakehouse` · `Dispositions`

---

## 1. 現況與背景 (Context)

在 Spec 0155 (Issue #138) 「全市場歷史數據本地 SQLite 湖倉與主力戰情室端到端量化管線」實作中：
1. **後端與湖倉 (Ticket 07 & Ticket 10)**：已實作 TWSE 處置與注意股票注入 `disposition_attention_events` 資料表，並透過 Vite API 提供查詢。
2. **量化引擎與 UI 元件 (Ticket 13)**：`generateAiForceReportFromCandles` 支援接收 `options: GenerateReportOptions`（包含 `statusTag?: 'NORMAL' | 'ATTENTION' | 'DISPOSITION'`），且 `HeaderMarketBar.tsx` 已實作處置警示徽章（`data-testid="market-disposition-badge"`）與注意標籤（`data-testid="market-attention-badge"`）。
3. **前端呼叫點現況**：在 `src/components/aiForceDashboard/AiForceDashboardView.tsx:113` 呼叫 `generateAiForceReportFromCandles` 時，尚未傳入第 8 參數 `options`，因此 `marketStatusTag` 目前預設為 `NORMAL`，頂部處置警示徽章在前端實際運行時尚未連動。

---

## 2. 改善方案 (Proposed Solution)

於 `AiForceDashboardView.tsx` 擴充資料管線：
1. 當使用者輸入股票代碼時，從 `marketCacheLoader` 或本地 API 取得該標的的 `statusTag`（若無則回退預設 `NORMAL`）。
2. 在第 113 行組裝時，將 `statusTag` 與幣別傳入 `generateAiForceReportFromCandles` 的 `options` 物件：
   ```typescript
   const fullReport = generateAiForceReportFromCandles(
     targetSymbol,
     resolvedName,
     targetMarket,
     candles,
     quote || undefined,
     institutionalRecords,
     undefined,
     {
       statusTag: resolvedStatusTag,
       currency: targetMarket === 'US' ? 'USD' : 'TWD',
       volumeUnit: targetMarket === 'US' ? '股' : '張'
     }
   );
   ```

---

## 3. 預計觸發時機

下一期針對主力戰情室的即時資料管線或標的警示狀態整合時觸發。
