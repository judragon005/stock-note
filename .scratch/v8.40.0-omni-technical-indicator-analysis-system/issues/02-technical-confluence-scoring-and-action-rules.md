# Ticket 02: 多空共振量化評分儀與交易紀律導引引擎 (Technical Confluence Engine)

## 狀態
- 狀態: `completed`
- 關聯規格: `docs/specs/0121-omni-technical-indicator-analysis-system-spec.md` (模組二、三)
- 關聯 Issue: #37
- 標籤: `enhancement,ready-for-agent`

## 任務目標
實作 `calculateTechnicalConfluence` 多空共振量化評估函式，將趨勢 (35%)、動能 (25%)、型態支撐 (20%) 與量能資金 (20%) 的 15 種技術指標綜合權重收斂為 0~100 分之客觀數值，自動判定 5 階多空評級與輸出具體操作紀律指引。

## 具體修改清單
1. **`src/engine/omniIndicatorEngine.ts`**：
   - 實作 `calculateTechnicalConfluence(params: ConfluenceInputParams): TechnicalConfluence`。
   - 依照規格書之權重分配：
     - 趨勢維度（均線排列、站上/跌破 MA20、MACD 柱狀體翻紅/翻綠）。
     - 動能維度（RSI 強勢區/超賣、KD 黃金/死亡交叉、CCI 正負值）。
     - 型態支撐（Darvas 箱頂突破/箱底跌破、Fibonacci 0.618 支撐）。
     - 量能資金（攻擊帶量收紅、OBV 趨勢創高/破底）。
   - 產生主要特徵條列 (`primarySignals`)、明確操作建議 (`actionAdvice`) 與風險警示標籤 (`riskAlert`)。
2. **單元測試 (`src/engine/omniIndicatorEngine.test.ts`)**：
   - 驗證強勢多頭樣本評分 $\ge 80$。
   - 驗證空頭破底樣本評分 $\le 20$。
   - 驗證盤整與多空矛盾樣本評分落於中性區間 ($41 \sim 59$)。

## 驗收標準
- [ ] 多空共振評分演算法單元測試 100% 綠燈通過。
- [ ] 分數計算具備嚴密上下限邊界防禦（$0 \le \text{Score} \le 100$）。
