# 03 — 中央留白荒漠重塑：語意微觀解析 (Market Context) 與四方實戰操盤指引 (Action Playbook)

**Parent Issue:** #214

**What to build:**
重塑 Card 18 中央 180px 留白荒漠，植入雙層結構化 Bento 資訊區塊：
1. **語意微觀解析 (Market Context Panel)**：
   - 深藍半透明背景 `rgba(30, 41, 59, 0.45)`，左側具備 3px 品牌光條（對齊當前語意主色），內距 `8px 12px`。
   - 標題：`▌ 語意微觀解析 (Market Context)`。
   - 內文：基於現有量價籌碼因果關係，動態呈現客觀解讀（如現價回落至成本線、賣壓衰竭、關鍵支撐等）。
2. **實戰操盤指引 (Actionable Playbook Panel)**：
   - 背景 `rgba(15, 23, 42, 0.6)`，邊框 `1px solid rgba(255, 255, 255, 0.08)`，圓角 8px。
   - **四合一實戰矩陣**：
     1. **操作週期 (Horizon)**：顯示適配週期標籤膠囊（如 `3~5 日短線波段` / `波段續抱` / `忌追高當沖`）。
     2. **建倉/應對策 (Execution Directive)**：給出具體建倉節奏（如「分批金字塔掛單，切忌市價追擊」）。
     3. **關鍵錨點 (Price Anchors)**：防守停損價 (Stop-Loss Pivot)、目標滿足價 (Target Resistance)、預估風報比 (R/R Ratio)。
     4. **風控失效條件 (Invalidation Gate)**：明確標示邏輯失效門檻（如盤中放量摜破防守價或法人單日大量反向賣超）。

**Blocked by:** 01 — 核心三軌色彩認知體系重構、燈號邏輯校正與指標膠囊正則修復

**Status:** ready-for-agent

- [x] 卡片中央留白區域被「語意微觀解析」與「實戰操盤指引」完整填充，無多餘無效空白。
- [x] 操盤指引完整呈現操作週期、建倉步調、停損價、目標價、風報比與失效條件。
- [x] 數值計算具備安全 Fallback，無資料時優雅展示預設防禦值，不崩潰。
