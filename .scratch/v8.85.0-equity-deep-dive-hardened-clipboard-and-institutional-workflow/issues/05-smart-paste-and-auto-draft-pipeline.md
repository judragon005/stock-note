# Ticket 05: 智慧解析外部 LLM 研報回填 (Smart Paste) 與系統量化數據自動草稿 (Auto-Draft)

## 關聯規格
- Spec: `docs/specs/0173-equity-deep-dive-hardened-clipboard-and-institutional-workflow-spec.md` (Story D / AC US-10, US-11)

## 問題背景
使用者將 7 步 Prompt 複製至 ChatGPT / Claude 獲取完整研報後，必須手動逐字輸入至第 7 步 5 個格子，操作摩擦力大，容易導致決策卡未被沉澱。此外，首次打開彈窗時買進理由與觀察指標為全白，散戶無從下手。

## 任務細節
1. 新增 `src/utils/memoSmartParser.ts`：
   - 實作 `parseLlmResponseToMemoDraft(rawText: string): Partial<InvestmentMemoRecord>`。
   - 透過正則表達式自動辨識並萃取：
     - 目標價（`目標價|Target Price`）
     - 停損價（`停損價|停損底線|Stop Loss`）
     - 買進核心理由（`買進理由|最強催化劑|Catalyst`）
     - 觀察指標（`觀察指標|追蹤指標|Tracking Metrics`）
     - 證偽條件（`證偽條件|論點失效|Kill Switch`）
     - 持有週期（`持有週期|天數|波段`）
2. 新增單元測試 `src/utils/memoSmartParser.test.ts`：
   - 測試常見 ChatGPT、Claude 繁簡中文輸出格式的解析精準度。
3. 修改 `src/components/equityDeepDive/EquityDeepDiveModal.tsx`：
   - 在第 7 步頂部新增「📋 智能貼上外部研報（Smart Paste）」按鈕與折疊貼上框。
   - 使用者貼入文字後點擊「一鍵解析回填」，自動將解析結果填入各輸入欄位，並以 Toast 提示已自動填入的欄位清單。
   - 提供「🪄 帶入系統量化草稿」按鈕，可將既有箱底防線帶入停損價、箱頂帶入目標價。

## 驗收標準
- [x] `npm test src/utils/memoSmartParser.test.ts` 100% 通過。
- [x] 貼入標準 7 步 AI 輸出文字，點擊解析後目標價、停損價、買進理由與觀察指標自動填入對應 input。
