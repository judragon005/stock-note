# 規格文件 0186：美股歷史回補透明度透視、斷點庫存對齊與 Windows EPERM 韌性強化 (Spec 0186)

## 1. 概述與背景 (Context & Problem Statement)

在版本 v8.81.0 (Spec 0168) 實裝的「台美雙軌零 CSV 背景全歷史回補」管線中，使用者在設定排程中心觸發「60 交易日」全市場回補時，介面卡片呈現：
- **🇹🇼 台股收盤日 K 筆數**：`137,559 筆`（含 59 個交易日歷史日 K，累計命中快取＋新增總數）
- **🏛️ 三大法人籌碼記錄**：`132,917 筆`（歷史累積籌碼總數）
- **🇺🇸 美股採集標的**：`0 檔`

此顯示結果使使用者產生「美股完全未回補或採集失敗」的強烈疑慮。經深層第一性原理分析與資料庫真實狀態查驗，發現兩大架構缺陷：

1. **統計口徑嚴重不對齊（非對稱語意盲區）**：
   - 台股軌道以「日期驅動（Date-Driven）」，累計了 60 天所有日期的日 K 總筆數（`backfillStatus.tw.totalQuotes`）。
   - 美股軌道以「標的驅動（Symbol-Driven）」，卡片綁定 `backfillStatus.us.successCount`，其語意僅代表「**當次執行過程中由網路新採集成功的增量檔數**」。
   - 當日稍早已成功完成 1,448 檔同步，觸發斷點續傳（Checkpoint）判定全部略過；當次僅剩 3 檔遭遇空資料，增量計數為 0，導致「在庫已有 1,448 檔 38 萬筆日 K」，前端卻向用戶呈現 `0 檔`。
2. **Windows 平台檔案重命名 `EPERM` 系統鎖定**：
   - 美股管線在最後輸出 `public/market-cache/us_market_summary.json` 時，呼叫 `saveJsonAtomic` 執行 `fs.renameSync(tempPath, targetPath)`。
   - 在 Windows 環境下，若 Vite Dev Server、檔案監控者或編輯器正在讀取目標檔，`fs.renameSync` 會拋出不可預期的 `EPERM: operation not permitted`，導致程序捕獲異常並中斷回傳物件。

---

## 2. 業務價值與核心原則 (Business Value & Core Principles)

1. **湖倉與斷點在庫透明性 (Lakehouse & Checkpoint Transparency)**：
   - 介面展示必須反映「**真實在庫有效標的數**（或在庫覆蓋度，如 `1,448 檔在庫`）」，徹底消除使用者對「美股沒抓到」的誤解。
2. **極致效能與 KISS 原則 (High Performance & Simplicity)**：
   - 查詢美股在庫標的數優先走 `sync_checkpoints` 索引查詢（< 5ms），避免高成本的 `daily_candles` 全表掃描（> 200ms）。
3. **作業系統檔案鎖定防禦 (Windows File Lock Resilience)**：
   - `saveJsonAtomic` 採用具備重試與安全回退（Safe Overwrite / copyFileSync + unlinkSync）之防禦性機制，杜絕 Windows `EPERM` 崩潰。

---

## 3. 系統不變性定理 (System Invariants)

1. **數據語意對齊定理 (Metric Semantics Invariant)**：
   - 全回補狀態物件 `backfillGlobalStatus.us` 必須同時提供 `successCount`（當次增量）、`totalInLakehouse`（在庫總標的數）與 `skippedCount`（略過已在庫數）。
   - 前端面板美股卡片應優先展示在庫總有效標的數（例如：`1,448 檔 (已在庫)` 或 `本次新增 X 檔 / 在庫 1,448 檔`），保持與台股累積筆數同一認知維度。
2. **原子寫入冪等抗鎖定理 (Atomic Write Lock-Free Invariant)**：
   - 在任何作業系統（特別是 Windows）下，若 `fs.renameSync` 因鎖定遭遇 `EPERM` 或 `EBUSY`，必須在 100ms 內自動進行至少 3 次退避重試，若仍受阻則安全降級為直接覆寫，確保快取檔案 100% 寫入成功且不拋出致命例外。

---

## 4. 詳細技術規格 (Technical Specifications)

### 模組 1：`saveJsonAtomic` 增加 Windows `EPERM` 退避與安全回退
- **檔案**：`scripts/market-sync/market-sync-core.cjs`
- **邏輯重構**：
  ```javascript
  function saveJsonAtomic(targetPath, data) {
    const dir = path.dirname(targetPath);
    ensureDirSync(dir);
    const tempPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    
    // Windows EPERM / EBUSY 退避重試與安全覆寫
    let renamed = false;
    for (let i = 0; i < 5; i++) {
      try {
        fs.renameSync(tempPath, targetPath);
        renamed = true;
        break;
      } catch (err) {
        if (err.code === 'EPERM' || err.code === 'EBUSY') {
          // 少量同步自旋休眠
          const end = Date.now() + 30;
          while (Date.now() < end) {}
        } else {
          break;
        }
      }
    }
    
    if (!renamed) {
      try {
        fs.copyFileSync(tempPath, targetPath);
        fs.unlinkSync(tempPath);
      } catch (e) {
        // 最終保底直接寫入目標檔
        fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
        try { fs.unlinkSync(tempPath); } catch {}
      }
    }
  }
  ```

### 模組 2：美股全回補狀態與斷點透視擴充
- **檔案**：`scripts/market-sync/backfill-full-market-history.cjs`
- **邏輯重構**：
  在 `runFullMarketHistoryBackfill` 美股軌道中：
  - 查詢 SQLite `sync_checkpoints` 獲取當前美股 `SUCCESS` 在庫標的總數。
  - 將其賦予 `backfillGlobalStatus.us.totalInLakehouse`。
  - 即使當次增量 `usRes.successCount === 0`，亦能正確暴露整體在庫量。

### 模組 3：前端回補控制面板 UI 語意透視化
- **檔案**：`src/components/MarketScheduleHubSection.tsx`
- **呈現升級**：
  - 將「🇺🇸 美股採集標的」卡片數字調整為：若 `totalInLakehouse > 0` 顯示 `${totalInLakehouse} 檔`，若有當次新增則標註 `(+${successCount} 新增)`；若在庫為 0 則顯示 `successCount` 檔。
  - 增加副標註：`⚡ 快取/斷點在庫 ${totalInLakehouse} 檔`，避免使用者誤解。

---

## 5. 測試計畫與驗證清單 (Test Plan)

1. **單元測試 (`market-sync-core.test.ts`)**：
   - 驗證 `saveJsonAtomic` 在面對暫時性鎖定時能安全覆寫成功。
2. **整合測試 (`MarketScheduleHubSectionBackfill.test.tsx`)**：
   - 驗證當 `us.successCount === 0` 但 `us.totalInLakehouse === 1448` 時，UI 正確渲染 `1,448 檔` 並標註已在庫。
3. **回歸驗證**：
   - 執行 `npm test` 確保 100% 通過。
   - 執行 `npm run build` 確保 TypeScript 0 錯誤。
