# 09 — 原生向量 SVG 實戰水下回撤圖 (Underwater Chart)

**What to build:**
為實戰投資人與操盤手提供必備的「水下回撤圖 (Underwater Drawdown Chart)」。在資產走勢折線圖下方嵌入可折疊的水下回撤面板，堅持零外部圖表庫依賴，完全以原生向量 SVG 繪製從 0% 水平線向下沉降的紅色漸層陰影回撤面積圖。隨鼠標 Hover 同步聯動十字準線，展示該點套牢百分比、波段最大回撤深度與爬出水面修復所需天數 (Recovery Days)。

**Blocked by:** Ticket 04, Ticket 07

**Status:** DONE

- [x] 在 `PortfolioGrowthChart.tsx` 底部實作可折疊/展開之水下回撤面板
- [x] 使用原生 SVG `<path>` 繪製從 `0%` 基準線向下的陰影回撤面積與紅色邊界折線
- [x] Y 軸刻度精確對應回撤深度（如 0%, -5%, -10%, -20%）
- [x] 聯動主圖十字準線，Tooltip 標註當前回撤深度與該次波段回撤持續天數
- [x] 單元測試驗證水下圖數據點生成與 SVG path 字串格式有效性
