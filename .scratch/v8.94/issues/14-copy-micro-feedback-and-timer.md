# Ticket 14: 實作一鍵複製 2 秒成功微引導與動態狀態反饋

## 1. 任務目標
在複製按鈕點擊後，給予清晰流暢的人機微引導交互：
- 點擊前：顯示 `⚡ 一鍵複製 AI 戰情提示詞`。
- 複製成功後：按鈕樣式切換為淡綠色背景，文字變更為：`✅ 已複製！可直接按 Ctrl+V 貼入 ChatGPT / Claude`。
- 設置 2,000ms 定時器（`setTimeout`），時間到達後自動重置回初始按鈕狀態。
- 組件卸載時妥善清理定時器（`clearTimeout`），防範記憶體洩漏。

## 2. 修改範圍
* `src/components/aiForceDashboard/WarRoomPromptCard.tsx`:
  - 狀態管理：`copied: boolean`。
  - `useEffect` 或回調中清理定時器。

## 3. 驗收標準 (AC)
- [ ] 複製後按鈕文字正確變更為包含微引導的提示語。
- [ ] 2 秒後精確還原按鈕初始狀態。
