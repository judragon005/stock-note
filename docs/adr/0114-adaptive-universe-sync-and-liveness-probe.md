# 0114. 自適應動態成分股同步、開市前背景校準與存活探針架構 (Adaptive Universe Sync & Liveness Probe Architecture)

## 狀態
已接受 (Accepted)

## 關聯
- GitHub Issue: [#5](https://github.com/judragon005/stock-note/issues/5)
- 規格書: [docs/specs/0114-adaptive-universe-sync-and-liveness-probe-spec.md](docs/specs/0114-adaptive-universe-sync-and-liveness-probe-spec.md)
- 前序架構: [0113-muscle-booker-sync-hang-proxy-404-fast-fail-and-synthetic-fallback.md](0113-muscle-booker-sync-hang-proxy-404-fast-fail-and-synthetic-fallback.md)

---

## 背景與問題意識 (Context & Problem Statement)

在股票紀錄系統與肌肉書僮動能雷達中，臺灣 50 (`TW50_BLUE_CHIP_SYMBOLS`)、美股巨頭 50 (`US_MEGA_50_CORE_SYMBOLS`) 以及法人焦點 30 清單原採用寫死於程式碼之常數 (Hardcoded Constants)。

這導致三大維護痛點：
1. **成分股例行調整無法感知**：指數公司每季例行更換成分股時，系統無法動態感知，必須仰賴工程師修改程式碼並重新打包發布。
2. **下市或更名標的引發請求停滯**：當標的下市或更換代碼（如近期 Block Inc. 由 `SQ` 變更），靜態清單持續發起無效請求，造成 404 與卡頓。
3. **缺乏每日自動健康檢查與透明通知**：無每日開盤前的自動健康檢查，投資人無法掌握成分股最新異動狀況。

---

## 決策方案 (Decision)

採用 **「分級動態快取 (Stale-While-Revalidate) + 靜態種子兜底 + 存活探針 (Liveness Probe) + 每日開市前背景校準 + 輕量 Toast 提示」** 的分層架構：

1. **分級動態存儲 (`src/utils/storage.ts`)**：
   - 抽象 `getDynamicUniverseStorage(poolKey)` 與 `saveDynamicUniverseStorage(poolKey, data)`。
   - 資料結構包含 `symbols`, `lastCheckedDate` (YYYY-MM-DD), `version`, `inactiveSymbols` 與 `updatedAt`。
   - 優先讀取本地動態快取；若無快取則無縫回退至靜態種子常數（Baseline Seed），達成 0 延遲秒開首屏。

2. **自適應動態成分股引擎 (`src/engine/adaptiveUniverseEngine.ts`)**：
   - **後備候選池庫 (Reserve Candidates Pool)**：建立台股權值池 (`TW_RESERVE_CANDIDATES`) 與美股標普巨頭池 (`US_RESERVE_CANDIDATES`)。
   - **存活探針 (`probeSymbolLiveness`)**：對標的進行輕量探測，遇 HTTP 404 或資料損毀判定為失效。
   - **自動修復與遞補 (`healInactiveSymbolInPool`)**：自後備庫挑選未在庫/成分股之優質標的替換失效標的，維持總檔數滿編 (30 檔或 50 檔)。
   - **每日開市背景校準管線 (`checkAndSyncUniverseDaily`)**：整合 `holidayCalendar.ts` 判斷當日是否為交易日；若非強制且今日已檢查過，執行同日節流 (Throttling)；若偵測到失效標的則自動修復並產生繁體中文摘要。

3. **肌肉書僮工作區整合 (`src/components/MuscleBookerWorkspace.tsx`)**：
   - 掛載時背景非同步啟動 `checkAndSyncUniverseDaily`，完全不阻塞前端首屏渲染。
   - 若偵測到異動 (`hasChanges: true`)，彈出輕量浮動 Toast 提示通知使用者。
   - 頂部工具列標註成分股即時狀態（如 `🟢 官方成分股 (今日已校準)`），並提供「🔄 檢查官方成分股」手動校準按鈕。

---

## 結果與效益 (Consequences & Benefits)

- **免手動改碼**：成分股更換、下市或代碼變更時，由存活探針與自動修復管線自動替換遞補，系統自我演進演化。
- **冷啟動 0 延遲**：Baseline 靜態種子確保離線與初次載入時瞬間呈現。
- **交易日節流保護**：假日自動跳過，平日同日進入不重複發起遠端請求，杜絕觸發 API 風控。
- **透明視覺通知**：變更時右上方彈出輕量 Toast 告知使用者，兼顧寧靜與資訊透明度。
- **100% 綠燈驗證**：新增 10 項單元測試，全專案 61 個測試檔案 689 個測試 100% 通過，TypeScript 生產建置 0 錯誤。
