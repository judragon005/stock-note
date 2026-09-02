# 需求規格說明書 (PRD #0052)：智慧掃描公司行動除息日與發放日欄位補全、預估入帳時序對齊與待入帳款項隔離

## Problem Statement

使用者在透過「智慧掃描公司行動」自動補登除權息事件至交易帳本時，遇到以下時序與欄位不對齊的問題：

1. **除息日與入帳發放日欄位混淆**：智慧掃描目前擷取的事件日期為公開市場公告之「除息基準日 (`exDate`)」。但在自動補登寫入 `TradeRecord` 時，僅將該日期填入 `date` 與 `exDate`，遺漏了 `payDate`（預估入帳發放日）欄位的寫入。
2. **待入帳款項提早落袋假象**：在除息日已過但尚未到達發放日的「待入帳過渡期（通常相差 15~30 天）」內，若使用者提早按下智慧補登，因為缺少明確的 `payDate` 欄位，可能導致現金帳本或明細呈現時將其視為除息日已發生之即時結算款項，而非在途款項 (`PENDING`)。
3. **持股數判定需要清晰的時序定義保證**：雖然掃描引擎在計算配息金額與配股數時已嚴格使用「除息日前一日（`exDate - 1 day`）」在籍庫存計算，但若補登產生的資料結構未明確區分 `exDate` 與 `payDate`，容易讓使用者產生「除息後買賣是否會回溯影響持股數或被誤算」的疑慮。

---

## Solution

建立完善的「除權息雙日期自動校驗與補登流轉機制」，在智慧掃描與補登流水線中完整注入預估發放日 (`payDate`)：

1. **掃描模型升級**：在掃描結果物件模型中擴充 `payDate?: string` 欄位，於掃描階段自動透過市場預估與已公告日曆計算出精準的預估入帳發放日。
2. **補登資料結構健全**：當使用者選擇套用智慧補登時，為 `DIVIDEND` 類型的交易紀錄完整賦予：
   - `exDate`: 除權息基準日（即公告除息日）。
   - `payDate`: 預估發放日（入帳日）。
   - `date`: 基準日期（保留除息日或對齊發放日，並確保與現金帳本的交割日期判定規則一致）。
3. **現金帳本與應收股利完美無縫銜接**：現金帳本引擎依據 `payDate` 進行 `PENDING`（在途款項，不虛增可用現金）與 `SETTLED`（已實質落袋）狀態劃分，徹底杜絕因除息日提早補登導致可用現金餘額高估之風險。

---

## User Stories

1. 作為一名長期定存股與高股息投資人，我希望在智慧掃描發現現金股利時，能同時看到「除息基準日」與「預估發放日」，以便清楚掌握配息的成立時間點與預計資金入帳時間。
2. 作為一名注重現金流風控的投資人，我希望當我在除息日當天提早使用智慧補登時，系統不會立即將該筆股利計入當前「可用現金餘額」，而是標記為待入帳款項，直到發放日到達才實質結算。
3. 作為一名頻繁交易者，我希望在除息日之後賣出或加碼股票時，智慧掃描計算出的股利金額仍然精準鎖定在除息基準日前一日的在席股數，不受除息後的交易干擾。
4. 作為一名多券商帳戶管理者，我希望智慧補登生成的交易紀錄具備完整的 `exDate` 與 `payDate` 欄位，以便在匯出 CSV、JSON 備份或歷史查閱時，資料完全符合金融會計與雙日期標準。
5. 作為一名檢視除權息行事曆的使用者，我希望手動補登或智慧補登的股利紀錄能與系統頂部「除權息待入帳行事曆」的去重機制完美協同，不會因日期些微差異而重複提示或誤判。

---

## Implementation Decisions

### 1. 核心資料結構與介面擴充 (Schema & Model Enhancements)
- 在掃描事件介面 (`ScannedCorporateAction`) 新增選擇性欄位 `payDate?: string`。
- 在原始事件 (`RawCorporateEvent`) 中支援解析或傳遞 `payDate`。

### 2. 掃描引擎發放日自動估算 (Scanner Engine Integration)
- 在執行全市場與官方除權息掃描時，針對 `DIVIDEND` 現金股利事件，調用預估發放日計算邏輯：
  - 若為官方已公告清單（如 2330、2886、00878、00923、9927），精確帶入官方預計發放日。
  - 若為一般台股標的，預設依除息日向後推算約 28 日（台股常態交割入帳週期）。
  - 若為美股標的，預設依除息日向後推算約 21 日（美股常態交割入帳週期）。

### 3. UI 補登模態視窗賦值優化 (Modal Auto-Apply Logic)
- 當使用者在 `CorporateActionScannerModal` 中勾選並套用補登時：
  - 產生的 `TradeRecord` 必須包含 `exDate = a.date` 以及 `payDate = a.payDate || estimatePaymentDate(a.date, a.market)`。
  - 備註 (`note`) 明確標註除息基準日與預估發放日，提升可讀性。

### 4. 現金流水帳 (Cash Ledger) 狀態銜接
- 現金帳本自動交割分類中，`DIVIDEND_PAYOUT` 類別的交割結算日嚴格以 `trade.payDate` 為第一優先，若無則降級推算 `estimatePaymentDate(trade.exDate || trade.date, trade.market)`。
- 當 `today < payDate` 時，狀態維持 `PENDING`；當 `today >= payDate` 時，自動轉為 `SETTLED`。

---

## Testing Decisions

### 1. 測試原則
- 遵循行為驅動 (BDD) 與測試驅動開發 (TDD) 原則。
- 只在公開模組介面縫隙 (Public Seams) 撰寫測試，不測私有實作細節。

### 2. 測試範疇
- **掃描引擎單元測試**：
  - 驗證掃描回傳之 `ScannedCorporateAction` 物件已包含 `payDate`。
  - 驗證除息日前一日在庫股數計算精準度（包含除權配股與買賣後之時序）。
- **補登轉換與資料一致性測試**：
  - 驗證透過掃描結果生成 `TradeRecord` 時，`exDate` 與 `payDate` 均被正確賦值。
- **現金帳與待入帳流轉回歸測試**：
  - 驗證智慧補登產生的除息紀錄在 `today < payDate` 時在現金帳中呈現 `PENDING`，且在 `today >= payDate` 時呈現 `SETTLED`。

### 3. 既有參考 (Prior Art)
- `src/engine/corporateActionScanner.test.ts`
- `src/engine/receivableDividendEngine.test.ts`
- `src/engine/cashLedgerEngine.test.ts`

---

## Out of Scope

1. 外部官方端點即時爬取未公告之發放日（維持本地高可靠之估算與已知日曆庫備援）。
2. 修改股票分割 (`STOCK_SPLIT`) 或現金減資 (`CAPITAL_REDUCTION`) 的交割日定義（非現金股利，不受 `payDate` 影響）。

---

## Further Notes

- 本規格完全兼容 ADR-0050 與現有 `TradeRecord` 型別定義，無破壞性變更 (Non-breaking Change)。
