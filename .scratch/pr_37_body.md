## 概述與變更摘要 (Summary)

本 PR 完整實作 **全市場個股全技術指標透視分析與多空共振系統 (Spec 0121 / Issue #37)**。
為全市場台股與美股提供涵蓋趨勢、動量、震盪、量能、通道與支撐壓力五大維度的 15 大全技術指標分析矩陣，並建構 0~100 分多空共振評分儀與獨立全景透視彈窗 (`OmniTechnicalInspectorModal`)，支援一鍵回補日 K 線與導出 Markdown 深度研報。

Closes #37

---

### 1. 核心指標運算引擎 (`src/engine/omniIndicatorEngine.ts`)
- **趨勢指標 (Trend)**：EMA(12/26)、SMA(5/10/20/60)、MACD 快慢線與柱狀體、DMI (+DI/-DI) 與趨勢強度 ADX(14) (含 DX 平滑)。
- **動量與震盪指標 (Momentum & Oscillators)**：J. Welles Wilder 平滑 RSI(14)、KD隨機指標(9,3,3)、威廉指標 Williams %R(14)、順勢指標 CCI(20, 0.015)。
- **量能與通道指標 (Volume & Volatility)**：成交量 5/20 日均線、量價累積 OBV (On-Balance Volume)、布林通道 Bollinger Bands (20, 2SD, 含帶寬與 %B)。
- **支撐壓力與關鍵位 (Key Levels)**：斐波那契回撤 (Fibonacci Retracement: 23.6%, 38.2%, 50%, 61.8%, 78.6%)、經典樞紐點 (Pivot Points Classic: P, R1~R3, S1~S3)。
- **全數值除零與邊界防禦**：純函式設計、不可變陣列處理，平盤或零成交量自動防禦無窮大與 NaN。

### 2. 多空共振評分儀 (Confluence Scoring)
- 權重設計：趨勢 (30%) + 動量/震盪 (25%) + 通道/超買超賣 (20%) + 量能確認 (15%) + 關鍵位破位 (10%)。
- 0~100 分動態評級：
  - `80~100`：🚀 強烈看多 (Strong Bullish)
  - `60~79`：📈 偏多震盪 (Bullish)
  - `41~59`：⚖️ 多空平衡 / 觀望 (Neutral)
  - `21~40`：📉 偏空震盪 (Bearish)
  - `0~20`：🔻 強烈看空 (Strong Bearish)
- 五維雷達維度解析與警示訊號偵測（超買/超賣/背離/爆量突破）。

### 3. 日 K 線隨選回補與研報管線 (`src/engine/omniReportPipeline.ts`)
- 整合 IndexedDB `historicalOhlcv` 快取與外部 API 回補機制（6 小時新鮮度快取，保護請求 Quota）。
- 一鍵導出標準 Markdown 深度技術分析研報（含五大維度盤點、共振評分、操作結論與風控警示）。

### 4. 全景透視彈窗與雙工作區無縫整合 (`OmniTechnicalInspectorModal.tsx`)
- 深色現代化毛玻璃 UI、共振分數儀表板、多維度膠囊切換與指標參數卡片。
- 無縫整合於 `HoldingsTable`（庫存明細）與 `MuscleBookerWorkspace`（肌肉書僮動能戰情室），點擊按鈕阻止事件冒泡。

### 5. 領域文檔與規格同步
- 需求規格書：`docs/specs/0121-omni-technical-indicator-analysis-system-spec.md`
- 架構決策記錄：`docs/adr/0121-omni-technical-indicator-analysis-system.md`
- 技術債建檔：`docs/debts/0037-equity-deep-dive-seven-step-framework.md`
- 術語與索引更新：`CONTEXT.md`、`README.md`、`docs/debts/README.md`
- 本地票券鏡像：`.scratch/v8.40.0-omni-technical-indicator-analysis-system/issues/01~05` 全部完成。

---

## 驗證結果 (Verification)
- **單元測試**：新增 24 個單元測試，全專案 **73 套件、786 個測試 100% 通過**。
- **型別檢查**：`npm run build` TypeScript 0 錯誤。
- **雙軸審查**：通過架構安全性與細粒度審查。
