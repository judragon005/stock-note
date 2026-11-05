# 03 — 實裝頂部行情列前日收盤標籤、警示徽章與 AI 決策核心橫幅

**What to build:**
於前端 UI 實裝雙層視覺警示：在頂部行情列動態切換收盤價標籤與警示徽章，並提供盤中即時參考價；在 AI 決策核心卡片頂部渲染高醒目度警示橫幅。

**Blocked by:**
02 — 整合未結算時點數據定錨回退與盤中即時報價隔離

**Status:**
resolved

- [x] `HeaderMarketBar`：未結算時將標籤動態切換為「前日收盤價」
- [x] `HeaderMarketBar`：於「最新交易日」旁渲染橘黃色警示徽章 `[⚠️ 盤中未結算·以 YYYY-MM-DD 為準]`
- [x] `HeaderMarketBar`：當存在 `intradayQuote` 時，於主價格旁以次級色輔助顯示 `盤中即時: $XXXX (+X.XX%)`
- [x] `AiDecisionCoreCard`：頂部渲染橘黃色警示橫幅，明確宣告量化基準日
- [x] 視覺風格符合現有 Glassmorphism 深色主題，零 CLS 佈局跳動
