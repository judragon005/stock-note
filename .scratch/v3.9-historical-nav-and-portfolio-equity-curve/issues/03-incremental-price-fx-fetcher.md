# 03 — 歷史日 K 與匯率增量抓取器 (Incremental Daily Price & FX Sync Fetcher)

**What to build:** 實作歷史收盤價與 USD/TWD 匯率的 API 抓取邏輯。能比對本地快取的「最早與最後日期」，僅針對缺漏日期區間發送請求（增量更新），並具備防頻率限制（Rate Limiting）與錯誤優雅容錯。

**Blocked by:** 02 — 本地歷史行情持久化儲存庫

**Status:** ready-for-agent

- [ ] 實作 `fetchSymbolHistory(symbol, market, startDate, endDate)`，支援台股 (TWSE/FinMind/Yahoo) 與美股 (Yahoo/FMP)
- [ ] 實作 `fetchFxHistory(startDate, endDate)`，獲取 USD/TWD 歷史日匯率
- [ ] 比對本地快取現有數據，僅下載缺漏日期（增量同步）
- [ ] 撰寫單元測試並 Mock 網路請求，驗證增量同步無多餘 fetch
