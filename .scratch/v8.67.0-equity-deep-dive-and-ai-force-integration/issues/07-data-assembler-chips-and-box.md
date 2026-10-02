# 07 — 本地湖倉數據裝配器：三大法人籌碼與箱體防線

**What to build:** 
在 `src/engine/equityDeepDiveAssembler.ts` 實作籌碼與技術防線裝配純函式 `assembleChipsAndBoxData(institutionalRecords, muscleBox)`。聚合近 20 日外資、投信、自營商買賣超累計（張數與方向）、融資水位增減變化，以及近 60 日關鍵箱底（防守支撐）與箱頂（突破防線）。

**Blocked by:** 05 — 7 步投研資料契約與型別定義

**Status:** ready-for-agent

- [ ] 正確加總近 20 個交易日三大法人合計買賣超
- [ ] 判定法人主力行為屬性（如「外資連續買超吃貨」、「投信倒貨結帳」）
- [ ] 整合箱底與箱頂價格，計算當前價格距箱底支撐與箱頂壓力之百分比
- [ ] 單元測試 100% 覆蓋
