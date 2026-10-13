# Ticket 07: 抽屜式 XML 語意提示詞預覽器 (XML Code Drawer)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/analysis/StrategicPromptPanel.tsx`
* **測試檔案**：`src/components/analysis/StrategicPromptPanel.test.tsx`

## 2. 需求描述 (Description)
1. 實作折疊抽屜按鈕（含 Code2 圖標、展開/收合箭頭）。
2. 展開區域使用暗黑終端機樣式（`background: var(--bg-primary, #080c14)`, `border: 1px solid var(--border-color)`）。
3. 代碼區採用高對比字型、清晰縮排、最大高度限制與平滑滾動，並附一鍵複製代碼按鈕。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 折疊/展開互動流暢無誤。
* [ ] 預覽代碼與當前選取的思考帽或 Master 同步。
