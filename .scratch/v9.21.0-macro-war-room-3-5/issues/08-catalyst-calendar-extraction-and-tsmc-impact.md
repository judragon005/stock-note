# 08 — 催化劑日曆抽離與無條件台積電除息點數估算

**Parent:** #584 (Spec 0235)

**What to build:** 將催化劑倒數日曆、三段時序雷達、分類篩選與新增自訂事件 Modal 抽離為 `CatalystCalendarCard` 子元件；針對「持股除息/法說」類型卡片掛載點擊檢視技術面入口；解耦 `exDividendImpactPoints` 計算，即使投資人自身未持有 `2330` 個股，只要催化劑存在台積電除息事件亦能預警對加權指數之蒸發點數。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `CatalystCalendarCard` 獨立運作，完整保留三段時序雷達、自訂新增/刪除與重置功能
- [ ] 含個股代號之除息/法說卡片支援點擊開啟技術面檢視
- [ ] 未持有 `2330` 時仍能估算並顯示台積電除息對大盤蒸發點數預警
- [ ] 元件測試通過
