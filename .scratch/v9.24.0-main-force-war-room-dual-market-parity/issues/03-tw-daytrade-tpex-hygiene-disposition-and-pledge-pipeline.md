# 03 — 台股當沖 (TWTB4U)、TPEx 歷史防污染、處置狀態與董監質押管線修復

**Parent:** #592 (Spec 0239)
**What to build:** 修復 TWSE 現股當沖 `TWTB4U` 解析器使其支援 `rawData.tables[0].data` 結構，徹底解決本地湖倉 `day_trade_rate` 全庫 0% 為 `NULL` 的故障；禁止歷史回補將 TPEx OpenAPI 當日快照錯誤寫入過去歷史日期，並於上櫃 T86/資券/估值解析器統一剝除 `O` 尾綴；擴充遠端除權息備援支援上櫃 `.TWO`；將台股注意/處置股票狀態與上市櫃董監質押接通生產同步流程。
**Blocked by:** 01 — 單例快取中介層、含點號代碼路由 (BRK.B)、財報雙向欄位契約與 meta 復用
**Status:** ready-for-agent

- [ ] `parseTwseDayTrade` 能正確解析真實 TWSE `TWTB4U` 回傳之 `tables[0].data`（並相容舊 `data` 結構），入庫後 `tw_institutional_chips.day_trade_rate` 非空覆蓋達有效門檻。
- [ ] 執行歷史日期回補時，TPEx OpenAPI 不再將最新一日快照複寫進歷史日期；上櫃標的（如 `8299`、`00679B`）於法人、資券、估值均以正規無 `O` 代碼一致存取。
- [ ] 遠端除權息備援對上櫃標的在 `.TW` 無結果時自動回退嘗試 `.TWO`。
- [ ] 生產同步與追趕管線實際調用台股注意/處置狀態標記與上市櫃董監質押同步，取代僅存在於單元測試之空轉狀態，且異常不再被空 `catch {}` 靜默吞噬。
