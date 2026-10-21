# Ticket 05: 提示詞面板頂部控制列重構 (Prompt Panel Header Bar)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/analysis/StrategicPromptPanel.tsx`
* **測試檔案**：`src/components/analysis/StrategicPromptPanel.test.tsx`

## 2. 需求描述 (Description)
1. 使用 Flexbox 實作水平兩端對齊（`display: flex; justify-content: space-between; align-items: center;`）。
2. 左側：BrainCircuit 圖標微漸層背板、標題「智策多維提示詞引擎」、模式徽章（個股大師 V12.0）、副標題。
3. 右側工具組：
   - 部位脫敏切換膠囊（綠/紅微發光邊框，點擊切換）。
   - Token 預估膠囊（字型 JetBrains Mono）。
   - 一鍵複製 Master Prompt 主按鈕（高對比亮藍漸層、帶複製反饋）。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 頂部各按鈕水平排列自適應，不再垂直換行錯位。
* [ ] 一鍵複製與脫敏切換功能正常運作。
