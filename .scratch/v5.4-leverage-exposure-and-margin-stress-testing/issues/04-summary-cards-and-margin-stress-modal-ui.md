# Issue #4: UI 整合（SummaryCards 淨槓桿卡片、MarginStressModal 模擬器與 HoldingsTable 持股天數）

## 任務目標
1. **SummaryCards 整合**：
   - 新增「淨槓桿率 (Net Leverage)」指標卡片，具備風險色階徽章與詳細計算公式懸停 Tooltip。
2. **MarginStressModal 實作**：
   - 打造極致視覺化動態壓力測試模擬器彈窗（$-50\% \sim 0\%$ 滑桿、維持率即時儀表盤、斷頭安全邊際與追繳補足金額逆運算計算機）。
   - 在 `LoanModal.tsx` 與總覽區提供一鍵開啟入口。
3. **HoldingsTable 擴充**：
   - 新增持股天數與策略週期膠囊標籤，滑鼠懸停顯示批次取得時序分佈。

## 驗收標準
- 介面文字 100% 繁體中文，所有金融指標均配置懸停說明浮窗 (Tooltip)。
- 滑桿拖曳時，維持率、風險警示燈與補繳金額毫秒級即時響應。
- `npm run build` TypeScript 0 錯誤。
