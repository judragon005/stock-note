# 02 — 注意股票最新交易日有效性判定純函式

**What to build:** 
實作注意股票之單日有效判定純函式 `isAttentionActive(event, referenceDate)`。注意股票不同於連續處置盤，屬於單日盤後警示。比對公告日 `event_date` 是否等於 `referenceDate`（或前一營業日）。若事件日期為 2 日以上之歷史紀錄，自動判定過期並回傳 `false`。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 比對 `event_date` 與 `referenceDate` 是否落在當前交易日有效視窗
- [ ] 歷史已過期之注意股票事件自動回傳 `false`
- [ ] 支援格式異常容錯防護（如日期為空字串或 null 時安全回傳 `false`）
- [ ] 單元測試 100% 覆蓋
