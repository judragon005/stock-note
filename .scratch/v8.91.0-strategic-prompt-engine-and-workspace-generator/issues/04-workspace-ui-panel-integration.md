# 04 — 個股分析工作區智策提示詞面板整合 (Ticket 04)

**Parent Issue:** #135
**Parent Spec:** [Spec 0153: 智策精煉投資決策多維提示詞引擎與工作區數據注入生成器規格書](file:///d:/APP/股票紀錄/docs/specs/0153-smart-strategic-prompt-engine-and-workspace-generator-spec.md)
**Parent ADR:** [ADR 0153: 智策精煉投資決策多維提示詞引擎架構規劃](file:///d:/APP/股票紀錄/docs/adr/0153-smart-strategic-prompt-engine.md)

**What to build:**
建立 `src/components/analysis/StrategicPromptPanel.tsx`，並整合至 `src/components/analysis/StockAnalysisWorkspace.tsx`：
1. **面板佈局與視覺設計 (Rich Aesthetics & Glassmorphism)**：
   - 頂部控制列：
     - Master 一鍵複製按鈕（帶 Toast 成功反饋與動畫）。
     - 部位脫敏開關（預設開啟，附帶盾牌圖示說明）。
     - 即時 Token 計數徽章（動態顏色：綠色 < 3,500，黃色 3,500~4,500）。
     - 資產類型徽章（自動顯示 `個股模式 (V12.0)` 或 `ETF 模式 (V3.0)`）。
2. **六頂思考帽互動卡片區**：
   - 6 張色系微調的卡片（白/紅/黑/黃/綠/藍）。
   - 每張卡片均具備獨立【複製此思考帽 Prompt】按鈕。
   - 黑帽卡片具備醒目的「魔鬼代言人 / 紅隊批判」警示標籤。
3. **XML 語意結構預覽器**：
   - 可折疊式程式碼區塊，語法反白預覽即將發送至外部 LLM 的結構化 Prompt。
4. **嵌入 StockAnalysisWorkspace.tsx**：
   - 於個股分析工作區右側或獨立 Tab 新增「智策提示詞生成器」快捷入口。

**Blocked by:** Ticket 03 (提示詞組裝引擎)

**Status:** ready-for-agent

- [ ] `StrategicPromptPanel.tsx` 實作完成，零樣式破版。
- [ ] 整合進 `StockAnalysisWorkspace.tsx`。
- [ ] 撰寫 `StrategicPromptPanel.test.tsx` 驗證按鈕渲染、狀態切換與複製剪貼簿事件。
