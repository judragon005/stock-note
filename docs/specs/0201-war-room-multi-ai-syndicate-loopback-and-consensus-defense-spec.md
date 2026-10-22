# 規格書 0201：戰情室外部 AI 多智囊團並行回流、模型去重覆蓋與法人風控共識防線規範 (Spec 0201)

## Problem Statement

當前主力戰情室的「AI 戰情外聯與釘選中樞」（基於 Spec 0200）僅支援單一外部 AI 裁決釘選。當使用者貼入新的外部 AI 回覆時，既有紀錄會被無差別覆蓋。
在真實投資實務中，投資者通常會同時向多家頂級大模型（例如：Claude 3.5 分析籌碼防守、Perplexity 查核最新法說動態、ChatGPT 進行綜合推演）獲取作戰計畫。
缺乏「多 AI 智囊團並行（Multi-AI Syndicate）」能力導致以下痛點：
1. **多模型無法並存與對比**：使用者無法在同一個戰情介面中同時監控多家 AI 提出的不同停損與停利點位。
2. **相同模型名稱語意發散**：外部模型自我回報的名稱格式不一（如 `Claude 3.5 Sonnet` 與 `claude-3-5-sonnet-20241022`），若無標準化映射，會導致相同模型覆蓋失效、列表膨脹碎片化。
3. **風控存活偏差與凹單漏洞**：當不同 AI 給出高低不同的停損點位時，投資者容易選擇性相信寬鬆的停損價而忽視嚴格防線，違反交易紀律。
4. **勝率歸屬混淆**：結案操作（WIN/LOSS/EXPIRED）過去只能一刀切清空標的，無法精確將戰績歸屬至個別 AI 模型，致使智囊團勝率榜失真。
5. **儲存結構升級的白屏風險**：LocalStorage 既有資料若由單一物件直接轉為陣列，若無向下相容轉換層，會造成舊使用者前端運行時拋出例外。

## Solution

建立極簡（KISS 原則）、零後端依賴且具備法人級風控防禦的「多 AI 智囊團並行回流體系」：
1. **多模型並存與同模型去重覆蓋**：同標的下支援多個不同 AI 模型的裁決同時釘選；若貼入相同模型，自動以最新回流內容覆蓋舊版。
2. **模型名稱自動正規化 (Aliasing)**：建立常見大模型（Claude、ChatGPT、Perplexity、Gemini）的微型正規化字典，統一 Key 值，避免字串歧異。
3. **最嚴格保命停損優先警報 (Strictest Stop-Loss Priority)**：盤中觸價評估自動取所有有效模型中之最高停損價（最嚴格防線），一旦跌破立刻高優先級警示，杜絕主觀凹單。
4. **智囊團共識與分歧指示燈**：極簡計算各模型停損點落差比率，提供「共識防線」或「意見分歧」風控提示。
5. **單卡獨立結案與全隊一鍵結案**：支援各模型卡片獨立回報勝率，或於標的清倉時一鍵結案，精確累積真實模型勝率榜。
6. **緊湊型多模型條列 UI**：單行約 38px 高度，高密度展示點位與結案操作，避免縱向空間過度擠壓戰情室。
7. **LocalStorage 雙軌向下相容讀取**：自動相容舊版單一物件結構與新版陣列結構，保證零遷移損壞。

## User Stories

1. As an active trader, I want to paste verdicts from multiple AI models (e.g. Claude and ChatGPT) for the same stock, so that I can cross-reference multiple expert opinions in one unified view.
2. As an active trader, when I paste an updated verdict from an already-pinned AI model, I want the system to automatically overwrite only that model's record, so that I always see the newest guidance without manual deletion.
3. As an active trader, when pasting model responses with slightly different name strings (e.g. 'Claude 3.5' vs 'Claude 3.5 Sonnet'), I want the system to normalize the model identity, so that they correctly deduplicate to the same model slot.
4. As a risk-conscious investor, when different AI models propose different stop-loss levels, I want the intraday alert to prioritize the strictest (highest) stop-loss price, so that I am prevented from psychological denial and holding onto losing positions.
5. As an investor, I want to see a concise indicator of whether my AI models are in consensus or deeply divided on key price levels, so that I can adjust my position sizing accordingly.
6. As a disciplined trader, when a specific AI model's strategy target is hit or stopped out, I want to close and record the outcome for that specific model, so that its individual track record in the syndicate leaderboard is accurate.
7. As an investor who sells out an entire position, I want a single action to close all active AI models for that stock, so that I don't have to click outcome buttons for each model one by one.
8. As a desktop and mobile user, I want the pinned AI models list to be visually compact, so that it does not take up excessive vertical space and crowd out the primary technical and institutional charts.
9. As an existing user with pre-existing pinned strategies in browser storage, I want the app to upgrade gracefully without crashing or losing my data when reading legacy single-strategy records.
10. As a user who copies a multi-model analysis containing several JSON blocks, I want the quick paste parser to detect and ingest all valid models in a single paste action, so that I save repetitive clicking.

## Implementation Decisions

- **Domain Model & Types**:
  - `PinnedStrategy` 保持既有單一裁決型別定義。
  - 將標的釘選儲存結構定義為 `Record<string, PinnedStrategy[]>`（以 symbol 為鍵，值為該標的有效釘選策略陣列）。
  - 在 `StrategyTriggerStatus` 中擴充支援多模型綜合評估結果，包含最嚴格停損價 `strictestStopLoss`、觸發該停損之模型名稱 `triggeredModel`，以及共識/分歧狀態。

- **Engine Logic & Pure Utilities (`src/engine/strategyPinEngine.ts`)**:
  - `normalizeAiModelName(raw: string): string`: 依據正規表達式將發散名稱標準化（如 Claude, ChatGPT, Perplexity, Gemini），其餘保留原始字串。
  - `parseLoopbackContentBatch(rawText: string, expectedSymbol?: string)`: 使用全域正則 `/```(?:json)?\s*([\s\S]*?)\s*```/g` 掃描所有代碼區塊，支援單一文字中批次抽取多筆 JSON 裁決。
  - `savePinnedStrategy(pin: PinnedStrategy)`: 升級為依 `symbol` 與正規化後之 `aiModel` 進行寫入。若清單中已存在相同 `aiModel` 則覆蓋替換；若不存在則追加至陣列。
  - `getPinnedStrategies(symbol: string): PinnedStrategy[]`: 讀取 LocalStorage 時執行雙軌向下相容檢查；若取出的資料為非陣列之單一物件，自動包裹為 `[legacyPin]` 回傳，確保零例外崩潰。
  - `clearPinnedStrategy(symbol: string, aiModel?: string)`: 支援刪除指定標的的單一模型策略，若未帶 `aiModel` 則清空該標的所有策略。
  - `evaluateMultiStrategyTriggers(pins: PinnedStrategy[], currentPrice: number)`:
    - 找出有效模型中最嚴格的停損價（`Math.max(...pins.map(p => p.stopLoss))`）。
    - 評估是否有任一模型達到停利或突破點。
    - 計算停損點位差幅比率（Spread Ratio），判定為「高度共識（差幅 < 2%）」或「分歧警告（差幅 > 5%）」。

- **UI & Presentation (`src/components/aiForceDashboard/WarRoomPromptCard.tsx`)**:
  - 釘選區改造為「緊湊型多模型智囊條列（Compact Multi-Model List）」：
    - 頂部一覽列：展示共識防線標籤、分歧度提示，以及「全隊結案」操作。
    - 列表主體：每家 AI 一行（約 38px 高），包含模型標籤、裁決核心、停損價、目標價、剩餘效期、單卡結案動作組（WIN / LOSS / EXPIRED）與刪除按鈕。
    - 樣式嚴格遵循既有 Dark Glassmorphism 與 CSS 變數設計體系。

## Testing Decisions

- **Testing Principles**:
  - 遵循公開介面縫隙 (Test Seams) 測試，100% 透過純引擎函式與元件對外行爲進行驗證，不測試內部私有變數或脆弱實作細節。
- **Engine Unit Tests (`src/engine/strategyPinEngine.test.ts`)**:
  - 模型名稱正規化多種格式測試（大小寫、版本尾綴、未知模型回退）。
  - 批次多代碼塊抽取與單代碼塊解析測試。
  - LocalStorage 存取：驗證同模型覆蓋、不同模型並列、舊格式單一物件無痛向下相容。
  - 盤中多模型觸價評估：驗證最嚴格保命停損優先警報、共識/分歧指標運算。
  - 單模型刪除與全標的清空邏輯。
- **Component Tests (`src/components/aiForceDashboard/WarRoomPromptCard.test.tsx`)**:
  - 渲染多模型清單並驗證各模型數據正確呈現。
  - 點擊單卡結案按鈕，驗證只結案並移除該模型，其他模型繼續保留。
  - 驗證觸發最嚴格停損時的警報橫幅訊息與確認互動。

## Out of Scope

- 建立遠端後端資料庫同步多用戶 AI 裁決（保持純前端 LocalStorage 零成本與隱私隔離）。
- 自動調用 LLM 商業 API 產生裁決（本模組定位為使用者手動外聯的雙向回流中樞，不產生外部 API 費用）。
- 複雜的貝氏機率加權與機器學習擬合停損線（遵循 KISS 原則，以簡單最大/最小值及點位差幅呈現）。

## Further Notes

- 本規格嚴格遵守專案 `AGENTS.md` 規範與 KISS 原則，改動範圍限縮於純前端資料流與單一卡片視覺，確保零非預期副作用。
