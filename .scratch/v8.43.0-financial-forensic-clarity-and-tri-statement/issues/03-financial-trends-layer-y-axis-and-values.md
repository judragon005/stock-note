# 03 — Financial Trends Layer Y-Axis & Values

**What to build:**
升級 `src/components/financial/FinancialTrendsLayer.tsx`。
消除圖表盲猜數字痛點，全面進行數據視覺化刻度與數值增強：

1. **獲利三率折線圖**：
   - 左側新增 Y 軸百分比刻度標籤與格線（如 0%, 15%, 30%, 45% 等）。
   - 頂部圖例整合最新一季「三率數值膠囊」（🟢 毛利率 XX.X% ｜ 🔵 營益率 XX.X% ｜ 🟣 淨利率 XX.X%）。
2. **淨利 vs CFO 階梯圖**：
   - 支援雙向正負柱狀排版（負 CFO 呈現紅色向下延伸）。
   - 柱頂/柱底標註百萬/億金額標籤（如 `淨 54.5 億`、`CFO -12.3 億`）。
   - 背離季度顯著標記「⚠️紙上富貴」警告。
3. 單元測試 `FinancialTrendsLayer.test.ts` 驗證刻度與計算邏輯。

**Blocked by:** 02-financial-action-directive-scoring-engine.md

**Status:** done

- [x] 獲利三率折線圖新增 Y 軸百分比刻度與最新三率數值膠囊
- [x] 淨利 vs CFO 階梯圖支援正負長條雙向柱與每季金額標籤
- [x] 單元測試 `FinancialTrendsLayer.test.ts` 綠燈
