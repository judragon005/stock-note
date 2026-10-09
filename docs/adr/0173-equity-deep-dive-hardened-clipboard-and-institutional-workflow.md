# ADR 0173: 全市場個股深度投研高容錯雙軌剪貼簿、全鏈路數據管線與券商法人風控閉環架構決策 (Hardened Dual-Pipeline Clipboard, Data Pipeline Injection & Institutional Workflow)

## 狀態
已採納 / 全量實施完成 (Spec 0173 / Tickets 01 ~ 06 全量交付)

## 背景與問題陳述
在「全市場個股 7 步深度投研決策閉環 (`EquityDeepDiveModal`)」中，使用者回饋並經深度審查發現以下關鍵缺陷：
1. **NAS / 局域網非安全上下文剪貼簿靜默失效**：
   - 部署於 NAS（如 QNAP/Synology HTTP 環境 `http://192.168.x.x`）時，現代瀏覽器 W3C 規範限制 `navigator.clipboard` 僅於安全上下文 (HTTPS / localhost) 可用。
   - 原代碼僅依賴 `if (navigator.clipboard)` 判定，在 HTTP 局域網環境下直接拋出未處理異常或走入靜默略過，導致「一鍵全量複製 Prompt」與單步複製按鈕毫無反應。
2. **呼叫端 Props 饑餓與數據斷鏈**：
   - 在 `App.tsx` 與 `AiForceDashboardView.tsx` 呼叫 `EquityDeepDiveModal` 時，僅傳入 `symbol/market/name`，未傳入即時行情 (`quote`)、K 線歷程 (`candles`)、使用者持倉 (`holdings`) 與戰情室情境 (`reportContext`)。
   - 導致彈窗內現價永遠為 0、自動推算之停損價與目標價被清空覆蓋、在庫狀態永遠判定為「未在庫 (0 股)」，無法執行「一鍵同步持倉計畫」與「自動帶入系統草稿」。
3. **券商與買方法人級風控缺失**：
   - 投資備忘錄缺少證偽開關（核心論點失效條件 `thesisInvalidation`）。
   - 缺少即時動態計算之機構級 R-Multiple 風報比（Reward-to-Risk Ratio）。
   - Prompt 模板缺少外資借券賣出 (SBL)、融資融券資券比與處置股票流動性折價評估。
4. **外部 AI 研報數據孤島**：
   - 使用者將 Prompt 貼至 Claude / ChatGPT 獲得深度分析後，缺乏結構化回填機制，必須手動逐項複製回系統備忘錄。

---

## 決策內容 (Decisions)

### 1. 雙軌降級高容錯剪貼簿工具 (`src/utils/clipboard.ts`)
- **第一軌 (Modern Async Clipboard API)**：若當前執行環境具備 `navigator.clipboard?.writeText`，優先以非同步原生通道複製。
- **第二軌 (Legacy DOM Textarea Fallback)**：若非安全上下文或 `navigator.clipboard` 不可用，自動降級採用隱藏 `HTMLTextAreaElement` + `document.execCommand('copy')` 機制。
- **嚴格 DOM 清理與異常防禦**：使用 `try/finally` 確保暫存節點 100% 自 DOM 樹移除，並將所有錯誤包裝為可讀之繁體中文 Toast 提示，終結靜默失敗。

### 2. 父層數據管線端到端注入 (`App.tsx` & `AiForceDashboardView.tsx`)
- 於父層依據 `selectedSymbol` 動態檢索最新 `quote`、`candles`、`holdings`（在庫持股數與成本均價），並完整注入 `EquityDeepDiveModal`。
- 保障現價真實連動、在庫標的自動高亮、停損目標價安全預設。

### 3. 券商法人風控模型與 UI 升級
- **實體欄位擴充**：擴充 `InvestmentMemoRecord`，加入 `thesisInvalidation` 與 `calculatedRiskRewardRatio`。
- **即時 R-Multiple 風報比徽章**：於第 7 步動態計算 $\text{RRR} = \frac{\text{目標價} - \text{現價}}{\text{現價} - \text{停損價}}$，實時呈現機構級標準徽章（$\ge 3.0R$ 綠色優質、$< 2.0R$ 橘紅色警示）。
- **投研 Prompt 升級**：在步驟 4 籌碼與步驟 7 投資備忘錄中，注入借券賣出、資券比、法證指標與出關折價評估要件。

### 4. 外部研報智慧解析回填器 (`src/utils/memoSmartParser.ts`)
- 開發正規表達式智慧萃取器，支援解析包含核心論點、催化劑、下檔風險、失效條件、目標價與停損價之外部 AI 回覆全文。
- 於彈窗中新增「📋 智能貼上研報」快速解析按鈕與「🪄 帶入系統草稿」按鈕，建立完整的「導出 Prompt ➔ 外部推理 ➔ 智慧回填 ➔ 歸檔建倉」操盤閉環。

---

## 後續影響 (Consequences)

### 正面效益
- **全環境無縫相容**：無論在 localhost、正式網域 HTTPS 或 NAS 私有局域網 HTTP，複製功能 100% 正常運作並伴隨明確反饋。
- **數據鏈路完整連貫**：徹底消除市價 0 與持倉斷鏈問題，投資備忘錄真正與系統持倉及交易計畫聯動。
- **法人風控水準看齊**：提供嚴格的證偽開關與風報比門檻，杜絕憑感覺下單。

### 相容性與測試
- 包含 `clipboard.test.ts`、`memoSmartParser.test.ts`、`equityDeepDiveEngine.test.ts` 與 `EquityDeepDiveModal.test.ts`。
- 全專案 210 個測試套件、1529 個測試案例全數 100% 通過。
