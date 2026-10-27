# 0205 Spec: 第一梯隊高性價比架構技術債清理與精實重構規格書

## 1. 概述與元數據 (Overview & Metadata)

* **規格編號：** Spec 0205
* **標題：** 第一梯隊高性價比架構技術債清理與精實重構 (Technical Debt Batch 1: Guardrails, Compound Timeout, Component Decomposition, and Style Cleanup)
* **關聯 Issue：** #336 (https://github.com/judragon005/stock-note/issues/336)
* **關聯技術債：** 
  - [技術債 0047](file:///d:/APP/股票紀錄/docs/debts/0047-pre-push-guard-docs-integrity-linter-integration.md) (Pre-push Guard 整合文檔完整性)
  - [技術債 0052](file:///d:/APP/股票紀錄/docs/debts/0052-default-fetch-json-compound-abort-signal.md) (defaultFetchJson 雙重信號複合支援)
  - [技術債 0053](file:///d:/APP/股票紀錄/docs/debts/0053-eight-quarter-statement-table-style-constants-extraction.md) (EightQuarterStatementTable 樣式常數抽取)
  - [技術債 0054](file:///d:/APP/股票紀錄/docs/debts/0054-war-room-quick-calibration-modal-decomposition.md) (WarRoomWorkspace 快速校準 Modal 解耦)
* **關聯架構決策：** [`docs/adr/0205-technical-debt-batch-1-guardrails-and-lean-refactoring.md`](file:///d:/APP/股票紀錄/docs/adr/0205-technical-debt-batch-1-guardrails-and-lean-refactoring.md)
* **規格狀態：** `APPROVED`
* **版本：** V1.0
* **建立日期：** 2026-10-27

---

## 2. 背景與問題陳述 (Problem Statement)

專案在高速迭代至 V9.01.0 (Spec 0204) 後，累積了 4 項屬於「第一梯隊」的高投資報酬率、零破壞性架構技術債：

1. **文檔死鏈守門未自動化 (技術債 0047)**：
   - 目前 `scripts/verify-docs.cjs` 具備 620+ 份文檔與 Spec/ADR 的 100% 完整性校驗能力，但尚未掛入 `scripts/pre-push-guard.cjs`，導致開發者若遺漏手動執行 `npm run lint:docs`，可能引入死鏈或未成對的文檔。
2. **單一 HTTP 請求取消與超時無法兼顧 (技術債 0052)**：
   - 在 `scripts/market-sync/backfill-tw-history-web.cjs` 與 `sync-tw-market.cjs` 的 `defaultFetchJson` 中，當傳入 `options.signal` 時，會直接覆蓋 20 秒逾時保護。若遠端官方伺服器連線掛起且使用者未手動點擊取消，請求將無限期停滯。
3. **戰情室巨石元件資料泥團與過度重渲染 (技術債 0054)**：
   - Spec 0204 快速實作的 10 秒校準 Modal，在 `WarRoomWorkspace.tsx`（2,200+ 行）頂層散落了 8 個獨立的 `useState` (`calibUs10y`, `calibUs2y`, `calibVix` 等)。使用者在表單內每次鍵盤輸入，都會引發全戰情室頂層重渲染，存在嚴重的 Fowler「Data Clumps」異味與效能隱患。
4. **財務三表重複內聯樣式宣告 (技術債 0053)**：
   - `EightQuarterStatementTable.tsx` 橫向比對 8 季財務數據時，大量重複宣告內聯樣式物件，不利於代碼維護與單元隔離。

---

## 3. 核心設計原則 (Core Design Principles)

* **KISS 原則 (Keep It Simple, Stupid)**：拒絕引入第三方狀態庫或重型微服務，採用原生 JavaScript/TypeScript 與 React 最佳實踐。
* **零回歸保證 (Zero Regression)**：所有修改保持對外公開介面與行為 100% 向下相容，既有單元測試完全綠燈。
* **狀態自治與下沉 (State Colocation)**：表單臨時編輯狀態完全封閉於 Modal 內部，徹底杜絕外層父元件無效重渲染。
* **向後相容防禦 (Backward-Compatible Defense)**：網路層信號複合檢測 `AbortSignal.any` 特性，提供無縫降級兜底。

---

## 4. 詳細功能與架構規格 (Functional Specifications)

### 4.1 技術債 0047: Pre-push Guard 整合文檔守門
在 `scripts/pre-push-guard.cjs` 加入步驟 3 執行文檔完整性與死鏈守門驗證：
```javascript
// 3. 執行全量文檔完整性與死鏈守門驗證 (Spec 0178 / 技術債 0047)
console.log('🔍 [3/4] 執行文檔完整性與死鏈守門驗證 (npm run lint:docs)...');
execSync('node scripts/verify-docs.cjs', { stdio: 'inherit' });
console.log('  ✅ 文檔完整性與成對性 100% 通過！');
```

### 4.2 技術債 0052: defaultFetchJson 複合信號支援
在 `scripts/market-sync/backfill-tw-history-web.cjs` 與 `scripts/market-sync/sync-tw-market.cjs` 中實作信號複合：
```javascript
const timeoutSignal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined;
let signal;
if (options.signal && timeoutSignal && typeof AbortSignal.any === 'function') {
  signal = AbortSignal.any([options.signal, timeoutSignal]);
} else {
  signal = options.signal || timeoutSignal;
}
```

### 4.3 技術債 0054: WarRoomWorkspace 快速校準 Modal 抽取
1. 建立獨立純展示/自治元件 `src/components/warRoom/MacroQuickCalibrationModal.tsx`。
2. 定義表單狀態介面 `MacroCalibrationFormState`：
```typescript
export interface MacroCalibrationFormState {
  us10y: string;
  us2y: string;
  vix: string;
  fearAndGreedIndex: string;
  twFuturesNetOi: string;
  twMarginMaintenance: string;
  creditSpreadOAS: string;
  cdsInsuranceIndex: string;
}
```
3. Modal 接收 `isOpen`, `onClose`, `initialSnapshot`, `onSave`，表單輸入完全自治，點擊「儲存」時輸出更新後的 `MacroIndicatorSnapshot`。
4. `WarRoomWorkspace.tsx` 移除 8 個 `calib...` State 與 200 行內聯 JSX 表單，直接引用 `<MacroQuickCalibrationModal />`。

### 4.4 技術債 0053: EightQuarterStatementTable 樣式常數與展示子儲存格抽取
1. 抽取靜態樣式常數 `TABLE_CELL_STYLES`。
2. 將重複出現的數值儲存格與徽章邏輯封裝為純展示儲存格輔助函式/元件，精簡主表格 JSX 體積。

---

## 5. 驗收標準 (Acceptance Criteria)

1. `scripts/pre-push-guard.cjs` 包含 `node scripts/verify-docs.cjs` 且全數通過。
2. `defaultFetchJson` 支援 `options.signal` 與逾時雙重複合，並通過專屬單元測試驗證。
3. `MacroQuickCalibrationModal.tsx` 獨立運作，`WarRoomWorkspace.tsx` 行數精簡且 0 測試回歸。
4. `EightQuarterStatementTable.tsx` 消除重複樣式物件宣告。
5. 全專案 `npx tsc --noEmit` 0 錯誤，`npm test` 100% 綠燈通過。
6. `docs/debts/README.md` 看板將 0047, 0052, 0053, 0054 標記為 `RESOLVED`。
