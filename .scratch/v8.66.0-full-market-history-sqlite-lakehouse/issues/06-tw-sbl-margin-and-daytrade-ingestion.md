# 06 — 台股借券賣出 SBL、信用交易與當沖資料入庫 (TW SBL, Margin & Day Trade Ingestion)

**What to build:**
實作 `scripts/market-sync/ingest-tw-extended-chips.cjs`。
從 TWSE 官方開放資料抓取：
1. `TWT93U`：每日借券賣出與還券餘額表，提取標的之借券賣出當日餘額 (`sbl_balance`)。
2. `MI_MARGN`：融資融券彙總表，提取標的之融資餘額 (`margin_balance`) 與融券餘額 (`short_balance`)。
3. `TWTB4U`：當日沖銷交易標的及統計，提取當沖比率 (`day_trade_rate`)。
將上述深度法人與散戶槓桿指標批次回寫至 `tw_institutional_chips` 對應欄位。

**Blocked by:** 05 — 台股三大法人 T86 批次入庫與籌碼表持久化

**Status:** ready-for-agent

- [ ] 支援批次抓取 TWSE `TWT93U`、`MI_MARGN` 與 `TWTB4U` 官方資料。
- [ ] 準確解析借券賣出餘額、融資餘額、融券餘額與當沖百分比。
- [ ] 更新 `tw_institutional_chips` 該交易日之擴展籌碼欄位。
- [ ] 支援數據缺失時以 `0` 或前日餘額平滑填補。
- [ ] 單元測試 `ingest-tw-extended-chips.test.cjs` 驗證擴展籌碼解析與資料庫持久化 100% 綠燈。
