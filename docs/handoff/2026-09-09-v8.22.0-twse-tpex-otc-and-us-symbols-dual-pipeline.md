# v8.22.0 交接手冊：台股上櫃雙軌探測與美股特殊代碼容錯回補 (HANDOFF)

## 1. 本次迭代完成摘要 (Executive Summary)

- **核心目標**：
  修復在「肌肉書僮動能雷達」中輸入「6204 艾華」等上櫃股票時出現「查無標的」之 BUG，並強化美股特殊代碼（如 `BRK.B`、`BRKB`、`AAPL.US`）與台股主動型 ETF（如 `00403A`、`00981A`）之代碼解析、市場推斷與 Yahoo Finance 雙軌備援探測能力。
- **成果數據**：
  - 全專案 57 個測試套件、643 個單元測試 100% 綠燈通過。
  - `npm run build` TypeScript 型別檢查 0 錯誤，打包構建成功。

---

## 2. 關鍵架構與代碼變更清單 (File Changes)

1. **`src/engine/priceFetcher.ts`**：
   - 實作並導出 `inferMarketFromSymbol(rawInput)`：智能識別台股主動型 ETF、市場後綴與美股代碼。
   - 實作並導出 `getYahooCandidateSymbols(symbol, market)`：為台股產生上市櫃雙軌備援清單（如 `['6204.TWO', '6204.TW']`），為美股產生點號、連字號與連寫拆解備援（如 `['BRKB', 'BRK-B', 'BRK.B']`）。
   - 引入 `otcSymbolSet` 上櫃標的快取，達成 O(1) 瞬時查詢與循環依賴防護。
2. **`src/engine/historicalOhlcvBackfill.ts`**：
   - 將日 K 回補發送邏輯升級為候選遍歷重試：若首選代碼遭遇 404 或資料為空，自動切換至備援候選代碼重試。
3. **`src/data/stockDictionary.ts`**：
   - 將靜態字典中的 `6204O` 校正為純數字代碼 `6204`（艾華），使 `resolveOfficialSecurityName` 正確解析為繁體中文名稱。
4. **`src/engine/stockNameResolver.ts`**：
   - 擴充去除 `.TW`、`.TWO`、`.US` 等常見市場後綴之清理邏輯，確保中文化解析無死角。
5. **`src/components/MuscleBookerWorkspace.tsx`**：
   - 自訂標的加入即時分析時，採用 `inferMarketFromSymbol` 替換原本簡易的純數字正則判斷。
6. **測試套件**：
   - `src/engine/priceFetcher.test.ts`：新增候選清單產生、雙軌順序與美股格式驗證測試。
   - `src/engine/historicalOhlcvBackfill.test.ts`：新增 404 自動切換備援候選代碼之完整流程驗證。

---

## 3. 測試與驗證指標 (Verification & TDD)

- 單元測試指令：`npm test`（57 passed, 643 passed, 0 failed）
- 打包構建指令：`npm run build`（tsc 0 錯誤，Vite build 成功）

---

## 4. 關聯文檔

- 規格書：[`docs/specs/0103-twse-tpex-otc-and-us-symbols-dual-pipeline-spec.md`](docs/specs/0103-twse-tpex-otc-and-us-symbols-dual-pipeline-spec.md)
- 架構決策：[`docs/adr/0103-twse-tpex-otc-and-us-symbols-dual-pipeline.md`](docs/adr/0103-twse-tpex-otc-and-us-symbols-dual-pipeline.md)
- 本地票券：[`.scratch/v8.22.0-twse-tpex-otc-and-us-symbols-dual-pipeline/issues/`](.scratch/v8.22.0-twse-tpex-otc-and-us-symbols-dual-pipeline/issues/)
