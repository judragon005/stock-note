# 任務 02: TradeModal 智慧繼承當前市場/券商與雙向切換聯動

- **狀態**: Completed (已完成)
- **分流標籤**: `ready-for-agent`
- **類型**: Feature / UX
- **優先級**: P0 (Phase 2)
- **對應 PRD**: SPEC-0024 (AC-1, AC-2, AC-3)

## 任務描述
優化 `TradeModal` 彈窗，使其能完全承接主畫面頂部目前選定的市場與券商帳戶；並在彈窗內切換市場（點選按鈕、代碼判定、點選智慧推薦標的）時，自動將 `accountId` 聯動切換為該市場預設帳戶，並同步更新手續費折數試算。

## 驗收標準 (Acceptance Criteria)
- [x] `TradeModalProps` 擴充 `initialMarket?: MarketType` 與 `initialAccountId?: string`。
- [x] `App.tsx` 傳入當前選定的市場 (`currentMarket`) 與選定券商 (`selectedAccountId`) 至 `TradeModal`。
- [x] `TradeModal` 內建 `getEffectiveAccountId` 輔助邏輯，確保初始 `accountId` 與目標市場嚴格相容。
- [x] 在手動切換市場（台股 🇹🇼 / 美股 🇺🇸）、代碼輸入或點選熱門標的建議時，自動同步切換 `accountId` 至該市場預設帳戶。
- [x] 下拉切換帳戶時，若為台股帳戶，自動帶入該帳戶設定之手續費折數。
- [x] 撰寫 `TradeModal` 相關行為測試或元件單元測試，確保切換聯動完全無誤。
