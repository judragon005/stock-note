# 0194 Spec: 戰情室外聯提示詞時態一致性、景氣循環判定與法人風控對齊規格書

## 1. 概述與元數據 (Overview & Metadata)

* **規格編號：** Spec 0194
* **標題：** 戰情室外聯提示詞時態一致性、景氣循環判定與法人風控對齊
* **關聯 Issue：** #288 (https://github.com/judragon005/stock-note/issues/288)
* **關聯架構決策：** `docs/adr/0194-war-room-prompt-temporal-and-cyclical-alignment.md`
* **規格狀態：** `APPROVED` (經過 /grill-with-docs 多輪壓力測試收斂，準備進入任務拆解)
* **版本：** V1.0
* **建立日期：** 2026-10-19

---

## 2. 背景與問題陳述 (Problem Statement)

使用者將主力戰情室產生的外聯提示詞（以威剛 3260 為例）貼至外部大模型（ChatGPT-4o）進行壓力測試時，外部 AI 風控長（CRO）精準抓出了以下足以引發交易誤判的資料矛盾與結構性缺口：

1. **現價上漲但成交量為零之邏輯矛盾**：
   - 盤中未結算時，提示詞輸出「現價 360 元、上漲 10 元 (2.86%)」，但 `<volume_shares>` 卻輸出為 `0` 張。外部 AI 依據風控常理判定該報價「尚未成交、報價異常或缺乏流動性」，拒絕採納為可成交價格。
2. **記憶體龍頭誤判為非循環股（重大分類缺陷）**：
   - 威剛（3260）為全球主要記憶體模組龍頭，獲利與營收高度受 DRAM / NAND Flash 報價週期影響。但在 `industryGate.ts` 中漏列 3260，導致 Prompt 輸出 `<is_cyclical_stock is_cyclical="false">一般非循環股</is_cyclical_stock>`，使黑帽紅隊無法對週期高峰殺估值（Cycle Peak Valuation Trap）進行質詢。
3. **時態未隔離引發因果混淆**：
   - 現價為今日盤中（如 10-19 盤中），而三大法人與融資券為昨日收盤結算（10-16 盤後）。因缺乏明確的因果防禦宣告，外部 AI 易將昨日法人的賣超誤判為今日盤中下跌的元凶。
4. **指標待同步 (N/A) 被誤讀為公司治理或假帳疑慮**：
   - 本益比、淨值比、董監質押率等欄位因本地戰情室未完全聚合而標示為 `N/A`。外部 AI 在黑帽環節將「系統工程待同步」誤判為「公司隱瞞財務危機或有假帳風險」，引發過度恐慌。
5. **停損觸發狀態未前置預算**：
   - 使用者成本為 377.44 元，保守 3% 停損線為 366.12 元，現價 360 元早已實質跌破。但引擎未給予明確布林判定，導致外部 AI 仍給予模棱兩可的建議（「若未來跌破 366 請停損」）。
6. **空方壓力缺少外資借券賣出（SBL）維度**：
   - 台股外資主力狙擊空單以「借券賣出」為主，散戶才用「融券」。Prompt 僅輸出 `<short_balance>`，缺乏借券賣出說明，導致外部 AI 低估法人空方壓力。

---

## 3. 核心設計原則與防禦護欄 (Core Principles & Guardrails)

遵循 **KISS 原則** 與 **防禦性開發（不改壞既有功能）**，以最低代碼量達成華爾街機構級風控精準度：

### 3.1 盤中量價一致性護欄 (Intraday Volume-Price Consistency)
* 在 `aiForcePromptAdapter.ts` 構建 `StrategicFactDigest` 時：
  - 若 `report.marketBar?.volumeShares` 大於 0，採計該值；
  - 若其為 0 或 undefined，而 `report.realtimeQuote?.volume` 大於 0，則優先採計即時累計成交量（台股換算為張數）；
  - 確保當現價存在且有漲跌時，成交量必定大於 0，徹底消除「有價格無成交」之矛盾。

### 3.2 景氣循環股清單補齊 (Cyclical Symbols Expansion)
* 在 `src/engine/industryGate.ts` 的 `CYCLICAL_SYMBOLS` Set 中，正式補入：
  - `3260` (威剛科技 - DRAM/NAND 模組龍頭)
  - `8299` (群聯電子 - 快閃記憶體控制晶片)
* 保證 `isCyclicalIndustry('3260') === true`，外部 Prompt 輸出 `<is_cyclical_stock is_cyclical="true">景氣循環週期股...</is_cyclical_stock>`。

### 3.3 時態隔離與 N/A 免責宣告 (Temporal & Pending Grounding Declarations)
* 在 `src/engine/strategicPromptEngine.ts` 的 `<system_grounding_declaration>` 中增加兩項強制宣告：
  1. `【時態因果隔離】：現價為盤中即時行情，三大法人與融資券為前一交易日盤後結算數據，嚴禁將前一日籌碼因果直接套用於盤中即時走勢。`
  2. `【待同步宣告】：若部分財務估值（PE/PB）或公司治理指標標註為 N/A，係因當前系統管線尚待同步，嚴禁直接推定為公司財務舞弊或無價值。`

### 3.4 停損防線實質觸發前置預算 (Deterministic Stop-Loss Status)
* 在 `<pre_calculated_pivots mode="HOLDING_DEFENSE">` 中，增加由引擎預算好的狀態標籤：
  - `<stop_loss_conservative_status is_triggered="true|false">已實質跌破保守停損線 (觸發紀律防守條件) | 位於防線之上安全</stop_loss_conservative_status>`
  - 協助外部 AI CRO 一針見血給出執行 Checkpoint，杜絕模棱兩可的空話。

### 3.5 外資借券賣出（SBL）籌碼維度擴充 (SBL Borrowing Dimension)
* 在 `<chips_and_microstructure>` 中追加 `<sbl_balance unit="${unit}">N/A (外資借券賣出待結算)</sbl_balance>`。
* 提示詞註解標明：台股外資主力空方部位以借券賣出為主，不能單憑融券餘額斷定市場無放空賣壓。

### 3.6 市場隔離與零回歸防護 (Market Isolation & Zero-Regression)
* 美股（US）與 ETF 邏輯維持原樣，嚴格隔離，杜絕改動台股時影響美股或 ETF 提示詞。
* 既有 29 個單元測試必須持續 100% 綠燈通過。

---

## 4. 驗收標準 (Acceptance Criteria)

- [ ] **AC-1 (景氣循環股)**：`isCyclicalIndustry('3260')` 與 `isCyclicalIndustry('8299')` 回傳 `true`，且提示詞輸出 `is_cyclical="true"`。
- [ ] **AC-2 (盤中成交量)**：在盤中未結算且 `realtimeQuote` 有成交量時，Prompt 的 `<volume_shares>` 必定大於 0，不出現 0 張現象。
- [ ] **AC-3 (時態與 N/A 宣告)**：Prompt 的 `<system_grounding_declaration>` 包含時態隔離與 N/A 待同步免責宣告。
- [ ] **AC-4 (停損狀態預算)**：在庫持倉若現價低於保守停損點，Prompt 明確標註 `is_triggered="true"`。
- [ ] **AC-5 (外資借券欄位)**：Prompt 台股籌碼區塊包含 `<sbl_balance>` 借券賣出維度。
- [ ] **AC-6 (回歸測試)**：既有測試（`industryGate.test.ts`、`aiForcePromptAdapter.test.ts`、`strategicPromptEngine.test.ts`）全數通過，並追加新驗收測試。
