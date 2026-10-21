# Ticket 03: 多空矛盾智能仲裁演算法與四重視角整合 (TDD)

## 1. 權責範圍 (Scope)
* **核心檔案**：
  - `src/engine/aiForceDashboardEngine.ts`
* **測試檔案**：
  - `src/engine/dynamicSignalsArbitration.test.ts`

## 2. 需求描述 (Description)
1. **多空矛盾智能仲裁演算法 (Conflict Resolution Engine)**：
   - 實作仲裁純函式 `arbitrateSignals(trend, chip, momentum, risk): { actionableAdvice: string, biasType: string }`。
   - 識別四大實戰型態：
     - **洗盤破底翻 (Bear Trap)**：`trend 偏空` + `chip 集中` + `momentum 超跌` ➔ 「主力逆勢吸籌但短線破線，疑似洗盤破底翻觀察區。建議觀望勿殺低，待放量站回 5 日線轉強再行加碼。」
     - **誘多高檔出貨 (Bull Trap)**：`trend 偏多` + `chip 調節` + `risk 偏高` ➔ 「股價雖處多頭，但主力持續調節，呈現出貨背離。切勿追高，嚴防主力倒貨引發快速回檔。」
     - **共振主升段 (Harmonic Surge)**：`trend 偏多` + `chip 集中` + `momentum 強勁` ➔ 「量價齊揚、籌碼高度集中，波段多頭主升趨勢明確，順勢持有或沿 5 日線偏多操作。」
     - **共振破位主跌段 (Harmonic Collapse)**：`trend 破線偏空` + `chip 調節` + `risk 破位警戒` ➔ 「均線全數跌破，籌碼外資投信同步砍倉，主跌段殺盤風險極高。嚴格執行停損退場，切勿猜底。」
2. **四重視角數據整合 (`calculateDynamicSignalsMultiPerspective`)**：
   - **交易所**：整合 `statusTag`（`DISPOSITION` 標註「處置股票 (分盤撮合)」、`ATTENTION` 標註「列注意股票」）；當沖比 > 60% 標註「當沖過熱投機警戒」。
   - **券商**：融資餘額與維持率（融資增加但破線標註「融資浮額沉重 / 追繳風險」）。
   - **法人**：計算收盤價相對於 20 日 VWAP 之標準差偏離（如 `-1.8σ 超跌`）。
   - **個人**：動態提取關鍵防守價（MA20 或布林下軌）與轉強壓力價（MA5）。

## 3. 測試縫隙 (Test Seams)
* 輸入特定量化矩陣情境，斷言輸出的 `actionableAdvice`、`regulatoryBadge`、`brokerMarginAlert` 與 `keySupportPrice` 正確無誤。

## 4. 驗收標準 (Acceptance Criteria)
* [ ] 對應 Spec 0179 之 **AC 4, AC 5**。
* [ ] `src/engine/dynamicSignalsArbitration.test.ts` 相關單元測試 100% 綠燈。
