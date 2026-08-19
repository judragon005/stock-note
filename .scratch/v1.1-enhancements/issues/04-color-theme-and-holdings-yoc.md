# 04 — 漲跌色彩主題切換與持倉 YoC 視覺強化 (Color Themes & Holdings YoC)

**What to build:**
實作全域色彩主題管理：提供「台股慣用（紅漲綠跌）」與「國際慣用（綠漲紅跌）」切換器，透過 CSS 變數全域生效並儲存於 LocalStorage；升級 `HoldingsTable.tsx` 與 `SummaryCards.tsx`，呈現累計配息、成本殖利率 (YoC) 欄位與動態漲跌色彩。

**Blocked by:** 01-calculator-and-yoc

**Status:** completed

- [x] 在 `src/index.css` 與頂部 `Header.tsx` 實作紅漲綠跌/綠漲紅跌切換按鈕，持久化於 LocalStorage。
- [x] 升級 `HoldingsTable.tsx`，加入「累計股息」與「成本殖利率 (YoC)」資訊欄位。
- [x] 確保所有損益金額、報酬率與徽章顏色依據色彩主題即時連動。
