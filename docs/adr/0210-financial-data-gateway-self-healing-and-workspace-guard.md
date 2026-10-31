# ADR 0210: 金融數據海關自愈管道與戰情室安全護欄架構 (Financial Data Gateway Self-Healing and Workspace Guard)

- **狀態 (Status)**: 已接受 (Accepted)
- **日期 (Date)**: 2026-10-31
- **關聯規格 (Spec)**: [docs/specs/0210-financial-data-gateway-self-healing-and-workspace-guard-spec.md](file:///d:/APP/股票紀錄/docs/specs/0210-financial-data-gateway-self-healing-and-workspace-guard-spec.md)
- **關聯 Issue**: Issue #359

---

## 背景與問題陳述 (Context & Problem Statement)

在宏觀戰情室 V3.0 (`MacroWarRoom V3`) 整合跨市場傳導與 Yahoo/FinMind/FMP 總體情緒數據管線時，系統發生致命崩潰：
1. **行情物件污染標量 (Quote Object vs. Scalar Collision)**:
   在後端中介層 `scripts/market-sync/ingest-macro-sentiment.cjs` 中，ES6 物件簡寫 `{ dxy, vix }` 誤將含有 `{ symbol, price, prevClose, ... }` 的完整 Yahoo 行情字典注入至宏觀快照的 `dxy` 與 `vix` 屬性。當前端 `WarRoomWorkspace.tsx` 直接在 JSX 渲染 `{macroSnapshot.dxy}` 時，觸發 React 致命崩潰：`Objects are not valid as a React child`。
2. **舊快照污染持續性 (Storage Persistence Leak)**:
   受到污染的物件被前端寫入 `localStorage['STOCK_TRACKER_MACRO_PULSE_HISTORY_V1']`。即使修復後端，使用者重整瀏覽器時讀取 LocalStorage 快取仍會持續崩潰。
3. **單點故障擊穿全應用 (Single Point of Failure)**:
   宏觀戰情室內部任何子元件未受 Error Boundary 局部隔離，一旦拋出未捕獲異常即導致整頁黑畫面，使使用者無法進行任何其它操作。

---

## 決策核心 (Decision Drivers)

- **KISS 與第一性原理**: 拒絕過度工程化，採用簡潔、直接的「邊界海關守衛 (Ingestion Gateway)」與「局部異常隔離 (Workspace Error Boundary)」。
- **雙向自愈能力 (Dual Self-Healing)**: 不僅後端輸出純標量，前端讀取快取與接收 API 時均須自動解包 `.price`，確保舊污染數據無需使用者手動清空即可自動修復。
- **高可用性與零黑屏 (Zero Black-Screen)**: 金融軟體最核心防禦在於「數據異常時局部降級，主系統永不停機」。

---

## 架構變更 (Architecture Changes)

### 1. 後端數據網關標量防禦 (`scripts/market-sync/ingest-macro-sentiment.cjs`)
- 將行情字典物件重新命名為專屬鍵值（如 `dxyQuote`, `vixQuote`, `soxQuote`）。
- 根層級宏觀指標 `dxy`, `vix`, `goldPrice`, `oilPrice` 強制收斂為純浮點數標量：
  ```javascript
  dxy: typeof dxy?.price === 'number' ? dxy.price : null,
  vix: typeof vix?.price === 'number' ? vix.price : null,
  ```

### 2. 前端海關過濾器自愈解包 (`src/utils/macroPulseStorage.ts`)
- 實作極簡標量轉換器 `toFiniteScalarNumber(val, fallback)`：
  - 若 `val` 本身為合法有限數值，直接返回。
  - 若 `val` 為物件且包含 `.price`（如歷史污染殘留），自動提取 `val.price`。
  - 其餘非法型態一律返回安全回退值。
- 在 `sanitizeMacroRecord` 中全量套用至 `dxy`, `vix`, `goldPrice`, `oilPrice`, `tenYearYield` 等指標。

### 3. JSX 渲染安全標量守衛 (`src/components/WarRoomWorkspace.tsx`)
- 在直接渲染 DOM 節點處增加標量安全校驗：
  ```tsx
  <div className="mono font-semibold text-slate-200">
    {typeof macroSnapshot.dxy === 'number' ? macroSnapshot.dxy.toFixed(2) : '--'}
  </div>
  ```

### 4. 戰情室專用工作區隔離邊界 (`src/components/common/WorkspaceErrorBoundary.tsx`)
- 建立輕量化 (80 行內) React Class 錯誤邊界元件：
  - 局部隔離 `<WarRoomWorkspace />`，攔截所有未預期渲染錯誤。
  - 提供友善的警示卡片與「重置快取並重試 (Clear Cache & Retry)」一鍵修復按鈕。
  - 確保導航欄、頁面切換等主應用架構 100% 正常運作。

---

## 驗證結果 (Verification & Status)

1. **單元測試與回歸防禦**:
   - `src/utils/macroPulseStorage.test.ts` (10 tests passed)
   - `src/components/common/WorkspaceErrorBoundary.test.tsx` (3 tests passed)
   - `src/components/WarRoomWorkspace.test.tsx` (5 tests passed)
2. **全量測試套件覆蓋 (TDD/Regression)**:
   - 265 個測試檔案、1,978 個單元測試 100% 綠燈通過。
3. **生產構建驗證**:
   - `npm run build` 通過，TypeScript 0 錯誤，Vite 7.52s 打包完成。

