# 13 — Layer 2 UI: 8-Quarter Trends, Cash Ladder & DuPont Matrix

**What to build:**
實作第 2 層視覺化趨勢矩陣 `src/components/financial/FinancialTrendsLayer.tsx`。
直觀呈現：
1. 近 8 季獲利三率（毛利率、營益率、淨利率）同軸折線走勢圖
2. 稅後淨利 (Net Income) vs 營業現金流 (CFO) 階梯對比長條圖（紙上富貴一眼擊穿）
3. 杜邦三因子拆解長條矩陣（獲利貢獻、效率貢獻、槓桿槓桿倍數）

**Blocked by:** 05-financial-profitability-and-dupont-engine.md, 12-financial-forensic-modal-layer1-executive-ui.md

**Status:** done

- [x] 實作純 CSS / SVG 輕量圖表渲染，零第三方重型圖表套件依賴
- [x] 支援滑鼠懸停顯示各季度精確百分比與金額 Tooltip
- [x] 杜邦三因子色彩視覺編碼（獲利率/週轉率/權益乘數）
- [x] 單元測試驗證單季缺失資料或負數現金流圖表渲染零崩潰
