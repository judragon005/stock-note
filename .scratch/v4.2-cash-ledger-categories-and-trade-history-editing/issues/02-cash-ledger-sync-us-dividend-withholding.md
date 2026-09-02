# 任務 02: 交割款一鍵自動對齊與美股 30% 股息預扣稅淨額試算

- **狀態**: Completed (已完成)
- **分流標籤**: `ready-for-agent`
- **類型**: Engine / Sync / Tax
- **優先級**: P0 (Phase 1)
- **對應 PRD**: SPEC-0025 (AC-3)

## 任務描述
強化 `cashLedgerEngine.ts` 中的 `syncTradesWithCashTransactions` 演算法。當同步美股股息交易且無手動指定稅額時，自動依據 30% 美國海外投資人法定預扣稅率試算淨額，使現金帳本入帳金額與海外券商（如嘉信理財）實際入帳金額完美吻合，並無縫對齊 DRIP 股息再投資。

## 驗收標準 (Acceptance Criteria)
- [x] 在 `syncTradesWithCashTransactions` 的 `DIVIDEND` 分支中，偵測美股標的並於未指定稅額時自動按 30% 預扣稅率計算 `tax`。
- [x] 現金帳本股息流水金額 `amount` 自動以稅後淨額入帳（`gross - tax`）。
- [x] 點擊「🔄 自動對齊交割款 (T+2/T+1)」後，嘉信理財帳戶現金餘額與 App 顯示金額（$224.79）100% 吻合。
