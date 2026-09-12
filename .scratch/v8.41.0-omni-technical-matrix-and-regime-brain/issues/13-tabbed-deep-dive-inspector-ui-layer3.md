# 13 — Tabbed Deep-Dive Inspector & Risk Radar UI (Layer 3)

**What to build:** 
升級第 3 層「深度佐證區」。透過分頁標籤整理複雜資訊，避免視覺疲勞：
- Tab 1: 【⚠️ 風險雷達與形態】（頂背離、假突破、布林壓縮、籌碼背離警示）
- Tab 2: 【📊 15大指標全景】（Trend, Momentum, Volatility, Volume, Key Levels 參數表）
- Tab 3: 【📝 專業研報】（整合 Markdown 預覽與一鍵複製）
確保所有既有功能 100% 正常，完成端到端全量驗證。

**Blocked by:** 10 — Omni Markdown Report Pipeline Upgrade, 11 — Top-Level Executive Hero Card UI (Layer 1), 12 — Actionable Matrix 4-Box Visual Grid UI (Layer 2)

**Status:** ready-for-agent

- [x] 實作 Layer 3 風險雷達 Tab 與分頁切換邏輯
- [x] 整合全專案 73 套件 786+ 單元測試 100% 綠燈
- [x] 執行 `npm run build` 確認 TypeScript 0 錯誤
