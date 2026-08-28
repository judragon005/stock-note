# 主看板：PRD #0047 嘉信理財對帳單像素級對齊與雙筆記帳架構

## 🎯 迭代目標
徹底解決美股股息流水重複扣稅、利息膠囊未合併與歷史手動輸入零頭差額問題，達成全量 25 筆美股流水、總 NAV、被動收益與交割戶可用現金（$224.79 USD）的 100% 像素級吻合。

---

## 📋 任務看板 (Task Board)

| 票券 ID | 任務名稱 | 優先級 | 狀態 | 負責模組 |
| :---: | :--- | :---: | :---: | :--- |
| **#01** | [01-smart-interest-normalization-regex.md](01-smart-interest-normalization-regex.md) | P0 | ✅ DONE | `cashLedgerEngine.ts` |
| **#02** | [02-us-dividend-gross-amount-sync.md](02-us-dividend-gross-amount-sync.md) | P0 | ✅ DONE | `cashLedgerEngine.ts` |
| **#03** | [03-auto-reconciliation-engine.md](03-auto-reconciliation-engine.md) | P0 | ✅ DONE | `storage.ts` |
| **#04** | [04-full-regression-and-doc-sync.md](04-full-regression-and-doc-sync.md) | P0 | ✅ DONE | `db.ts`, `CONTEXT.md` |

---

## 驗收指標 (Definition of Done)
- [x] 1. `normalizeInterestName` 支援全形逗號 `，`、半形逗號 `,`、冒號 `：`、各類破折號與日期區間截斷。
- [x] 2. 美股股息流水統一以毛額 (Gross) 入帳，配合預扣稅流水完美還原券商 DOI / JRN 雙筆金流。
- [x] 3. `autoReconcileSchwabRecords` 自動校正 4 筆 Trade，手頭現金餘額精準等於 `$224.79 USD`。
- [x] 4. 全量 304 項單元測試 100% 通過，TypeScript 構建 0 錯誤。
