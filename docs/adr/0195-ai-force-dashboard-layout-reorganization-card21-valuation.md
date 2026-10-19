# 0195 ADR: AI 主力戰情室 Layer 6 雙子堆疊重構、Card 21 估值卡導入與 Card 15 寬幅 Sparkline 對稱對齊

## 狀態 (Status)
`APPROVED` (2026-10-19)

## 關聯規格與任務 (Context & Specs)
- **規格書：** [`docs/specs/0195-ai-force-dashboard-layout-reorganization-card21-valuation-and-chips-sparkline-spec.md`](file:///d:/APP/股票紀錄/docs/specs/0195-ai-force-dashboard-layout-reorganization-card21-valuation-and-chips-sparkline-spec.md)
- **前置 ADR：** ADR 0169, ADR 0174, ADR 0179, ADR 0181

## 決策背景 (Context)
在戰情室日常操盤與即時標的切換過程中，既有佈局面臨三個核心痛點：
1. **Card 19 (TDCC 集保趨勢)** 因每週五盤後更新的時態特徵，使使用者誤判為固定假圖，且美股模式下完全為空白佔位符。
2. **Layer 6 (能量與情緒)** 採用 4 欄單卡平鋪，Card 10 與 Card 13 各佔一整欄造成空間稀疏，且缺少投資人決策最關鍵的 PE/PB/殖利率估值定錨。
3. **Card 15 (籌碼摘要)** 中間資訊為 3/4 : 1/4，右側 Sparkline 僅 80px 過於擁擠侷促，且美股模式下退化為純文字框。

## 架構決策 (Decision)

### 1. Card 19 動態明確化與雙市場籌碼對稱
- 台股模式：顯式綁定標的標籤（`CARD 19 · {symbol} TDCC 集保趨勢`），整合 `under_10_ratio` 計算大戶與散戶的「籌碼剪刀差」。
- 美股模式：切換為 `CARD 19 · 美股機構持股與放空籌碼 (13F & Short Float)`，呈現機構持股%、空單佔流通比（Short Float %，>10% 警示）與內部人持股結構，徹底根除美股空白佔位。

### 2. Layer 6 雙子容器 (Twin-Tile) 緊湊堆疊與等高鎖定
- 將 Card 10 (AI 多空能量棒) 與 Card 13 (市場情緒儀表板) 包裝在同一欄位的 `EnergySentimentTwinCard` 容器中。
- 上半部 (120px) 放置 Card 10，下半部 (130px) 放置 Card 13，總高鎖定為 `250px`，與相鄰三欄達成 1:1 像素級齊平。
- 在兩卡交界處提供微型「Alpha 共振仲裁標籤」（如：個股逆勢抗跌、主力拉指數出個股）。

### 3. Card 13 美股宏觀情緒激活 (Zero New Dependencies)
- 切換至美股時，Card 13 自動切換為 `13 美股宏觀情緒 (CNN Fear & Greed / VIX)`，指針直接吃本地 SQLite `macro_sentiment_daily` 的 `cnn_fear_greed_score`、`vix_close` 與 `treasury_yield_10y`。

### 4. 導入 Card 21：估值與殖利率量化卡 (ValuationMetricsCard)
- 填補原 Card 13 騰出的第 3 欄空間。
- 支援四態自適應：台股個股（盤中動態 PE/PB/年化殖利率 + 歷史位階條）、美股個股（Forward PE/PB/扣 30% 稅後殖利率）、高成長股（PS 比防禦負本益比）、ETF 標的（折溢價率 + 年化配息率 + 費用率）。

### 5. Card 15 (籌碼摘要) 1/2:1/2 寬幅重構
- 將佈局調整為嚴格的 50% : 50%。
- 左側數值區採用 monospace 與 `whiteSpace: 'nowrap'`，徹底杜絕折行。
- 右側 Sparkline 走勢圖 100% 自適應展開，加入 0 軸水平分水嶺基準虛線與連續性動能標籤。
- 美股模式展示 RVOL、VWAP 偏離與機構量能走勢，達成雙市場 100% 視覺對稱。

## 後果與影響 (Consequences)
- **正面效益**：
  - 徹底解決戰情室估值指標缺口，形成「短線能量 + 宏觀情緒 + 基本面估值 + AI 信心」的完整閉環。
  - 雙市場 100% 對稱，美股不再出現次等感或文字佔位框。
  - 佈局高度整齊，0 軸分水嶺讓籌碼動能波折清晰可辨。
- **維護代價**：
  - 需確保 `AiForceRealDataE2E.test.ts` 與既有單元測試在 View 層結構變更後保持 100% 綠燈。
