## 規格與背景說明

依據 [Spec 0121: 全市場個股全技術指標透視分析系統規格書](docs/specs/0121-omni-technical-indicator-analysis-system-spec.md)，本次迭代打造全市場通用的一站式個股技術指標透視與多空共振評分系統：

1. **五大維度技術指標純量化核心 (Omni-Indicator Engine)**：
   - **趨勢追蹤 (Trend)**：MA (SMA 5/20/60/120/240)、MACD (12, 26, 9)、DMI / ADX (14) 趨向指標與趨勢強度、均線多空排列判定。
   - **動能擺盪 (Momentum)**：RSI (6, 14, 24) 採 Wilder 平滑算法、KD (9, 3, 3)、CCI (20) 順勢指標、Williams %R (14) 威廉指標。
   - **波動通道 (Volatility)**：布林通道 (20, 2)、帶寬極致壓縮 Squeeze 警示 (帶寬 $\le 8\%$)、ATR (14) 滾動移動防守價、MA 偏離率 (Bias20/60)。
   - **量能資金 (Volume/Flow)**：5日/20日均量比、爆量/窒息量檢測、OBV (能量潮累積)、投量比 (台股)。
   - **關鍵支撐壓力 (Levels)**：Darvas Box (三日法則箱頂/箱底)、Fibonacci 黃金分割位 (0.236, 0.382, 0.5, 0.618, 0.786)、樞紐點 Pivot Points (P, R1, R2, S1, S2)。
2. **多空共振量化評分儀 (Technical Confluence Engine)**：
   - 將 15 種指標依趨勢 (35%)、動能 (25%)、支撐 (20%)、量能 (20%) 權重收斂為 0~100 分之客觀數值。
   - 自動評級：極強多頭 ($\ge 80$)、偏多整理 ($60 \sim 79$)、多空平衡 ($41 \sim 59$)、偏空修正 ($21 \sim 40$)、空頭急跌 ($\le 20$)。
   - 產出核心特徵條列、明確交易紀律導引與潛在風險警示。
3. **歷史 K 線隨選回補與整合管線 (Omni Report Pipeline)**：
   - 串接現有之 `historicalOhlcvBackfill.ts` 與 IndexedDB 快取，支援全市場任意代碼（台股/美股）隨選日 K 線抓取與快取，6 小時內不重複請求。
   - 支援 Markdown 研報生成，完美對齊 LLM 投研提示詞結構。
4. **個股全景透視面板 UI (Omni-Technical Inspector Modal)**：
   - 毛玻璃風格彈窗，支援即時代碼搜尋、多空共振指針、5 大矩陣折疊卡片、全域主題響應（紅漲綠跌/綠漲紅跌）與一鍵複製 Markdown 研報。
5. **在庫持倉與動能雷達無縫聯動**：
   - 在 `HoldingsTable` 與 `MuscleBookerWorkspace` 動作列中整合「📊 全指標透視」按鈕，一鍵直達。

## 驗收標準 (Acceptance Criteria)

- [ ] Wilder RSI, DMI/ADX, CCI, Williams %R, OBV, Fibonacci, Pivot 純函式單元測試 100% 綠燈，除零與邊界完全防護。
- [ ] 多空共振評分計算覆蓋強多 ($\ge 80$)、強空 ($\le 20$) 與盤整中性 ($41 \sim 59$) 測試案例。
- [ ] 歷史 K 線隨選回補管線與 IndexedDB 快取正常運作，300ms 內完成報告裝配。
- [ ] `OmniTechnicalInspectorModal` 彈窗渲染正常，支援主題模式切換與一鍵複製。
- [ ] 在庫持倉與動能雷達一鍵開啟正常，無破壞既有功能。
- [ ] `npm test` 全數通過，`npm run build` TypeScript 0 報錯。
