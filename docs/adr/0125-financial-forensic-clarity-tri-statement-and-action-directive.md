# 0125. 穿透式財報深度分析儀三大報表原子聚合與操盤手決策系統架構 (Financial Forensic Clarity, Tri-Statement Pipeline & Action Directives)

- **狀態**：Accepted
- **日期**：2026-09-12
- **關聯規格**：[docs/specs/0125-financial-forensic-clarity-tri-statement-and-action-directive-spec.md](../specs/0125-financial-forensic-clarity-tri-statement-and-action-directive-spec.md)
- **關聯 Issue**：[#47](https://github.com/judragon005/stock-note/issues/47)

---

## 背景與脈絡 (Context)

在穿透式財報戰情室 (Financial Forensic Modal) 啟用後，使用者實際檢視【2327 國巨】時發現以下嚴重缺陷：
1. **現金流假陽性歸零**：FinMind 的 `TaiwanStockFinancialStatements` 僅含損益表，缺乏資產負債與現金流，導致台股 CFO 全數被誤判為 0 元，觸發假陽性重大風險警戒。
2. **操盤結論語意矛盾**：現金流為紅色重大風險、綜合評分 55 分 (WARNING)，但「0 秒核心操盤結論」卻輸出「整體財務結構平穩，獲利與營運現金流處於健康區間」。
3. **視覺數字真空**：折線圖左側缺乏 Y 軸百分比刻度與格線，頂部圖例無最新季具體三率數值；淨利 vs CFO 階梯柱狀圖無金額標籤。
4. **缺乏具體操盤指引**：使用者缺乏具體的操盤定調、核心矛盾剖析與操作指引。

---

## 架構決策 (Decision)

1. **台股三大財務報表原子聚合管線 (`taiwanFinancialPipeline.ts`)**：
   - 透過 `Promise.allSettled` 同步並行請求 FinMind 三大資料集：`TaiwanStockFinancialStatements`、`TaiwanStockBalanceSheet`、`TaiwanStockCashFlowsStatement`。
   - 依 `date` 跨表原子歸併至標準 16 項財務科目（含 CFO、Capex、現金、負債、應收與存貨），徹底杜絕 CFO 假陽性。
2. **操盤手結構化定調與決策引擎 (`financialScoringEngine.ts`)**：
   - 定義 `FinancialDirective` 介面契約，包含 `stance`（強勢造血·長線續抱 / 體質穩健·逢回布局 / 體質承壓·防守觀望 / 重大風險·嚴格戒備）、`conflictSummary`（核心矛盾）與 `actionGuidance`（具體操作方針）。
   - 拔除盲目「平穩健康」兜底，使評分、燈號與操盤指引 100% 邏輯一致。
3. **三率折線圖動態 Y 軸刻度與最新三率數值膠囊 (`FinancialTrendsLayer.tsx`)**：
   - 採用純原生 SVG 動態計算 Min/Max 刻度與百分比水平格線，頂部展示最新一季毛利率、營益率、淨利率數值膠囊。
4. **淨利 vs CFO 雙向正負柱與金額標籤 (`FinancialTrendsLayer.tsx`)**：
   - 支援正負長條雙向延伸，直接在柱身標註每季金額標籤（百萬/億），背離時顯著呈現「⚠️紙上富貴」標籤。
5. **四大體質維度卡片數據化 (`FinancialHeroLayer.tsx`)**：
   - 內嵌最新季核心指標數值膠囊（毛利率/ROE、負債比/速動比/淨現金、DSO/DIO、CFO/FCF）。

---

## 影響與驗證 (Consequences & Verification)

- **正面影響**：
  - 台股財務鑑識擁有真實營運現金流與資產負債數據，杜絕假陽性。
  - 使用者能立即獲得專業操盤手級別的具體操作指引，消弭視覺資訊真空。
- **架構完整性**：
  - 維持零 TailwindCSS，純原生 Inline Style 與 SVG。
  - 全量 88 個測試檔案、870 個單元測試 100% 綠燈通過，TypeScript 0 報錯。
