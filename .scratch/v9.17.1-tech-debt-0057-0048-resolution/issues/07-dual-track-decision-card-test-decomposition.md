# 07 — 拆分建立獨立之第三鏡頭 A/B 雙軌決策測試檔 (ZavyDualTrackDecisionCard.test.tsx)

**What to build:** 建立 `src/components/zavy/ZavyDualTrackDecisionCard.test.tsx` 獨立測試檔，專責驗證第三鏡頭 A 軌景氣擴張持股水位、5 檔耐受度 Pills 切換、B 軌防彈衣/SRR/30x 本金進度與質押還款建議橫幅。

**Blocked by:** 03 — Zavy 工作區渲染層拔除 inline 計算改委託純函式

**Status:** ready-for-agent

- [x] 建立 `src/components/zavy/ZavyDualTrackDecisionCard.test.tsx`
- [x] 驗證 A 軌景氣順風期持股建議與 5 檔風險耐受度互動切換
- [x] 驗證當前實際持股與建議持股上限並列對比、質押還款建議橫幅與設質鎖定標籤
- [x] 驗證 B 軌資產配置偏離度、防彈衣股息活水轉向、30x FIRE 目標與 SRR 減幅指標
- [x] 確保單元測試獨立執行綠燈
