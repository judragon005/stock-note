# 需求規格說明書 (PRD #0078)：籌碼泡泡圖自適應相對縮放、圓形防碰撞排斥算法與聚光燈佈局系統

## Problem Statement (問題陳述)

使用者在「🪐 籌碼與動態星圖」檢視全市場法人焦點 Top 30 標的時，出現嚴重的泡泡疊合與邊界擠壓問題：
1. **頂部與底部天花板截斷 (Boundary Clipping)**：原演算法以靜態 2,500 張作為滿分，而全市場 Top 30 大戶單日買賣超動輒數萬張，導致所有買超標的均被鎖死在 $Y = +100$（最頂部），所有賣超標的均被鎖死在 $Y = -100$（最底部），在邊界排成一條水平直線。
2. **多泡泡嚴重重疊 (Overlapping & Occlusion)**：多檔標的由於坐標極度接近，缺乏二維圓形幾何排斥算法，導致泡泡疊加在一起，股票代碼與漲跌幅數字相互穿透，完全無法辨識。
3. **邊界溢出與文字截斷**：畫布邊界處缺乏足夠的呼吸緩衝空間，邊緣泡泡文字切出視窗外。

---

## Solution (解決方案)

1. **自適應相對冪次縮放演算法 (Adaptive Power-Law Scaling)**：
   - 廢除固定 2,500 張硬上限，以當前資料集中之最大買賣超 $|\text{flow}|_{\max}$ 與最大漲跌幅 $|\Delta P|_{\max}$ 為基準動態歸一化。
   - 採用 $0.65$ 冪次平滑曲線，將坐標均勻擴展於 $[-75, +75]$ 範圍內，為頂部、底部與左右兩側保留 25% 的安全呼吸邊界，徹底消滅貼壁現象。
2. **2D 圓形防碰撞排斥演算法 (2D Circle Collision Relaxation Engine)**：
   - 0 外部重量級依賴，純原生數學迭代（6 次放鬆迭代）。
   - 當兩圓距離 $d < r_1 + r_2 + 4\text{px}$ 時，沿連心線方向各反向推開 $\Delta/2$。
   - **象限邊界鎖定 (Quadrant Invariant Guard)**：加入中軸邊界約束，推開時不跨越 $X=0$ 與 $Y=0$，確保原本屬於「🔥 主力抬轎」的股票絕不會被推入其他象限。
3. **滑鼠聚光燈高亮與層級優雅處理 (Spotlight Mode & Smart Z-Index)**：
   - 滑鼠懸浮任一泡泡時，該泡泡自動提升至 SVG DOM 最頂層（最後渲染），其餘未選中泡泡透明度降至 $0.25$，解決群聚時的閱覽干擾。
4. **全市場模式行情散度增強 (Market Movers Spread)**：
   - 依據 TWSE 官方法人買賣超之強弱程度動態拉開行情動能 X 軸分佈，使 30 檔股票在四個區域中均勻自然分散。

---

## User Stories (使用者故事)

1. 身為檢視全市場 30 檔法人焦點的使用者，我希望泡泡能在四象限中自然均勻散開，而不是全部貼在畫布頂部與底部邊緣。
2. 身為需要看清每檔股票代碼的使用者，我希望當兩顆泡泡距離太近時，系統能自動將它們溫和推開，以便於每顆泡泡上的代碼與漲跌幅文字都能清楚閱讀。
3. 身為重視多空分類的投資人，我希望泡泡在被防碰撞推開時，依然嚴格停留在原本正確的多空象限內，以便於分類意涵不被扭曲。
4. 身為滑鼠移入密集區域的使用者，我希望懸浮的泡泡能自動升到最上層、其他泡泡稍微變淡，以便於我能清晰聚焦於當前選中的個股情報。

---

## Implementation Decisions (實作決策)

1. **自適應縮放公式 (Adaptive Power Formula)**：
   ```typescript
   // 橫軸 X (動能): 根據當前最大漲跌幅動態自適應
   const maxX = Math.max(...items.map(i => Math.abs(i.changePercent)), 1);
   const normalizedX = Math.sign(item.changePercent) * Math.pow(Math.abs(item.changePercent) / maxX, 0.7) * 75;
   
   // 縱軸 Y (籌碼): 根據當前最大買賣超動態自適應
   const maxY = Math.max(...items.map(i => Math.abs(i.totalNetShares)), 100);
   const normalizedY = Math.sign(item.totalNetShares) * Math.pow(Math.abs(item.totalNetShares) / maxY, 0.65) * 75;
   ```
2. **圓形排斥迭代函數 (`resolveBubbleCollisions`)**：
   - 於 `smartMoneyEngine.ts` 導出純函數：
     `resolveBubbleCollisions(bubbles: SmartMoneyBubbleData[], width: number, height: number, padding: number): SmartMoneyBubbleData[]`
   - 針對畫布像素座標進行 6 輪 Relax Iteration。
   - 計算圓心距離：$\text{dist} = \sqrt{\Delta x^2 + \Delta y^2}$。若 $\text{dist} < r_1 + r_2 + 4$，推開位移 $\text{overlap} = (r_1 + r_2 + 4 - \text{dist}) / 2$。
   - 邊界防禦：$cx \in [\text{padding} + r, \text{width} - \text{padding} - r]$，$cy \in [\text{padding} + r, \text{height} - \text{padding} - r]$。
   - 中軸防禦：維持 $cx$ 與 $cy$ 相對中心點的方向不翻轉。

---

## Testing Decisions (測試決策)

1. **主要測試縫隙 (Primary Seam)**：
   - `resolveBubbleCollisions`：給定群聚或重疊泡泡清單，驗證處理後所有泡泡間距均達到無重疊標準（$\text{dist} \ge r_1 + r_2$）。
   - 驗證極端邊界：多顆泡泡被擠壓至角落時，依然停留在畫布安全邊界內部。
2. **縮放測試縫隙 (Scaling Seam)**：
   - 驗證當某檔股票買超高達 100,000 張時，其 $Y$ 坐標依然嚴格落在 $[-75, +75]$ 範圍內，保留 25% 緩衝。

---

## Out of Scope (範圍界定)

1. **使用者手動拖曳泡泡自訂位置 (Drag & Drop)**：維持全自動幾何排斥佈局，避免使用者手動打亂多空象限幾何含義。
2. **3D 空間立體球體渲染**：保持 2D 原生 SVG 高效渲染，避免 WebGL 帶來不必要的電量與記憶體負擔。
