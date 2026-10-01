# 05 — 台股三大法人 T86 批次入庫與籌碼表持久化 (TWSE/TPEx T86 Institutional Ingestion)

**What to build:**
實作 `scripts/market-sync/ingest-tw-t86.cjs`。
抓取 TWSE `T86` 與 TPEx `t86` 官方三大法人買賣超日報（包含外資及陸資、投信、自營商）。
解析每檔標的之外資買賣超張數、投信買賣超張數、自營商買賣超張數與三大法人合計買賣超。
以批次事務寫入 `tw_institutional_chips` 資料表對應欄位，支援斷點或歷史回填。

**Blocked by:** 04 — 台股官方 TWSE/TPEx 收盤日 K 批次入庫

**Status:** completed

- [x] 支援從 TWSE 與 TPEx 官方下載三大法人買賣超全市場日報。
- [x] 準確解析外資、投信、自營商三方淨買賣張數並轉換為合法數值。
- [x] 寫入 `tw_institutional_chips`（若該日期已存在收盤日 K 則更新其法人欄位）。
- [x] 遇到官方未結算或假日空封包時安全退出並記錄日誌。
- [x] 單元測試 `src/engine/ingestTwT86.test.ts` 驗證 mock T86 封包解析與三大法人數值累計 100% 通過。
