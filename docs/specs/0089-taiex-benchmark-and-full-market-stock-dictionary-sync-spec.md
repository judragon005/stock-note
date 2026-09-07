# 規格文件：V8.9.0 台股加權指數 (TAIEX) Benchmark 全歷史日線與全市場股票字典補全

## 1. 任務背景與核心痛點

### 1.1 現況背景
目前系統具備資產追蹤、夏普值、Beta、Alpha 等量化與績效指標計算功能，並提供大盤基準（Benchmark）進行績效對比與疊圖。
同時，系統具備股票代碼與中文名稱解析引擎（`stockNameResolver.ts`）。

### 1.2 現存三大核心痛點
1. **大盤基準資料稀疏且缺乏加權指數 (TAIEX)**：
   - 現有 `benchmarkConstants.ts` 僅支援 `0050` 與 `SPY`。
   - `0050` 歷史收盤價在常數庫中僅有 48 個月半抽樣點（2024~2026 每月 1 號與 15 號），缺乏真實每日日線，無法支援長週期精確回測與量化對比。
   - 缺乏台灣投資人最核心的「加權指數 (^TWII)」基準。
2. **股票名稱字典覆蓋率不足**：
   - 目前 `src/data/stockDictionary.ts` 僅約 771 行（數百檔主流股），面對近期上市的新型 ETF（如 00400A、00401A 等主動型 ETF）、債券 ETF 或生僻上櫃標的，離線狀態下無法解析中文名稱，需依賴外部網路 OpenAPI 同步。
3. **外部高品質歷史數據庫未被充分利用**：
   - 使用者已於本機路徑 `D:\APP\諮詢\私人\股市\台股加權指數_歷史數據` 維護了更新至當前（2026-09-07）的完整數據集，包括 7,153 筆加權指數日線與 2,340+ 檔上市櫃股票清單，急需標準化導入以實現零網路依賴與極速載入。

---

## 2. 規格與架構設計

### 2.1 大盤加權指數 (TAIEX) 基準引擎升級
- **型別定義擴充**：
  在 `src/types/stock.ts` 中，將 `BenchmarkType` 擴充為：
  ```typescript
  export type BenchmarkType = '0050' | 'SPY' | 'TAIEX';
  ```
- **常數字典注入**：
  在 `src/engine/benchmarkConstants.ts` 中：
  - 新增 `TW_TAIEX_BENCHMARK_HISTORY: Record<string, number>`，完整收錄台股加權指數自 2020 年至今（或全歷史）每日收盤點位。
- **對齊與計算引擎擴充**：
  在 `src/engine/benchmarkData.ts` 中：
  - `getBenchmarkDailyPrices(type: BenchmarkType)` 新增 `'TAIEX'` 分支，回傳 `TW_TAIEX_BENCHMARK_HISTORY`。
  - 維持現有 `alignBenchmarkTimeSeries` 的 Forward-fill / Back-fill 與 `calculateNormalizedGrowth` 歸一化邏輯。

### 2.2 全市場合法股票字典升級
- **資料來源**：
  外部 `D:\APP\諮詢\私人\股市\台股加權指數_歷史數據\上市櫃股票與債券_歷史數據\TWSE_TPEx_stocks_summary.csv`。
- **資料清洗規範**：
  嚴格通過 `src/engine/stockDictionarySync.ts` 之 `isValidTaiwanSecurity` 驗證：
  - 排除短天期認購/售權證、牛熊證（03~08、7 開頭之 6 碼代碼）。
  - 排除 5 碼可轉債（非 00 開頭且第 5 碼為 1~9）。
  - 保留 4 碼股票、4 碼+特別股代號、00 開頭之所有 ETF（含主動式與債券 ETF）、02 開頭 ETN、91 開頭 TDR。
- **字典注入與去重**：
  - 與既有 `STATIC_TW_STOCKS` 進行代碼去重合併。
  - 將字典總量擴展至 2,340+ 檔標的，確保 100% 離線可用。

---

## 3. 測試驅動驗收標準 (Acceptance Criteria)

1. **AC-1 (Benchmark 型別與資料檢索)**：
   - `getBenchmarkDailyPrices('TAIEX')` 必須回傳非空的歷史收盤價字典。
   - 加權指數收盤點位包含最新日期（2026-09-07，收盤價 47326.27）。
2. **AC-2 (時間序列對齊與標準化)**：
   - 給定使用者投資組合日期陣列，`alignBenchmarkTimeSeries` 搭配 TAIEX 價格能正確對齊與無洞填補。
   - `calculateNormalizedGrowth` 能正確將 TAIEX 起始基準點歸一化為 100。
3. **AC-3 (股票字典全市場解析)**：
   - 隨機檢測新興主動型 ETF（如 `00400A` 主動國泰動能高息、`00403A` 主動統一升級50）與傳統標的（`2330` 台積電、`8299` 群聯），`resolveStockName` 均能在離線無快取狀態下 100% 正確解析出繁體中文名稱。
   - 字典內嚴禁包含任何已排除之認購售權證。
4. **AC-4 (系統健康度)**：
   - `npm test` 100% 通過（無回歸錯誤）。
   - `npm run build` TypeScript 0 錯誤。
