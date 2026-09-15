# 0135. 盤後同步彈窗包含塊陷阱修復與視窗邊界自適應規格 (Sync Status Badge Modal Containing Block Fix & Viewport Boundary Guard Spec)

- **狀態**：Approved
- **建立日期**：2026-09-15
- **負責 Agent**：Antigravity Agent
- **關聯 PRD / Spec**：[0132](0132-scheduled-market-sync-and-zero-latency-cache-spec.md), [0133](0133-header-sync-ux-redesign-and-settings-schedule-hub-spec.md), [0039](0039-tooltip-boundary-overflow-prevention-and-alignment.md)
- **關聯 GitHub Issue**：[#77](https://github.com/judragon005/stock-note/issues/77)
- **目標分支**：`fix/77-sync-status-badge-modal-overflow`

---

## 1. 需求背景與核心痛點 (Problem & Context)

在使用者點擊頂部狀態列的「盤後同步晶片」(`MarketSyncStatusBadge`) 開啟狀態詳情彈窗時，發現彈窗上半部（包含視窗標題、台股市場標題及關閉按鈕 `X`）超出瀏覽器視窗頂部邊界（Top Boundary Overflow），導致無法完整檢視內容，且無法點擊 `X` 按鈕關閉彈窗。

### 根因剖析 (Root Cause Analysis - First Principles)
1. **CSS 包含塊陷阱 (Containing Block Trap)**：
   - 依據 W3C CSS 規範，當祖先元素宣告了 `backdrop-filter`、`transform` 或 `filter` 時，該元素將作為其所有子孫元素（即使子孫元素宣告了 `position: fixed`）的唯一定位參照根節點（Containing Block）。
   - `MarketSyncStatusBadge` 位於 `<header className="glass-card">` 內部，而 `.glass-card` 在 `src/index.css` 定義了 `backdrop-filter: blur(16px)`。
   - 導致原本應相對於整個瀏覽器視窗 (Viewport) 定位的 Modal 遮罩層（`position: fixed; inset: 0`），被困在高度僅約 80px 的 Header 容器內。
2. **垂直居中計算導致負座標溢出**：
   - 彈窗卡片本體高度約 480px，當 Modal 在僅 80px 高度的 Header 容器內執行 `align-items: center` 時，卡片頂部被推擠至負座標（$Y \approx 40px - 240px = -200px$），直接溢出到螢幕可視範圍之外。
3. **缺乏視窗高度邊界約束**：
   - 彈窗本體缺少 `maxHeight` 與 `overflowY: auto` 約束，在較小解析度或縮放螢幕下容易發生縱向裁切。

---

## 2. 核心功能規格與架構設計 (Functional Specifications)

### 2.1 React Portal 渲染脫離 (DOM Portaling)
1. **掛載至根節點 (`document.body`)**：
   - 在 `MarketSyncStatusBadge.tsx` 中引入 React 原生 `createPortal`：
     ```tsx
     import { createPortal } from 'react-dom';
     ```
   - 將 Modal 遮罩與卡片結構透過 `createPortal(modalJSX, document.body)` 渲染至 `document.body` 頂層，徹底擺脫 Header 的 CSS 上下文與 Containing Block 拘束。
   - 提供 SSR / 環境安全保護：僅在 `typeof document !== 'undefined'` 且 `showModal === true` 時呼叫 `createPortal`。

### 2.2 視窗上下邊界防溢出自適應 (Boundary Overflow Protection)
1. **遮罩外層 (Modal Overlay Container)**：
   - `position: 'fixed'`, `inset: 0`, `zIndex: 1000`
   - `display: 'flex'`, `alignItems: 'center'`, `justifyContent: 'center'`
   - `padding: '24px 16px'`（確保上下兩端至少保留 24px 安全間隙）
   - `overflowY: 'auto'`（當螢幕高度極度狹窄時，整個遮罩層可自然滾動，絕不吃字）
2. **彈窗卡片本體 (Modal Content Card)**：
   - `maxHeight: 'min(90vh, 620px)'`（最高不超過螢幕視窗 90%）
   - `overflowY: 'auto'`（若內容超出則內部獨立出現平滑捲軸）
   - `margin: 'auto'`（在 flex 滾動容器內居中）

### 2.3 無障礙與鍵盤互動 (Accessibility & UX)
1. **鍵盤 ESC 快捷關閉**：
   - 在彈窗開啟期間註冊 `keydown` 事件監聽器：當使用者按下 `Escape` 鍵時，觸發 `setShowModal(false)` 關閉彈窗。
   - 元件卸載或彈窗關閉時自動清理事件監聽器。
2. **點擊外部背景關閉**：
   - 保持外層遮罩點擊關閉（`onClick={() => setShowModal(false)}`），內層卡片阻止事件冒泡（`e.stopPropagation()`）。

---

## 3. 模組與檔案變更清單 (File Manifest)

1. `src/components/MarketSyncStatusBadge.tsx`：
   - 引入 `createPortal` 將 Modal 傳送至 `document.body`。
   - 增加外層 `padding`、`overflowY: auto`，卡片 `maxHeight` 與 `overflowY: auto`。
   - 增加 `useEffect` 監聽 `Escape` 鍵關閉。
2. `src/components/MarketSyncStatusBadge.test.tsx`（或 `.test.ts`）：
   - 新增單元測試，驗證 Modal 渲染於 `document.body` 且具備正確的視窗自適應樣式與 ESC 鍵關閉機制。

---

## 4. 測試計畫與防禦性驗證 (Testing Plan)

1. **DOM 結構驗證**：
   - 驗證點擊徽章後，Modal 容器確實被渲染在 `document.body` 底下，而非 `<header>` 之內。
2. **樣式屬性驗證**：
   - 檢查 Modal Overlay 包含 `position: fixed`, `inset: 0`, `overflowY: auto`。
   - 檢查 Modal 卡片包含 `maxHeight` 與 `overflowY: auto`。
3. **互動驗證**：
   - 驗證點擊關閉按鈕 `X` 關閉彈窗。
   - 驗證點擊遮罩背景關閉彈窗。
   - 驗證按下鍵盤 `Escape` 鍵關閉彈窗。
4. **回歸測試**：
   - 執行 `npm test` 確保既有 100 個測試檔案 100% 綠燈通過。
   - 執行 `npm run build` 確保 TypeScript 編譯 0 錯誤。
