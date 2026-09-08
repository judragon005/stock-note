# PRD 0097: 市場四柱在地持久化、雙動能百分比與採樣修復、肌肉書僮市場連動規格書

## 1. 背景與核心痛點

1. **痛點 1 (美股模式下肌肉書僮出現台股)**：
   - 頂部導航切換「US 美股」後，進入「肌肉書僮·動能雷達」，在倉持股依然包含台股，且「權值核心」按鈕寫死台股 50 大標的（台積電、聯發科等），無法滿足美股巨頭的短線箱體與扣抵雷達掃描需求。
2. **痛點 2 (雙動能加權分數 3714.0% 暴增與週期全相同)**：
   - `dualMomentumEngine.ts` 計算之滾動報酬率原本已乘以 100（即 `37.14%`），但 `WarRoomWorkspace.tsx` 渲染時又再次 `* 100`，導致 UI 呈現暴增百倍的 `3714.0%`。
   - 示範行情資料只有 5 筆日期點，引擎以固定日數取樣時，`idx = Math.max(0, len - 1 - days)` 全數退化為第 0 筆價格，導致 12M、6M、3M 報酬率 100% 一模一樣。
3. **痛點 3 (雙動能缺乏實務操作指引與個股龍頭池)**：
   - Gary Antonacci 原始模型為 ETF 資產池，但投資人實務需要「台股權值龍頭動能池」與「美股科技巨頭動能池」。
   - 缺乏「每月調倉窗口 (Monthly Rebalance Window)」與「在倉持股自動核對換倉提示」，易使使用者誤以為需每日頻繁交易。
4. **痛點 4 (市場四柱數據非真實且未持久化)**：
   - 目前「市場四柱即時脈搏」為前端靜態常數（Mock Data）。
   - 使用者期望在地持有化資料庫（Local Persistence），免除重複下載，具備歷史數據追溯與導出分析能力。

---

## 2. 規格細節與邊界條件

### 2.1 肌肉書僮市場連動 (Muscle Booker Market Scoping)
- `MuscleBookerWorkspace` 接收 `currentMarket: 'ALL' | MarketType`。
- `currentMarket === 'US'`：
  - 在倉持股過濾：`h.currency === 'USD'`。
  - 法人焦點標的：切換為美股成長焦點池（NVDA, AAPL, MSFT, TSLA, AMZN, GOOGL, META, AMD, AVGO, PLTR 等）。
  - 權值核心標的：按鈕切換為「🏛️ 美股巨頭 Top 50」，清單為美股 S&P 500 / 科技龍頭。
- `currentMarket === 'TW'`：
  - 在倉持股過濾：`h.currency === 'TWD'`。
  - 保留台股 Top 30 與台股權值 Top 50。
- `currentMarket === 'ALL'`：
  - 綜合展示兩市資產。

### 2.2 雙重動能百分比與採樣步長修正 (Dual Momentum Math Fix)
- 移除 UI 渲染的二次 `* 100`，使百分比忠實呈現 `37.1%` 等真實數值。
- 在歷史行情步長不足（如只有數個離散節點）時，採用自適應比例採樣（Adaptive Temporal Interpolation/Step），確保 3M、6M、12M 數據呈現真實階梯層次。

### 2.3 雙重動能資產池擴展與實戰指引 (Universes & Action Guidance)
- 新增兩大標的池：
  - `taiwan_blue_chips`：「台股權值巨頭動能池」（台積電 2330、聯發科 2454、鴻海 2317、廣達 2382、富邦金 2881、台達電 2308 等）。
  - `us_mega_tech`：「美股巨頭動能池」（NVDA, AAPL, MSFT, AMZN, GOOGL, META, TSLA）。
- UI 決策橫幅增強：
  - 顯示「距本月最後交易日尚有 X 天」調倉倒數。
  - 顯示在倉標的與動能冠軍的「持倉適配提示」（若持有非榜首則提示月結換倉評估）。

### 2.4 市場四柱在地持久化資料庫 (Market Pulse Local DB)
- 建立 `src/services/macroPulseStorage.ts`：
  - 使用 IndexedDB（或 LocalStorage 具備快取容量治理機制）儲存 `macro_pulse_records`。
  - 每筆快照結構包含：`date`, `us10y`, `us2y`, `yieldSpread`, `vix`, `vixLevel`, `fearAndGreedIndex`, `fearAndGreedLevel`, `goldPrice`, `oilPrice`, `dxy`, `usdToTwd`, `usM2GrowthYoY`, `source`, `updatedAt`。
- 提供自適應更新：若今日已有記錄，優先讀取本地資料庫，杜絕重複請求；提供手動刷新功能。
- 提供「歷史脈搏導出 (CSV/JSON)」與「過往數據歷史檢視」按鈕，讓使用者隨時離線調閱與分析。

---

## 3. 測試驗收準則 (Acceptance Criteria)

1. **AC-1**: 頂部切換為「US 美股」後，肌肉書僮「在倉持股」僅列出美股，「權值核心」切換為美股巨頭，絕不出現台股。
2. **AC-2**: 雙重動能排行榜之加權分數與 12M/6M/3M 報酬率格式正確，不再出現 3714.0% 之二次放大異常，且不同週期數值具備真實層次。
3. **AC-3**: 雙重動能可切換「台股權值巨頭」與「美股巨頭」動能池，且有明確的調倉倒數與在倉核對建議。
4. **AC-4**: 市場四柱具備本地持久化儲存，重新整理後數據能從本機讀取，並支援資料導出。
5. **AC-5**: 全專案單元測試 100% 通過，TypeScript 0 錯誤。
