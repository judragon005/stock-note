# 03 — 台股快取頂層 date 補齊與空數據防清空守門員

**What to build:**
在 `sync-tw-market.cjs` 產出的 JSON payload 頂層明確補齊 `date: dateStr` 屬性，使前端快取徽章彈窗能夠正常顯示「資料日期」；同時加入空數據防清空守門員，若當日官方無行情數據（如非交易日），嚴禁覆蓋現有快取為 0 標的空檔。

**Blocked by:** 01 — 同步腳本路徑錨定 (廢除 process.cwd)

**Status:** ready-for-agent

- [ ] `tw_market_summary.json` 頂層具有 `date` 欄位（格式為 YYYY-MM-DD）。
- [ ] 當抓取標的數為 0 時，輸出提示並安全退出，不將現有快取覆蓋為 0 檔。
