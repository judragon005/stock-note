# PRD #0100: 肌肉書僮量化引擎徹底解耦、React Fast Refresh 規範化與開發代理異常防護規格書

## 1. 背景與痛點 (Problem Statement)

在專案演進至 V8.18.0 後，終端機與開發伺服器（Vite / esbuild）出現了兩類關鍵工程問題：
1. **React Fast Refresh 熱更新失效與頻繁整頁 Reload**：
   - `MuscleBookerWorkspace.tsx` 同時匯出了 React 元件、資料字典常數（`BEGINNER_TOOLTIPS`、`TW50_BLUE_CHIP_SYMBOLS` 等）以及量化運算函式（`scanMuscleBookerItem`）。
   - 根據 `@vitejs/plugin-react` 規範，包含非元件匯出時，HMR 無法安全進行元件級局部替換，強制觸發 `hmr invalidate` 並發出 `Could not Fast Refresh (export is incompatible)` 警告，嚴重損害開發體驗。
2. **Yahoo Finance 外部 API 網路波動污染終端機**：
   - 清晨或外部網路異常時，開發機遭遇 DNS 解析失敗 (`ENOTFOUND query1.finance.yahoo.com`) 或連線超時 (`ETIMEDOUT`)，因 `vite.config.ts` 的 http-proxy 未監聽 error 事件，導致未捕獲錯誤直接拋出在終端機。
3. **Markdownlint 格式不一致**：
   - 歷史任務票券與部分文檔存在標題與清單周圍空行缺失 (`MD022`, `MD032`) 及檔案結尾連續空行 (`MD012`)，影響 IDE 靜態檢查與文檔整潔。

---

## 2. 解決方案與架構設計 (Design & Architecture)

### 2.1 職責徹底解耦 (Separation of Concerns)
- **量化引擎專屬化** (`src/engine/muscleBookerEngine.ts`)：
  - 收攏所有純計算函式、標的池常數、小白百科字典與型別：
    - `AssetPoolType`、`ScannedStockItem`
    - `BEGINNER_TOOLTIPS`
    - `TW_TOP_30_FOCUS_SYMBOLS`、`US_TOP_30_FOCUS_SYMBOLS`、`TW50_BLUE_CHIP_SYMBOLS`、`US_MEGA_50_CORE_SYMBOLS`
    - `getScopedUniverseSymbols`、`generateSyntheticCandles`、`scanMuscleBookerItem`
- **UI 元件純淨化** (`src/components/MuscleBookerWorkspace.tsx`)：
  - 僅匯出 `MuscleBookerWorkspace` 元件及其 Props 介面，100% 滿足 React Fast Refresh 規範。
  - `WarRoomWorkspace.tsx` 與單元測試檔案統一自 `muscleBookerEngine` 匯入運算函式。

### 2.2 開發代理異常防護 (Proxy Error Handling)
- 於 `vite.config.ts` 中為 `/api/yahoo`、`/api/twse`、`/api/twse-www`、`/api/tpex` 註冊 `configure(proxy)` 錯誤處理器：
  - 當遭遇 `ENOTFOUND`、`ETIMEDOUT` 等網路故障時，優雅回應 `502 Bad Gateway`。
  - 觸發前端 `fetchWithCORSProxy` 的三層平滑降級機制（直連 ➔ 外部 CORS 代理池 ➔ 官方 OpenAPI 備援），終端機零紅字報錯。

### 2.3 文檔規範化 (Markdownlint Normalization)
- 依據 `MD022` 與 `MD032` 標準，於所有二級/三級標題與列表之間補齊空行。
- 移除多餘的連續空行 (`MD012`)。

---

## 3. 驗收標準 (Acceptance Criteria)

- [x] **AC-1**：`MuscleBookerWorkspace.tsx` 檔案不再匯出非元件常數，Vite HMR 儲存時無 `Could not Fast Refresh` 警告。
- [x] **AC-2**：外部網路中斷或 Yahoo Finance 無法解析時，Vite 開發代理優雅回應 502，終端機無未捕獲異常堆疊。
- [x] **AC-3**：Markdownlint 錯誤全量修復，IDE 診斷乾淨。
- [x] **AC-4**：單元測試 57 個檔案、624 個測試 100% 通過，`npm run build` TypeScript 0 錯誤。
