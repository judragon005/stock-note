# 09 — Treemap 雙重視圖切換器 (Treemap Security vs Look-Through Toggle)

**What to build:**
升級 `src/components/TreemapChart.tsx`，在右上角工具列新增視圖切換按鈕：`[ 📊 標的視圖 (預設) ] | [ 🔍 底層穿透透視 ]`。切換為「穿透透視」模式時，Treemap 自動將各 ETF 節點拆解展開為底層穿透企業區塊，矩形面積嚴格對應其穿透實質市值；對於觸發集中度警示（$>25\%$）的區塊，自動渲染醒目的琥珀黃/緋紅霓虹發光邊框，懸浮 Tooltip 顯示穿透佔比與警示說明。

**Blocked by:** 08 — 產業因子集中度匯總與雙重紅線警示引擎 (Sector Concentration & Alert Guardrails)

**Status:** ready-for-agent

- [ ] Treemap 工具列提供平滑之「標的視圖 / 穿透透視」切換開關
- [ ] 穿透模式下正確將持倉計算結果轉化為 Squarified Treemap 輸入並佈局
- [ ] 針對集中度超標節點渲染醒目霓虹警示邊框與 Tooltip 警示文字
- [ ] 切換視圖時動畫過渡平滑，不產生佈局跳動或錯誤遮擋
