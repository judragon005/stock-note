# 0114. 自適應動態成分股引擎、每日開市前背景校準與存活探針規格書 (Adaptive Universe Sync & Liveness Probe Spec)

## 1. 問題意識與背景需求 (Problem Statement)

在股票紀錄與肌肉書僮動能雷達中，現行臺灣 50 (`TW50_BLUE_CHIP_SYMBOLS`)、美股巨頭 50 (`US_MEGA_50_CORE_SYMBOLS`) 以及焦點 30 清單均採用靜態程式碼常數（Hardcoded Constants）。

此設計面臨三大實務缺陷：
1. **成分股例行替換無感知 (Routine Index Rebalancing Blindness)**：
   - 臺灣指數公司每季（3、6、9、12 月）審核調整 0050 成分股，美股標普亦動態調整成分股。代碼無法自動演進，每次變動均需工程師人工修改程式碼並重發 Release。
2. **下市與改名引發停滯 (Delisting / Ticker Change Stagnation)**：
   - 當個股下市、被收購或更換交易代碼（如近期 Block Inc. 由 `SQ` 變更），靜態清單將持續發起無效請求，引發 404 與卡頓風險。
3. **缺乏每日自動健康檢查與透明通知 (Lack of Pre-Market Health Check & Notifications)**：
   - 系統缺乏每日開市前的自動校準機制，且成分股若有變動，投資人無法在介面上直觀獲得清晰的通知反饋。

---

## 2. 核心架構與解決方案 (Proposed Architecture)

採用 **「Stale-While-Revalidate 動態快取 + 每日開市前背景校準 + 存活探針」** 架構：

### 2.1 分級儲存與靜態種子兜底 (Tiered Storage & Seed Baseline)
1. **靜態種子層 (Baseline)**：保留代碼現有之常數作為冷啟動與離線保底種子，保證進入雷達時 **0 延遲秒開**。
2. **本地持久層 (IndexedDB / LocalStorage: `MB_DYNAMIC_UNIVERSE_CACHE`)**：
   - 儲存結構包含：目標池類型 (`poolId`)、標的陣列 (`symbols`)、最後校準日期戳記 (`lastCheckedDate`)、版本號以及失效標的黑名單。
   - 提供 `getDynamicUniverse(market, pool)` 與 `saveDynamicUniverse(market, pool, items)` 抽象介面。

### 2.2 每日開市前背景自動檢查管線 (Daily Pre-Market Auto-Check Pipeline)
1. **觸發條件**：
   - 當進入動能雷達工作區時，檢查 `lastCheckedDate` 是否早於今日日期（YYYY-MM-DD）。
   - 結合 `holidayCalendar.ts` 判斷當日是否為開盤日。若今日尚未校準，啟動背景非同步檢查任務，完全不阻塞前端首屏渲染。
2. **官方清單與後備庫動態對齊**：
   - **台股**：整合現有 `stockDictionarySync.ts` 與 TWSE OpenAPI 官方成分股清單，比對現有 TW50 與台股焦點清單是否有新增/剔除標的。
   - **美股**：維護動態候補庫（如 S&P Top 100 候選池），當偵測到前 50 或 30 權值名單有異動時動態調整。

### 2.3 存活探針與自動修復 (Liveness Probe & Auto-Healing)
1. **存活健康檢驗**：
   - 每次背景同步或日 K 回補時，若標的連續回傳 HTTP 404（代碼不存在或已下市），存活探針將該標的標記為 `STATUS: INACTIVE`。
2. **無縫遞補機制**：
   - 系統自動從候補清單（Reserve Pool）中挑選最高權值/熱門之有效標的填補空缺，維持 Top 30 / Top 50 的滿編數量。
   - 自動將修正後的清單持久化寫入本地快取，**無需工程師修改程式碼或重新部署**。

### 2.4 輕量提示通知與視覺化狀態 (Lightweight Toast & UI Indicator)
1. **輕量提示通知 (Toast Notification)**：
   - 當背景檢查完成且「偵測到成分股自動替換或官方同步異動」時，畫面右上方彈出輕量通知：
     - *範例：`🔔 已自動完成成分股校準：剔除下市標的 [SQ]，自動遞補 [PYPL] 並同步至最新清單。`*
   - 若成分股無異動，則背景靜默完成，不干擾使用者操作。
2. **頂部狀態工具列**：
   - 在雷達狀態列標註目前成分股狀態：`🟢 官方成分股 (今日已校準)`。
   - 提供「🔄 檢查官方成分股」手動點擊按鈕，方便投資人盤中隨時手動刷新。

---

## 3. 模組職責拆解與介面設計 (Module Breakdown)

### 3.1 `src/engine/adaptiveUniverseEngine.ts`
- `checkAndSyncUniverseDaily(force?: boolean): Promise<UniverseSyncResult>`
  - 主入口：檢查是否需要每日校準，執行官方清單比對與存活探針。
- `probeSymbolLiveness(symbol: string, market: MarketType): Promise<boolean>`
  - 輕量探針：透過 HEAD 或快速 query 檢驗標的是否有效。
- `getEffectiveUniverse(market: MarketType | 'ALL', pool: AssetPoolType): ScannedUniverseItem[]`
  - 核心獲取介面：優先讀取本地持久化動態清單；若無則回退至靜態種子。

### 3.2 `src/utils/storage.ts` / IndexedDB
- 新增 `getDynamicUniverseStorage` 與 `saveDynamicUniverseStorage`。

### 3.3 `src/components/MuscleBookerWorkspace.tsx`
- 掛載時非同步調用 `checkAndSyncUniverseDaily`。
- 若 `syncResult.hasChanges === true`，觸發輕量 Toast 通知並即時更新目標池標的。

---

## 4. 測試驅動開發驗證清單 (TDD Verification)

1. **快取讀取與種子回退測試 (`adaptiveUniverseEngine.test.ts`)**：
   - 本地無快取時，應 100% 讀取靜態種子清單作為 Baseline。
   - 本地有快取時，應優先讀取最新動態清單。
2. **每日開市前校準節流測試**：
   - 同一日多次進入，不重複發起遠端校準請求。
   - 跨日或呼叫 `force=true` 時，正確觸發背景校準任務。
3. **存活探針剔除與遞補測試**：
   - 模擬某標的返回 404 時，探針應正確將其自有效名單除名，並自候補清單遞補新標的，總檔數維持不變。
4. **通知觸發驗證測試**：
   - 驗證當成分股有更更動時，回傳之 `hasChanges` 為 `true` 且附帶變更摘要。
5. **全專案回歸測試**：
   - `npm test` 100% 綠燈，`npm run build` TypeScript 0 錯誤。
