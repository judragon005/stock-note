# 01 — 處置股票起訖日期有效視窗判定純函式

**What to build:** 
實作處置股票之有效日期區間檢驗純函式 `isDispositionActive(event, referenceDate)`。解析 TWSE 處置公告之 `start_date` 與 `end_date`（格式如 `YYYY-MM-DD` 或 `YYYY/MM/DD`），並以基準日（不帶時分秒之純日期）比對是否滿足 `start_date <= referenceDate <= end_date`。若起訖日格式異常或已逾期，一律安全回傳 `false`。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 支援 `YYYY-MM-DD` 與 `YYYY/MM/DD` 之日期格式正規化解析
- [ ] 當 `referenceDate` 介於 `start_date` 與 `end_date` 之間（含端點）時回傳 `true`
- [ ] 當 `referenceDate` 晚於 `end_date` 時回傳 `false`（過期失效）
- [ ] 當 `referenceDate` 早於 `start_date` 時回傳 `false`（尚未生效）
- [ ] 單元測試 100% 覆蓋邊界情境與跨月/閏年情境
