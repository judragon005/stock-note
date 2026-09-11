# Ticket 04: 多日籌碼累加聚合器實作與聰明錢動能決策信號（可以買 / 一定要閃）

## 狀態
- 狀態: `completed`
- 關聯規格: `docs/specs/0119-pledge-unified-repayment-and-smart-money-resilience-spec.md` (模組三、模組四)
- 關聯 Issue: #32

## 任務目標
實作獨立的多日法人籌碼累加計算器 `src/engine/chipsAggregator.ts`，支援將 IndexedDB 中最近 1D / 3D / 5D 的全市場三大法人日報加總，並在星圖與診斷看板中產出「🟢 法人聯手搶買（可以買）」與「🔴 主力大舉提款（一定要閃）」決策信號，過濾單日隔日沖噪音。

## 具體修改清單
1. **`src/engine/chipsAggregator.ts`**：
   - 實作 `aggregateMultiDayChips(dailyReports: Record<string, TwseInstitutionalRow>[], horizonDays: 1 | 3 | 5): Record<string, TwseInstitutionalRow>`。
   - 實作決策信號分析函式 `analyzeSmartMoneySignals(aggregatedData: Record<string, TwseInstitutionalRow>, symbols: string[])`：
     - 判定「🔥 雙法人合買認養」：外資買超 > 0 且 投信買超 > 0。
     - 判定「⚠️ 雙法人出逃倒貨」：外資賣超 < 0 且 投信賣超 < 0。
2. **`src/components/ChipsWorkspace.tsx` 整合**：
   - 當切換 `chipsHorizon` (3日或 5日) 時，星圖 Y 軸資料來源自動採用加總後的累計張數。
   - 氣泡浮動卡片 (Tooltip) 與持股診斷標記即時顯示動能標籤。
3. **測試驅動開發 (`src/engine/chipsAggregator.test.ts`)**：
   - 驗證單日、3日、5日累加之正確性。
   - 驗證法人合買與出逃信號判定邏輯。

## 驗收標準
- [ ] 3 日與 5 日累加數值準確無誤。
- [ ] 星圖氣泡 Y 軸與 Tooltip 能正確對齊累計張數。
- [ ] 單元測試 100% 綠燈，全專案 `npm test` 通過。
