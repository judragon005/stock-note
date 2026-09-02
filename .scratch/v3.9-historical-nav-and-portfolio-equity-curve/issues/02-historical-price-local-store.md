# 02 — 本地歷史行情持久化儲存庫 (Historical Price Local Store & Forward-Fill)

**What to build:** 實作基於 IndexedDB / LocalStorage 的本地歷史價格與匯率存取庫，提供 `getHistoricalPrices(symbol)`、`saveHistoricalPrices(symbol, data)`，並內建遇週末、國定假日與休市日自動「向前補齊（Forward Fill）」之無縫補值演算法。

**Blocked by:** 01 — 歷史日 K 與資產模型型別定義

**Status:** ready-for-agent

- [ ] 實作 `HistoricalPriceStore` 支援讀寫各標的歷史每日收盤價與歷史 USD/TWD 匯率
- [ ] 實作 `forwardFillPrices(dateList, priceMap)`，確保休市或假日自動延用上一交易日收盤價
- [ ] 撰寫單元測試覆蓋多標的儲存、讀取與假日 Forward Fill 邏輯
- [ ] 單元測試 100% 通過
