# 11 — 操作管線閉環（透視金流週期連動、帳戶篩選器、隱私遮罩）

**What to build:**
修復多項阻斷使用者體驗的操作管線缺陷：
1. 將「透視金流」按鈕自風控 MDD 卡片移至正確的「累計投入本金」卡片，並連動當前選取之時間範圍（1M/1Y/ALL）傳入 XIRR 彈窗，實現週期精準折現。
2. 打通頂部券商帳戶篩選器 (`selectedAccountId`) 與 NAV 計算的連動，支援檢視單一帳戶與合併全帳戶資產成長。
3. 頂部工具列新增 `[ 👁️ 隱私遮罩 (Incognito Mode) ]`，一鍵將全頁敏感金額（總資產、市值、本金）替換為 `NT$**,***,***`，方便社群曬單與覆盤分享。

**Blocked by:** Ticket 07, Ticket 10

**Status:** DONE

- [x] 將「透視金流」按鈕移入「累計投入本金」卡片右上角，點擊時將當前選中之 `timeRange` 傳入金流檢視器
- [x] 傳遞 `selectedAccountId` 篩選參數至 `calculateHistoricalNavSeries`，過濾 trades、cash、loans
- [x] 實作 `isIncognito` 狀態開關，頂部新增按鈕，支援千萬金額隱私遮蔽
- [x] 撰寫單元測試驗證篩選器連動與隱私遮罩格式轉換
