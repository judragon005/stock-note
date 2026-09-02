# 02 — 主流券商範本庫與交易指紋去重比對模型 (brokerTemplates.ts & tradeDeduplicator.ts)

**What to build:**
1. **券商範本與指紋庫 (`src/engine/brokerTemplates.ts`)**：
   - 內建國泰證券、富邦證券、永豐大戶投、元大證券、Firstrade、Charles Schwab、IB 盈透之預設欄位映射。
   - 實作 Header 欄位特徵評分演算法 (`detectBrokerTemplate`)，自動推斷上傳檔案對應之券商。
   - 支援 LocalStorage 儲存與讀取自訂映射範本 (`customBrokerTemplates`)。
2. **交易指紋智慧去重模型 (`src/engine/tradeDeduplicator.ts`)**：
   - 建立複合鍵指紋：`date_market_symbol_type_shares_price`。
   - 比對現有資料庫交易，將解析出的交易標記為 `NEW`、`DUPLICATE` 或 `INVALID`。
   - 支援三種匯入合併策略：`SMART_MERGE` (僅追加全新)、`OVERWRITE` (全量覆蓋)、`APPEND_ALL` (強制全部追加)。

**Blocked by:** Issue 01

**Status:** completed
**Triage:** `ready-for-agent`

- [x] 實作 `src/engine/brokerTemplates.ts` 與券商指紋匹配器
- [x] 實作 `src/engine/tradeDeduplicator.ts` 與去重演算法
- [x] 撰寫 `brokerTemplates.test.ts` 與 `tradeDeduplicator.test.ts`
