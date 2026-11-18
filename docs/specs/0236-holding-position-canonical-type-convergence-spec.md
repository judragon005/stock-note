# Spec 0236: HoldingPosition 正統領域型別收斂與戰情室靜默斷路根除規格 (HoldingPosition Canonical Type Convergence & Silent Disconnection Elimination Spec)

## Problem Statement

在解決技術債 0059（`HoldingPosition` 擴展欄位型別收斂與雙重轉型氣味清理）的架構審計過程中，發現表面上的 `as unknown as` 雙重型別斷言問題，實際上掩蓋了一個更深層的**跨模組資料契約分裂（Split-Brain Schema）與運行時靜默斷路（Silent Property Disconnection）**缺陷：

1. **美股買進成本匯率在戰情室發生 100% 靜默斷路**：
   - 核心會計引擎計算並寫入 `HoldingPosition` 的唯一正統成本匯率欄位為 `avgCostFxRate`（含稅費與交易批次加權平均成本匯率）。
   - 然而，戰情室投組風控指標聚合模組卻透過 `as unknown as { avgExchangeRate?: number }` 讀取未在領域契約宣告的幽靈別名 `avgExchangeRate`，導致所有真實會計引擎產出的美股持倉流入戰情室時，該欄位永遠為 `undefined`，並靜默回退為寫死常數 `31.8`，造成「美股加權成本匯率 (`usWeightedCostFxRate`)」與「未實現匯差緩衝墊 (`usFxCushionTWD`)」長期失真。
2. **交易計畫欄位存在雙胞胎別名歧義**：
   - `HoldingPosition` 已正式定義 `plan?: TradePlan` 作為持股交易計畫的單一事實來源（SSOT），但戰情室晨報組裝器仍以 `h.plan || (h as unknown as { tradePlan?: ... }).tradePlan` 進行雙重轉型兜底，遷就過時的未定義別名 `tradePlan`，削弱靜態型別檢查與全域重構安全性。
3. **處置與注意股票事件陣列缺乏領域層正式契約與單向依賴邊界**：
   - 戰情室晨報組裝器透過 `as unknown as { dispositionEvents?: ... }` 讀取標的之處置/注意事件陣列並傳入處置視窗判定引擎。
   - `HoldingPosition` 並未正式宣告 `dispositionEvents` 欄位，且處置事件輸入型別 `DispositionEventInput` 目前棲身於計算引擎層，若直接由領域型別層反向引用引擎層，將違反單向依賴公理（領域層不應依賴引擎實作層）。

若僅依技術債 0059 原文表面建議在 `HoldingPosition` 補齊 `avgExchangeRate`、`tradePlan` 與 `dispositionEvents` 三個可選屬性，雖能讓編譯器安靜，卻會將「寫入 `avgCostFxRate`、讀取 `avgExchangeRate`」的運行時資料斷路永久合法化，並在核心持倉模型中製造永久性的雙胞胎同義欄位污染。

---

## Solution

執行 **「領域模型正統單一事實來源（Canonical SSOT）收斂與處置事件契約正式化」**：

1. **拒絕同義冗餘別名，強制消費者對齊生產者正統欄位**：
   - 嚴禁於 `HoldingPosition` 新增 `avgExchangeRate` 與 `tradePlan` 兩個冗餘別名欄位。
   - 戰情室投組指標聚合模組全面改用正統欄位 `h.avgCostFxRate`（保留缺省時之安全回退預設值），使會計引擎計算出的真實美股成本匯率 100% 無損貫通至戰情室匯差緩衝墊與加權匯率計算。
   - 戰情室晨報組裝器移除 `tradePlan` 雙重轉型兜底，統一直接讀取正統欄位 `h.plan`。
2. **提升處置事件型別至領域層並正式掛載於 `HoldingPosition`**：
   - 將處置與注意事件資料結構 `DispositionEventInput` 提升定義於領域型別核心層，並於 `HoldingPosition` 正式宣告可選屬性 `dispositionEvents?: DispositionEventInput[]`。
   - 原處置視窗計算引擎改為從領域型別層匯入並重新匯出（re-export）`DispositionEventInput`，確保現有引用路徑 100% 向後相容，同時維護「領域型別層零反向依賴」的純淨架構。
   - 戰情室晨報組裝器移除 `dispositionEvents` 雙重轉型，直接存取 `h.dispositionEvents ?? []`。
3. **同步更新領域詞彙表與技術債生命週期狀態**：
   - 於領域通用語言文件釐清 `HoldingPosition` 中 `avgCostFxRate`、`plan` 與 `dispositionEvents` 的正統術語邊界與禁用別名。
   - 將技術債 0059 標記為 `RESOLVED`，記錄架構審計發現之實質收斂決策。

---

## User Stories

1. As a US equity investor viewing the Macro War Room, I want my actual historical weighted-average purchase exchange rate (`avgCostFxRate`) computed by the accounting engine to flow into the War Room FX cushion and weighted cost FX rate calculations, so that my USD currency buffer is not distorted by a hardcoded `31.8` fallback.
2. As a portfolio risk manager, I want the War Room portfolio metrics calculation to seamlessly consume `HoldingPosition.avgCostFxRate` without relying on unsafe double type assertions, so that FX gain/loss breakdowns reflect true portfolio cost basis.
3. As a swing trader maintaining active stop-loss and take-profit targets on my holdings, I want the War Room tactical signal assembler to read my holding's canonical `plan` property directly, so that custom risk thresholds are never bypassed by mismatched alias lookups.
4. As a Taiwan equity trader monitoring regulatory controls, I want `HoldingPosition` to formally declare an optional `dispositionEvents` collection typed against the canonical `DispositionEventInput` contract, so that attention and disposition status checks are statically verified by the TypeScript compiler.
5. As a developer working across the War Room and accounting modules, I want all `as unknown as` double type assertions for `avgExchangeRate`, `tradePlan`, and `dispositionEvents` removed from War Room production code, so that refactoring any holding property triggers immediate compiler diagnostics across all consumers.
6. As a domain architect maintaining clean dependency boundaries, I want `DispositionEventInput` to live in the pure domain types layer and be re-exported by the disposition window engine, so that core domain entities never depend backward on engine implementation files.
7. As a developer writing tests for the disposition window engine, I want existing imports of `DispositionEventInput` from the engine module to remain 100% backward compatible, so that existing test suites and callers require zero breaking import rewrites.
8. As an AI agent or human contributor consulting the project's ubiquitous language glossary, I want the domain context documentation to explicitly forbid `avgExchangeRate` and `tradePlan` as deprecated aliases on holding positions, so that future features do not reintroduce split-brain field names.
9. As a technical lead tracking technical debt, I want Technical Debt 0059 updated with the canonical convergence resolution and marked as `RESOLVED`, so that the debt registry accurately reflects both the type cleanup and the runtime FX disconnection fix.
10. As a QA engineer verifying end-to-end data integrity, I want automated contract tests proving that a real US holding position with a non-default `avgCostFxRate` (e.g., `29.5` or `30.5`) and canonical `plan` / `dispositionEvents` produces exact War Room shield and signal outputs without any type casting.

---

## Implementation Decisions

1. **正統欄位收斂策略（Canonical Field Convergence）**：
   - 不擴充 `avgExchangeRate` 與 `tradePlan` 至 `HoldingPosition`，維持既有 `avgCostFxRate?: number` 與 `plan?: TradePlan` 為領域層唯一正統屬性。
   - 僅於 `HoldingPosition` 擴充唯一真正缺失的可選屬性：
     ```ts
     dispositionEvents?: DispositionEventInput[];
     ```
2. **型別歸屬與單向依賴邊界（Type Ownership & Acyclic Dependency）**：
   - 將 `DispositionEventInput` 定義提升至核心領域型別層，並由處置視窗判定引擎 re-export，保持向後相容且杜絕領域型別層反向依賴計算引擎層。
3. **戰情室消費端對齊（War Room Consumer Alignment）**：
   - 投組風控指標計算引擎讀取 `h.avgCostFxRate` 取代 `(h as unknown as { avgExchangeRate?: number }).avgExchangeRate`；保留既有缺省時回退 `31.8` 之防禦預設值。
   - 晨報訊號組裝器讀取 `h.plan` 與 `h.dispositionEvents ?? []`，徹底移除 `as unknown as` 雙重轉型。
4. **爆炸半徑控制（Blast Radius Control）**：
   - 僅修正生產代碼中與上述三個欄位相關的雙重轉型與直接對應測試；全庫其餘單元測試中用於建構精簡 mock 物件之 `as unknown as HoldingPosition` 屬於測試夾具簡化，不納入本次重構範圍。

---

## Testing Decisions

1. **測試原則（Testing Philosophy）**：
   - 僅針對公開函式介面縫隙（Test Seams）驗證外部可觀測行為（input -> output），不針對內部私有實作細節編寫脆性測試。
2. **測試縫隙與受測模組（Test Seams & Modules Under Test）**：
   - **縫隙一：戰情室投組風控純計算引擎（`calculateWarRoomPortfolioMetrics`）**
     - 驗證傳入具備真實 `avgCostFxRate`（非 `31.8` 預設值，如 `29.5`）之美股 `HoldingPosition` 時，回傳的 `shield.usWeightedCostFxRate` 精確等於加權後的成本匯率，且 `shield.usFxCushionTWD` 依該真實匯率與現時匯率差額計算，不再落入 `31.8` 常數陷阱。
   - **縫隙二：戰情室晨報持倉訊號組裝器（`assembleWarRoomHoldingSignals`）**
     - 驗證傳入具備正統 `plan`（含 `stopLossPrice`、`takeProfitPrice`）與 `dispositionEvents`（含生效中之 `DISPOSITION` / `ATTENTION` 事件）的 `HoldingPosition` 時，輸出的 `MacroHoldingSignalInput` 能精確反映 `stopLossPrice`、`targetPrice`、`planRiskStatus` 與 `dispositionStatus`。
   - **縫隙三：靜態型別與編譯安全檢查（TypeScript Compiler & Full Suite）**
     - 執行全專案 TypeScript 編譯檢查（0 錯誤）與既有單元測試套件（100% 通過，含處置視窗引擎與戰情室相關測試）。
3. **既有測試先例（Prior Art）**：
   - 參考現有戰情室投組指標測試套件與會計引擎匯率計算一致性測試（驗證 `avgCostFxRate` 產出）之結構與斷言風格。

---

## Out of Scope

- 不處理全庫其他測試檔案中為省略非必要欄位而使用的 `as unknown as HoldingPosition` 測試夾具重構（約 45 處測試 mock）。
- 不修改會計引擎計算 `avgCostFxRate` 的既有加權平均公式，亦不更動 `TradePlan` 既有欄位結構。
- 不實作從外部 API 自動抓取並寫入 `HoldingPosition.dispositionEvents` 的後端同步管線（本規格僅負責建立型別契約與戰情室消費端打通）。

---

## Further Notes

- 關聯技術債：`docs/debts/0059-holding-position-extended-fields-type-convergence.md`（實作完成後應更新為 `RESOLVED` 並同步更新技術債索引看板）。
- 前置架構脈絡：Spec 0235 宏觀戰情室 3.5 模組化解耦雙軸程式碼審查回饋。
