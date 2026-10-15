# Ticket 01: StockAnalysisWorkspace 徹底移除 StrategicPromptPanel 引用與 JSX 渲染

## 1. 任務目標
在 `src/components/analysis/StockAnalysisWorkspace.tsx` 中，徹底刪除 `StrategicPromptPanel` 的 import 語句與 JSX 節點渲染，將個股分析頁面的頂部空間還原給個股基本面指標。

## 2. 修改範圍
* `src/components/analysis/StockAnalysisWorkspace.tsx`:
  - 移除 `import { StrategicPromptPanel } from './StrategicPromptPanel';`
  - 移除第 667~669 行的 `<StrategicPromptPanel digest={strategicDigest} />`

## 3. 實作重點
* 保持現有版面其他區塊（如 Header、ETF 警示橫幅、8 大主題雙層側邊欄）完全不受影響。

## 4. 驗收標準 (AC)
- [ ] `StockAnalysisWorkspace.tsx` 中不再包含 `StrategicPromptPanel` 標籤。
- [ ] 本地編譯無 JSX 語法錯誤。
