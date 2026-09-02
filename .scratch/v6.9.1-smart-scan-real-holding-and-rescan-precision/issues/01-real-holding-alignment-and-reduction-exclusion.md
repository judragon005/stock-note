# Issue 01: 基準日持股對齊真實帳本持股與未入帳減資預扣排除

- **狀態**：`CLOSED`
- **關聯規格**：[PRD 0058 §2.1](file:///d:/APP/股票紀錄/docs/specs/0058-smart-scan-real-holding-alignment-and-rescan-precision-spec.md)
- **影響範圍**：`src/engine/corporateActionScanner.ts`

---

## 1. 任務背景與問題 (Problem Statement)
- 泰銘 9927 帳本持股為 10,000 股，但在掃描 2026-10-01 除息事件時，基準日持股被計算為 7,972 股。
- 根因為虛擬時序引擎在記憶體中維護 `virtualTrades`，自動將 2025-09-15 尚未入帳的減資事件 (28.28%) 預先扣減，導致除息持股嚴重失真。

---

## 2. 實作變更 (Implementation Changes)
- 在 `corporateActionScanner.ts` 中，除權除息基準日持股（`sharesHeldOnDate`）嚴格依據使用者帳本真實交易記錄（`trades`）在 `exDate - 1` 收盤在籍股數計算。
- 虛擬時序僅對實質增加股數之 `STOCK_DIVIDEND` 與 `STOCK_SPLIT` 進行動態累加，徹底排除 `CAPITAL_REDUCTION` 預先扣減。
- 嚴格遵循證券法規除息日買進者不享有配息（股數為 0）原則。

---

## 3. 驗收標準 (Acceptance Criteria)
- [x] 9927 泰銘 2026-10-01 除息基準日持股精確顯示為 10,000 股。
- [x] 預估入帳金額精確為 NT$ 48,945（50,000 元扣除二代健保 1,055 元）。
- [x] 連續配股與股票分割仍能正確進行跨年度股數累積計算。
