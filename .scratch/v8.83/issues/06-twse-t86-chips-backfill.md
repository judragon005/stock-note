# Ticket 06: TWSE 上市股票三大法人籌碼 (T86) 批次採集與追趕回補 (Spec 0170)

## 1. 任務核心 (Core Objective)
修復並執行 `sync-tw-market.cjs` 與 `ingest-tw-t86.cjs`，補齊 2026-10-05 至 2026-10-07 期間全市場上市權值股（如台積電 2330、0050、聯發科 2454 等）缺失的 T86 三大法人買賣超與信用交易。

## 2. 目標檔案 (Target Files)
- `scripts/market-sync/sync-tw-market.cjs`
- `scripts/market-sync/ingest-tw-t86.cjs`
- `scripts/market-sync/ingest-tw-extended-chips.cjs`

## 3. 具體修復內容 (Refactoring Details)
1. 檢查並確保 `parseTwseT86BulkData` 產出的對照表正確映射至 TWSE 19 欄欄位：
   - 外陸資買賣超：`row[4]`
   - 投信買賣超：`row[10]`
   - 自營商買賣超：`row[11]`
   - 單位換算：除以 1000 轉換為張數。
2. 針對缺失的歷史日期（2026-10-05、2026-10-06、2026-10-07），以日期參數調用 `runTwMarketSync(dateStr)` 依序執行追趕回補。
3. 寫入信用交易 (MI_MARGN)、借券 (TWT93U) 與當沖率 (TWTB4U)。

## 4. 驗收標準 (Acceptance Criteria)
- [ ] 執行補齊後，台積電 `2330` 與元大台灣50 `0050` 在 `tw_institutional_chips` 中的最新日期更新至 **2026-10-07**。
- [ ] 10/05~10/07 的籌碼筆數從原本殘缺的 901 筆恢復為正常覆蓋的 2,200+ 筆。
