# 10 — 穿透成分來源分解抽屜 (Look-Through Detail Breakdown Drawer)

**What to build:**
當使用者在穿透 Treemap 中點擊任一穿透公司區塊（例如台積電或聯發科）時，右側滑出毛玻璃詳情抽屜。抽屜內清楚展示該標的的「直接持股市值」與「來自各 ETF 的穿透金額與比例」（例如直接買進 40%、來自 0050 佔 35%、來自 00923 佔 25%）；並在底部展示該標的所屬產業分類以及整戶產業權重分佈條。

**Blocked by:** 09 — Treemap 雙重視圖切換器 (Treemap Security vs Look-Through Toggle)

**Status:** ready-for-agent

- [ ] 點擊穿透節點滑出現代毛玻璃抽屜，支援 ESC 或遮罩點擊關閉
- [ ] 清晰列出直接持有市值與各來源 ETF 之穿透持股細節與權重
- [ ] 呈現該標的之穿透總曝險佔比與產業集中度指標
- [ ] 支援響應式佈局，在行動裝置或窄螢幕下以底部 Sheet 形式自適應展開
