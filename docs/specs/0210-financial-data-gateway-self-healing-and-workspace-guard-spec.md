# 產品需求規格書 (PRD)：Spec 0210 — 金融數據網關入境淨化、快取自愈與工作區安全氣囊 (Financial Ingestion Gateway, Self-Healing & Workspace Guard)

## Problem Statement

宏觀戰情室 3.0 在連線與真實後端交互時，發生未捕獲致命例外：
```text
Uncaught Error: Objects are not valid as a React child (found: object with keys {symbol, price, prevClose, changePercent, ma20, ma60, bias20Ma, above20Ma, above60Ma}). If you meant to render a collection of children, use an array instead.
```
從長期金融軟體架構檢視，本質原因為以下三大系統性缺陷交疊：
1. **後端合約命名衝突 (Contract Collision)**：後端行情聚合引擎在回傳標量指標時，使用 ES6 簡寫將包含 9 個技術指標的完整 Quote 物件賦值給了根屬性 `dxy` 與 `vix`，破壞了前後端約定的純數值合約。
2. **前端缺乏入境海關淨化 (Unsanitized Ingestion Boundary)**：前端向後端拉取 API 時採用 `...prev, ...remote` 盲目展開，導致物件污染覆蓋了原本的純數值欄位；且被污染的物件已持久化至使用者的 `localStorage`，形成重開網頁時的連環炸彈。
3. **金融系統缺乏故障隔離 (Missing Workspace Fault Isolation)**：整站缺乏 Error Boundary。當輔助決策的戰情室圖表渲染異常時，直接拖垮整棵 React 樹，使投資人無法使用核心的記帳、持倉與交易功能。

## Solution

依據第一性原理與極簡原則（KISS），實施**「後端合約收斂 + 單一入境網關自愈 + 前端標量守門 + 25 行工作區安全氣囊」**的四重防禦：
1. **後端源頭合約收斂**：在 `ingest-macro-sentiment.cjs` 中，根屬性 `dxy`、`vix`、`gold` 強制輸出為標量數值（`?.price ?? null`），完整 Quote 實體物件統一歸入 `quotes` 內部。
2. **單一入境海關與自愈清洗**：在 `macroPulseStorage.ts` 建立 `toFiniteNumber()`，自動拆解任何意外流入的行情物件取出 `.price`，並自動修復瀏覽器 LocalStorage 舊有殘留的髒數據。
3. **前端 API 強制過海關**：`WarRoomWorkspace.tsx` 在接收遠端 API 資料時，強制通過 `sanitizeMacroRecord(remote)` 後才寫入 State，並在 JSX 標量渲染處進行保護。
4. **極簡工作區安全氣囊**：撰寫無外部依賴的標準 React `<WorkspaceErrorBoundary>`，包裹各主要活頁，確保局部渲染異常絕不波及交易與帳本底座。

## User Stories

1. As an active trader, I want the War Room to seamlessly consume live and cached macro indicators without crashing, so that I can reliably read market pulse data.
2. As a user with previously corrupted LocalStorage records, I want the application to automatically self-heal and clean corrupted caches on boot, so that I never get locked out by historical cache bugs.
3. As an investor performing trades and reviewing account balances, I want an unexpected rendering failure in a secondary macro card to be gracefully isolated with a "Retry / Reset Cache" recovery card, so that my core trading log and cash ledger are never interrupted.
4. As a software engineering team, we want clear boundaries between raw ticker quote entities and macro scalar metrics, preventing key collisions in future API expansions.

## Implementation Decisions

- **Decision 1 (Backend Contract Hygiene)**:
  `scripts/market-sync/ingest-macro-sentiment.cjs` 的 `fetchFullMacroWarRoomPulse` 回傳物件中，根欄位 `dxy` 與 `vix` 固定為 `?.price ?? null` 純數字，Quote 物件留於 `quotes` 內，不污染頂層標量。
- **Decision 2 (Gateway Coercion & Self-Healing)**:
  `src/utils/macroPulseStorage.ts` 的 `sanitizeMacroRecord` 導入 `toFiniteNumber(val, fallback)`，無論傳入的是合法數字、`{ price: number }` 行情物件還是 `NaN`，皆能純化為合法有限數字。
- **Decision 3 (Frontend State Gatekeeping)**:
  `src/components/WarRoomWorkspace.tsx` 中兩處呼叫 `/api/market/macro` 的回呼，一律使用 `sanitizeMacroRecord(remote)` 淨化後再 `setMacroSnapshot`，徹底隔絕未預期的後端欄位。
- **Decision 4 (Workspace Fault Isolation)**:
  新增 `src/components/common/WorkspaceErrorBoundary.tsx`（約 25 行標準 React 類別組件），於 `src/App.tsx` 活頁切換處包覆，遭遇未捕獲渲染異常時提供重試與重置快取按鈕。

## Testing Decisions

- **Test Seam**:
  在 `src/components/WarRoomWorkspace.test.tsx` 補充自動化自愈測試：
  1. 將含有完整 Quote 物件 `{ symbol: 'DX-Y.NYB', price: 104.2, ... }` 的惡意/舊版資料寫入 `localStorage`。
  2. 呼叫 `renderToStaticMarkup` 驗證其自動解包出純數值，正常顯示 `104.2`，不拋出任何 React Child 錯誤。
  3. 驗證 `<WorkspaceErrorBoundary>` 能在子組件拋錯時正常呈現降級 UI，而不影響其餘部分。
- **Regression Guarantee**:
  確保 `npm test`（1,972+ 測試）全數通過，`npm run build` 打包 0 錯誤。

## Out of Scope

- 重構其他無關分頁（如個股分析、FIRE 模擬）。
- 引入重量級外部 Schema 校驗庫（如 Zod）。

## Further Notes

- 全程遵循繁體中文規範、TDD 紅-綠-重構循環與 KISS 原則。

