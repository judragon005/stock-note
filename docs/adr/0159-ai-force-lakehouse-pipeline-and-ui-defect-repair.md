# ADR 0159: 主力戰情室台股湖倉管線貫通、淘汰假數據污染與 UI 缺陷修復 (Spec 0159)

- **狀態**：`ACCEPTED`
- **日期**：2026-10-02
- **決策者**：judragon005, Antigravity Agent
- **關聯規格**：[SPEC-0159](../specs/0159-ai-force-lakehouse-pipeline-and-ui-defect-repair-spec.md)
- **關聯 Issue**：[Issue #147](https://github.com/judragon005/stock-note/issues/147)

---

## 背景與問題意識 (Context)

在進行台股標的查詢時（如 2886 兆豐金），使用者遭遇「明明昨天 16:00 已執行盤後同步，但主力戰情室卻顯示日 K 線短缺」的嚴重異常。經排查發現四項結構性缺陷：
1. **排程同步範圍不對等**：每日 16:00 之 `sync-tw-market.cjs` 僅更新單日快取總表，未將台股收盤日 K 與 T86 三大法人買賣超寫入本地 SQLite 數據湖倉，導致 SQLite 內台股日 K 筆數為 0。
2. **前後端 API 脫節**：前端歷史日 K 回補優先請求外部 Yahoo Finance，未將 Vite 原生 Connect API (`/api/market/history/:symbol`) 設為第一優先級。
3. **退避假數據矛盾污染**：`createDefaultAiForceReport` 在查無日 K 時，硬編碼填入了 `47.97 開盤 / 1,200 張量 / 30 日筆數` 等幽靈數據，但 K 線陣列為 `[]`，造成頂部顯示「資料筆數 30 日」、下方主 K 線圖卻顯示「尚無歷史交易日 K 數列」之嚴重撕裂。
4. **介面存在假按鈕與無響應元件**：「下載全部圖表 PNG」為純 Toast Mock，主 K 線圖右上角 `<MoreVertical />` 按鈕無 `onClick` 響應。

---

## 決策內容 (Decisions)

1. **台股同步寫入 SQLite 閉環 (Lakehouse TW Ingestion)**：
   - 在 `sync-tw-market.cjs` 中引入 `saveTwQuotesToSqlite` 與 `saveTwT86ToSqlite`，將當日全市場收盤 K 線與法人籌碼事務寫入 `daily_candles` 與 `tw_institutional_chips`。
   - 擴充 `backfill-local-csv.cjs` 提供 `saveTwHistoryToSqlite`，將台股全市場歷史 CSV 日 K 批量灌入 SQLite。
2. **戰情室前端優先直連本地湖倉 (Lakehouse-First Loading)**：
   - 於 `historicalOhlcvBackfill.ts` 建立 Layer 1 最高優先級：優先調用 `loadSymbolHistoryFromLakehouse(symbol, market)` 請求 `/api/market/history/:symbol?limit=250`。成功取得（>= 5 根）後直接回傳並非同步沉澱至 IndexedDB，達到 0 延遲秒讀。
3. **徹底清理 Fallback 假數據，落實誠實 Empty State**：
   - 全面移除 `createDefaultAiForceReport` 中寫死的 1200/3100/30 等數值。若標的查無歷史日 K，`dataPointsCount` 誠實回傳 `0`，量價指標安全回退為 `undefined` 或即時價，與主 K 線圖 Empty State 100% 協同一致。
4. **實裝「下載全部圖表 PNG」實體匯出**：
   - 於 `exportReportPipeline.ts` 實作 `triggerAllChartsDownload(symbol)`，遍歷所有卡片 SVG 圖表，透過 `XMLSerializer` 與 Canvas 序列化轉為高解析度 PNG 批次觸發實體下載。
5. **修復主 K 線圖右上角選單**：
   - 為 `<MoreVertical />` 綁定 Popover 互動選單，支援「重設為 60D 週期」與「切換為量能副圖」等實用操作。

---

## 決策後果 (Consequences)

### 正面效益 (Positive)
- **歷史日 K 秒讀不中斷**：台股標的（如 2886 兆豐金、2330 台積電）在戰情室能瞬間自本地 SQLite 湖倉載入 60~250 根完整日 K 與均線，徹底終結「日 K 線短缺」誤報。
- **真數據透明誠實 (Real Data Transparency)**：徹底杜絕幽靈假數據，頂部統計與主 K 線圖視覺狀態完全協同。
- **全量測試與打包驗證**：全專案 162 個測試套件、1,332 個測試案例 100% 綠燈，`npm run build` 0 錯誤。
