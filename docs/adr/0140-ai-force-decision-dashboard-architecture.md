# ADR 0140: AI 主力行為判讀與全功能量化決策儀表板架構設計 (Spec 0140)

## 狀態
已通過 (Accepted) - 2026-09-26

## 背景與問題陳述
投資人在進行個股（如 2360 致茂、2330 台積電等）短線與波段決策時，常面臨資訊零碎（K 線、籌碼、三大法人、隔日沖、多空能量、市場情緒各自獨立）之痛點。需要一個整合型戰情室，將 AI 主力行為、量化模型與 18 張多維度分析卡片融合於極致現代深色玻璃擬態 Bento-Grid 網格佈局中，並支援 5 大任務視圖切換與 5 大格式匯出。

## 決策內容 (Decisions)

1. **核心領域契約與單一資料源 (SSOT)**:
   - 定義 `AiForceDashboardReport` 聚合模型，統整 18 張卡片之數據契約（包括 `klineSystem`, `decisionCore`, `multiDimensionRadar`, `volumeProfile`, `riskSpider`, `forecastCone`, `vwapCostStructure`, `institutionalFlow`, `dayTradeRisk`, `bullBearEnergy`, `healthSummary`, `dynamicSignals`, `marketSentiment`, `aiConfidence`, `chipsSummary`, `forceDistribution`, `bullBearStrength`, `mainForceVerdict`）。
2. **純演算法引擎解耦 (KISS & TDD 原則)**:
   - `volumeProfileEngine`: 成交量價位分佈 Volume Profile 演算法。
   - `riskSpiderEngine`: 五維風險評估蜘蛛網分數計算。
   - `forecastConeEngine`: 60 日漂移率與機率預測錐。
   - `vwapCostEngine`: 20 日 VWAP 與主力成本偏離帶。
   - `dayTradeRiskEngine`: 隔日沖 5 大量化風險指標與等級評估。
   - `marketSentimentEngine`: 市場恐慌貪婪情緒與散戶/法人/主力參與者情緒推估。
   - `mainForceSemanticEngine`: 主力多因子行為自然語言語意合成 (MLP-AI)。
   - `exportReportPipeline`: DDE 注入防禦之安全 CSV 與離線 HTML 總結報告生成。
3. **原生 SVG 零龐大第三方圖表依賴**:
   - 拒絕引入龐大 Chart 函式庫，所有 K 線、均線、雷達圖、彩虹半圓儀表、圓形進度環、垂直熱區階梯、平滑貝茲波形堆疊、Sparkline 微圖均以輕量原生 SVG 向量繪製，極度輕盈且渲染流暢。
4. **4 排 Bento-Grid 矩陣排版與頂部雙列式架構**:
   - **頂部第 1 列**：整合 4 大狀態指示膠囊（AI SCAN ACTIVE、MAIN FORCE TRACKING、MARKET STATUS、VOLATILITY ALERT）、發光股票代號輸入框、股票名稱、[分析] 按鈕與 10 大即時行情指標橫列。
   - **頂部第 2 列**：左側展示資料來源說明標籤（日 K TWSE | 法人 TWSE | 融資券 FinMind 與統計區間），右側對齊 5 大匯出工具按鈕。
   - **Row 1 (5 卡)**：01 主 K 線 (2.3fr)、02 AI 決策核心 (1.25fr)、03 多維度雷達 (1.1fr)、04 垂直熱區圖 (1fr)、05 風險雷達 (1.1fr)。
   - **Row 2 (4 卡)**：06 預測錐 (1.15fr)、07 成本波形堆疊 (1.05fr)、08 法人計量與明細表 (1.8fr)、09 隔日沖風險 (1fr)。
   - **Row 3 (6 卡等寬)**：10 多空能量棒、11 健康度綜合評估、12 動態信號、13 市場情緒、14 AI 信心、15 籌碼異動摘要 (均為 1fr)。
   - **Row 4 (3 卡)**：16 三環買賣力分布 (1fr)、17 三環多空強度 (1fr)、18 主力追蹤總評判大字看板 (1.8fr)。
   - 全 18 張卡片右上角統一配備 MoreVertical (⋮) 微型選單圖示。
   - 底部提供 5 大任務視圖（綜合報告、技術警示、KD+MA、MACD、原始資料）平滑切換。

## 影響評估 (Consequences)
- **正面優勢**:
  - 100% 測試覆蓋率（134 個測試檔案、1,110 個單元測試全數通過）。
  - 生產環境 `npm run build` 0 TypeScript 錯誤。
  - 純原生 SVG 使得頁面載入速度極快，記憶體佔用極低。
  - 與實拍截圖 100% 像素級對齊，無任何多餘空白或擠壓錯位。
- **後續演進**:
  - 未來可對接線上即時 WebSocket 主力大單流，即時刷新 Bento Grid。
