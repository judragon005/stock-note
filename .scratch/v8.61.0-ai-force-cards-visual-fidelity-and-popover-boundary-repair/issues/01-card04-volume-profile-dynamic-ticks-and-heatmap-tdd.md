# Ticket 01: 04 AI 籌碼熱區圖自適應 Y 軸與 4 欄週期動態熱力矩陣 (TDD)

- **Spec**: `docs/specs/0148-ai-force-cards-visual-fidelity-and-popover-boundary-repair-spec.md`
- **關聯 Issue**: #121
- **狀態**: `ready-for-agent`

## 目標
解決照片一問題：使用者切換查詢不同股票時，卡片 04「AI 籌碼熱區圖」價格刻度與熱力色階完全不變動（寫死）。

## 實作內容
1. 在 `src/engine/volumeProfileEngine.ts` 中增強量化熱力計算：
   - 依據歷史 K 線之真實價格區間，動態產生自適應 Y 軸 5 階價格刻度 (`priceTicks`)。
   - 計算近 5 日、近 10 日、近 20 日、近 60 日各時窗在 9 階垂直價格區間之成交量密度比率（0~100%）。
2. 在 `src/components/aiForceDashboard/cards/VolumeProfileCard.tsx` 中移除硬編碼：
   - 替換寫死的 `priceTicks = [2400, 2200, 2000, 1800, 1600]`，改為由傳入數據動態產生或自適應計算。
   - 替換寫死的 `heatmapColumns`，依據 4 個週期的真實成交量密度動態映射熱力色彩（深暗藍 ➔ 青藍 ➔ 亮綠 ➔ 黃綠）。
3. 編寫單元測試 `VolumeProfileCard.test.tsx` / `volumeProfileEngine.test.ts` 驗證不同股價（如 200 元鴻海 vs 1000 元台積電）呈現不同的刻度與色塊分佈。

## 驗收標準 (AC)
- [ ] 傳入低價股或高價股時，Y 軸顯示正確自適應之 5 個價位標籤。
- [ ] 4 欄週期熱力色塊依真實成交量密度動態著色。
- [ ] `npm test` 測試通過率 100%。
