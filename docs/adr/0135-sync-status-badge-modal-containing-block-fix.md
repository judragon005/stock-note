# 0135. 盤後同步彈窗包含塊陷阱修復與視窗邊界自適應架構決策 (Sync Status Badge Modal Containing Block Fix)

## 狀態 (Status)
已批准 (Approved)

## 上下文 (Context)
在使用者點擊頂部狀態列的「盤後同步晶片」(`MarketSyncStatusBadge`) 開啟狀態詳情彈窗時，發現彈窗上半部（包含視窗標題、台股市場標題及關閉按鈕 `X`）超出瀏覽器視窗頂部邊界，導致無法完整檢視內容，且無法點擊 `X` 按鈕關閉。

### 根因分析
1. **CSS 包含塊陷阱 (Containing Block Trap)**：
   `MarketSyncStatusBadge` 位於 `<header className="glass-card">` 內部，而 `.glass-card` 在 `src/index.css` 定義了 `backdrop-filter: blur(16px)`。根據 W3C 規範，任何包含 `backdrop-filter` 的元素會為所有子孫元素（即使設置 `position: fixed`）建立新的 Containing Block，導致 Modal 遮罩層被限制在僅約 80px 高度的 Header 內。
2. **垂直居中導致負座標溢出**：
   卡片高度約 480px，在 80px 容器內執行 `align-items: center` 時，卡片頂部被推至負座標 ($Y \approx -200px$)，衝出螢幕頂部。

## 決策 (Decision)
1. **使用 React Portal 渲染 (`createPortal`)**：
   在 `MarketSyncStatusBadge.tsx` 中引入 `import { createPortal } from 'react-dom';`，將 Modal 遮罩層直接傳送至 `document.body` 頂層，徹底脫離 Header 容器的 CSS 上下文。
2. **視窗邊界防溢出約束 (`MODAL_VIEWPORT_STYLES`)**：
   - 遮罩外層：`padding: 24px 16px`, `overflowY: auto`。
   - 彈窗卡片：`maxHeight: min(90vh, 620px)`, `overflowY: auto`, `margin: auto`。
3. **無障礙鍵盤支援 (ESC 快捷鍵)**：
   註冊鍵盤事件監聽器，支援按下 `Escape` 鍵關閉彈窗，並在卸載或關閉時釋放監聽。

## 影響 (Consequences)
- **正面影響**：
  - 彈窗在任何螢幕解析度與縮放比下皆能精準水平垂直居中，標題與 `X` 按鈕清晰可見可點。
  - 符合 KISS 原則，不污染 `App.tsx` 狀態，保持元件高內聚性。
  - 101 個測試檔案（953 個測試）100% 綠燈通過，TypeScript 0 報錯。
