# 11 — 自訂生活費邊界防禦與全景回歸驗證 (Budget Guardrails & E2E System Verification)

**Parent:** https://github.com/judragon005/stock-note/issues/542

**What to build:**
在 `DividendCalendarCard` 中為自訂每月生活費輸入框增加數值範圍邊界守衛（NT$ 1,000 ~ NT$ 1,000,000），並提供清空或非法輸入時的安全回退，杜絕覆蓋率計算出現 `NaN%`。同時執行全量回歸測試套件（覆蓋 Spec 0230 的 11 大 User Stories），確保全系統 289+ 測試檔案 100% 通過、TypeScript 0 錯誤、Lint 零警告。

**Blocked by:** 01 — 歷史發放月時序因果屏障門禁, 02 — 權值與週期股夏秋常態慣性庫擴充, 03 — 金融事件除息日自然鍵防撞去重協定, 04 — 全域持股同態幾何收縮中樞, 05 — 質押借貸利息帳戶過濾水密隔離, 06 — SSOT 應收股利與月度長條圖數據同源融合, 07 — 法定跨境稅制水密艙隔離, 08 — 未到期預約款項券商對帳單防漏門禁, 09 — 季配與月配股利年化 YOC 尺度校準, 10 — 歷史外幣折合台幣匯率快照穿透

**Status:** ready-for-agent

- [ ] 在 `DividendCalendarCard` 的 `handleCustomSubmit` 增加數值邊界防禦（clamp 於 1,000 ~ 1,000,000），輸入非法或空值時防禦回退
- [ ] 驗證生活費輸入極端值或空字串時，覆蓋率永遠維持有效數值，不崩潰為 `NaN%`
- [ ] 執行全量 `npm test`，確保 289+ 測試檔案全數綠燈通過
- [ ] 執行 `npm run build`，確保 TypeScript 0 錯誤與 Production Bundle 產出無誤
