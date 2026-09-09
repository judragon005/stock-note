# V8.16.0 交接手冊：市場四柱在地持久化、雙動能百分比與採樣修復、肌肉書僮市場連動

- **版本編號**：V8.16.0
- **對應 PRD**：[PRD 0097](file:///d:/APP/股票紀錄/docs/specs/0097-market-pulse-local-db-and-dual-momentum-refactor-spec.md)
- **對應 ADR**：[ADR 0097](file:///d:/APP/股票紀錄/docs/adr/0097-market-pulse-local-db-and-dual-momentum-refactor.md)
- **交付日期**：2026-09-08

## 交付概要
1. **肌肉書僮市場篩選與美股標的隔離 (Issue 01)**：
   - 修正美股模式下出現台股標的之缺陷。
   - `MuscleBookerWorkspace` 支援 `currentMarket`，美股模式下切換美股焦點 Top 30 與美股巨頭 Top 50，持股僅過濾美股標的。
2. **雙重動能百分比與採樣步長修復 (Issue 02)**：
   - 移除 UI 渲染的二次 `* 100`，徹底解決 `3714.0%` 百分比異常。
   - 引入少樣本自適應比例取樣，確保 3M、6M、12M 數據呈現真實階梯層次。
3. **雙重動能個股池擴展與月結調倉指引 (Issue 03)**：
   - 新增「台股權值巨頭動能池」與「美股科技巨頭動能池 (Magnificent 7)」。
   - UI 增設「📆 距月結調倉窗口倒數」與在庫持股適配指引，杜絕日內雜訊頻繁換倉。
4. **市場四柱在地持久化資料庫 (Issue 04)**：
   - 建立 `src/utils/macroPulseStorage.ts`，支援本地時間序列資料庫儲存。
   - 支援離線直接讀取過往快照、一鍵 CSV 匯出供外部資料分析、即時同步與過往歷史資料表格展開檢索。

## 測試覆蓋
- 全專案 57 個測試檔案、614 項單元測試 100% 綠燈通過。
- `npm run build` (`tsc && vite build`) 0 錯誤通過。
