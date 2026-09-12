# Ticket 05: 持倉列表與動能雷達無縫串接與全域整合驗收 (Holdings & MuscleBooker Integration)

## 狀態
- 狀態: `completed`
- 關聯規格: `docs/specs/0121-omni-technical-indicator-analysis-system-spec.md` (模組四)
- 關聯 Issue: #37
- 標籤: `enhancement,ready-for-agent`

## 任務目標
在 `HoldingsTable.tsx`（持倉列表）與 `MuscleBookerWorkspace.tsx`（動能雷達）中整合「📊 全指標透視」入口按鈕，點擊即可自動喚起彈窗並鎖定該標的；並確保全專案建置與測試 100% 綠燈。

## 具體修改清單
1. **`src/App.tsx`**：
   - 掛載 `OmniTechnicalInspectorModal`，受全域狀態 `selectedOmniSymbol` 與 `isOpen` 控制。
2. **`src/components/HoldingsTable.tsx`**：
   - 在標的展開列或操作按鈕群中新增「📊 全指標透視」快捷按鈕。
3. **`src/components/MuscleBookerWorkspace.tsx`**：
   - 在動能觀察標的之動作欄中新增「📊 全指標透視」按鈕。
4. **領域文檔同步與端到端驗收**：
   - 更新 `CONTEXT.md` 加入 Omni-Technical Indicator 術語。
   - 執行 `npm test`（確保原有 580+ 個測試與新測試全數通過）。
   - 執行 `npm run build`（確保 TypeScript 0 錯誤）。

## 驗收標準
- [ ] 在倉標的與動能雷達皆可一鍵呼叫彈窗並正常檢視。
- [ ] `npm test` 全數通過，`npm run build` 零錯誤。
