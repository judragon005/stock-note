# 12 — Actionable Matrix 4-Box Visual Grid UI (Layer 2)

**What to build:** 
在彈窗主體頂端實作第 2 層「實戰作戰地圖 (3秒擬定進退場)」。以清晰的 4 格卡片網格展示：
1. 🎯 第一減碼/壓力帶 (Cluster 1)
2. 🚀 續強觀察/加碼點 (Cluster 2)
3. 🛡️ 短線動態防守線 (ATR 吊燈 / 20MA)
4. ⛔ 結構底線 (箱底破位)
卡片標記價格、距離當前股價百分比與成因標籤。

**Blocked by:** 09 — Actionable Trade Matrix Core Data Builder

**Status:** ready-for-agent

- [x] 實作 4-Box 卡片響應式網格（桌面 4 欄，行動版 2x2）
- [x] 標示與現價差距百分比（例如 `+1.64%`、`-1.35%`）
- [x] 單元測試驗證 4-Box 數據正確對齊且無溢出破版
