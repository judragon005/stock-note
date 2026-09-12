# 11 — Top-Level Executive Hero Card UI (Layer 1)

**What to build:** 
升級 `OmniTechnicalInspectorModal.tsx` 頂部 Hero 區域（第 1 層：0秒決策核心）。渲染校正後的 0~100 分數儀表盤、市場狀態膠囊（如 `⚡ 變盤在即 (Squeeze)`、`〰️ 無趨勢盤整 (Choppy)`）、以及大白話核心操盤總結 Callout，讓使用者一眼看懂全局。

**Blocked by:** 02 — ADX Chop Discount & Contradiction Penalty Scorer, 03 — Bollinger Bandwidth Squeeze & Volatility Breakout Alert

**Status:** ready-for-agent

- [x] 實作 Layer 1 頂部卡片元件，支援狀態膠囊動態樣式（黃/紅/綠/紫）
- [x] 整合大白話總結 Callout
- [x] 單元測試驗證 Layer 1 元件正確渲染狀態徽章與校正後分數
