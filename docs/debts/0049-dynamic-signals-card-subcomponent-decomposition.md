# 技術債 0049: AI 動態信號判斷卡片 (Card 12) 專業層與決策層子元件模組化解耦重構

- **狀態**：`OPEN`
- **優先級**：`P3`
- **發現來源**：Code Review (Spec 0179 / Issue #224 / PR #231)
- **標籤**：`Refactor` · `CleanCode` · `AiForceDashboard` · `DynamicSignals` · `Architecture`
- **建立日期**：2026-10-13

---

## 📌 背景與問題陳述

在 V8.92.0 (Spec 0179 / PR #231) 中，我們重構了主力戰情室 Card 12「AI 主力動態信號判斷」([DynamicSignalsCard.tsx](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/DynamicSignalsCard.tsx))，徹底廢除了硬編碼紅燈，並納入了量化多因子綜合評分、三色動態呼吸燈號、多空矛盾智能仲裁與四重視角整合。

在當前實作中，為了恪守 KISS 原則與保持單一卡片聚合度，[DynamicSignalsCard.tsx](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/DynamicSignalsCard.tsx)（約 380 行）聚合了以下多個邏輯區塊：
1. **頂部狀態區**：Card 12 標籤、標題、三色綜合結論徽章與 $0 \sim 100$ 分多因子綜合評分條。
2. **核心維度區**：趨勢、籌碼、動能、風險四維數值與動態顏色對齊。
3. **專業監理與券商風控層**：交易所處置（分盤撮合）/注意股票標籤與券商融資浮額/斷頭防守警戒徽章。
4. **決策與關鍵水線層**：法人 20 日 VWAP 標準差偏離 (`vwapBiasStdText`)、個人關鍵防守價 (`keySupportPrice`) 與轉強壓力價 (`keyPressurePrice`)。
5. **白話操作情境解析層**：毛玻璃背景的【AI 決策情境解析】指引區。
6. **底層呼吸燈點**：動態連動結論燈號之燈點與結論文字。

雖然當前代碼結構清晰且單元測試 100% 覆蓋，但若未來 Card 12 進一步演進（例如：支援使用者自訂因子權重介面、交易所處置歷史倒數天數彈窗、或券商維持率試算器互動），單一卡片組件將承受過多呈現職責，不利於單元隔離與 UI Snapshot 測試。

---

## 🎯 建議重構與解決方案

建議在未來的架構演進中，將 `DynamicSignalsCard.tsx` 的資訊流拆分為 3 個純展示型子元件（Presentation Subcomponents）：

1. **`DynamicSignalsScoreBar.tsx`**：
   - 專責渲染多因子綜合量化分進度條、光暈動畫與分值百分比。
2. **`DynamicSignalsRegulatoryLayer.tsx`**：
   - 專責渲染交易所處置/注意狀態與券商融資斷頭風控標籤，具備獨立 Tooltip 與法規說明。
3. **`DynamicSignalsTacticalAdvice.tsx`**：
   - 專責渲染法人 VWAP 標準差乖離、關鍵防守/轉強價位與【AI 決策情境解析】白話指引。

主卡片 `DynamicSignalsCard.tsx` 僅保留容器職責、主題色彩映射與資訊流組合，行數可收斂至 120 行以內。

---

## ⏰ 預計觸發時機

- **觸發時機**：未來主力戰情室新增「使用者自訂多因子權重偏好」或「交易所處置倒數計時器」時，一併進行此元件層級之解耦重構。
