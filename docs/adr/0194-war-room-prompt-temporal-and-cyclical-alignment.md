# ADR 0194: 戰情室外聯提示詞時態一致性、景氣循環判定與法人風控對齊 (War Room Prompt Alignment)

## 狀態 (Status)
已接受 (Accepted) - 2026-10-19

## 脈絡 (Context)
主力戰情室產生的外聯提示詞在外部大模型（如 ChatGPT-4o / Claude 3.5 Sonnet）進行機構風控模擬質詢時，暴露出以下資料矛盾與風控缺口：
1. **現價上漲但成交量為零之邏輯矛盾**：盤中未結算時，提示詞輸出「現價 360 元、上漲 10 元 (2.86%)」，但 `<volume_shares>` 卻為 `0` 張。外部 AI 風控長判定為未成交、報價異常或缺乏流動性。
2. **記憶體龍頭誤判為非循環股**：威剛（3260）為全球主要記憶體模組龍頭，獲利與營收高度受 DRAM / NAND 報價週期影響。但在 `industryGate.ts` 中漏列 3260，導致 Prompt 輸出 `<is_cyclical_stock is_cyclical="false">一般非循環股</is_cyclical_stock>`，使黑帽紅隊無法對週期高峰殺估值進行質詢。
3. **時態未隔離引發因果混淆**：現價為今日盤中即時行情，而三大法人與融資融券為昨日盤後結算，缺乏強制隔離宣告導致外部 AI 將昨日法人賣超誤判為今日盤中下跌之因果。
4. **指標待同步 (N/A) 被誤讀為假帳疑慮**：部分估值或治理指標因戰情室未完全聚合顯示為 `N/A`，外部 AI 將「系統待同步」過度推論為「隱瞞財務危機或假帳風險」。
5. **停損觸發狀態未前置預算**：現價已實質跌破保守停損線，但提示詞未給出確定性布林標籤，外部 AI 容易給予模糊空話。
6. **空方壓力缺少外資借券賣出（SBL）維度**：台股主力空方以借券賣出為主，不能單憑融券餘額斷定市場無放空賣壓。

## 決策 (Decisions)

### 1. 景氣循環股清單擴充 (Cyclical Symbols Expansion)
在 `src/engine/industryGate.ts` 的 `CYCLICAL_SYMBOLS` Set 中，補入記憶體族群：
- `3260` (威剛科技)
- `8299` (群聯電子)
保證 `isCyclicalIndustry('3260') === true`，外聯提示詞正確標記為景氣循環股。

### 2. 盤中量價一致性護欄 (Intraday Volume-Price Consistency)
在 `aiForcePromptAdapter.ts` 構建 `StrategicFactDigest` 時：
- 優先採計 `report.marketBar?.volumeShares`；
- 若其為 0 或 undefined，而 `report.realtimeQuote?.volume` 大於 0 時，採計即時累計成交量（台股換算為張數）；
- 保證現價跳動時成交量必定大於 0。

### 3. 時態隔離與 N/A 待同步免責宣告 (Temporal & Pending Grounding Declarations)
在 `strategicPromptEngine.ts` 的 `<system_grounding_declaration>` 注入兩項強制聲明：
- 【時態因果隔離】：現價為盤中即時行情，三大法人與融資券為前一交易日盤後結算數據，嚴禁將前一日籌碼因果直接套用於盤中即時走勢。
- 【待同步宣告】：若部分財務估值或治理指標標註為 N/A，係因系統管線尚待同步，嚴禁直接推定為公司財務舞弊或無價值。

### 4. 停損防線實質觸發前置預算 (Deterministic Stop-Loss Status)
在 `<pre_calculated_pivots mode="HOLDING_DEFENSE">` 中，增加引擎預算的狀態標籤：
- `<stop_loss_conservative_status is_triggered="true|false">已實質跌破保守停損線 (觸發紀律防守條件) | 位於防線之上安全</stop_loss_conservative_status>`

### 5. 外資借券賣出 (SBL) 籌碼維度擴充
在 `<chips_and_microstructure>` 中追加 `<sbl_balance unit="${unit}">N/A (外資借券賣出待結算)</sbl_balance>` 與註解說明，補齊外資空方維度。

## 後續影響 (Consequences)
1. **優點**：
   - 外部大模型（ChatGPT-4o、Claude 3.5 Sonnet）做為 AI 風控長評估時，不再發生量價矛盾或時態因果顛倒。
   - 景氣循環股評估完全符合半導體與記憶體產業特徵。
   - 停損防線確定性輸出，避免 AI 風控給予模糊空話。
2. **約束**：
   - 美股（US）與 ETF 邏輯維持原樣，嚴格隔離。
   - 所有既有測試維持 100% 綠燈零回歸。
