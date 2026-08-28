# 迭代主票券: v5.8.0 零負債槓桿歸零、利息膠囊券商聚合與預扣稅分離、流水帳股息雙向同步全域連動

- **關聯 PRD**: [docs/specs/0046-zero-debt-leverage-zeroing-and-bidirectional-cash-trade-sync.md](../../docs/specs/0046-zero-debt-leverage-zeroing-and-bidirectional-cash-trade-sync.md)
- **版本**: v5.8.0
- **狀態**: `RESOLVED`
- **分流標籤**: `ready-for-agent`
- **分流狀態 (Triage Status)**: `ready-for-agent`

---

## 🎯 迭代目標

1. **淨槓桿零負債歸零 (Zero-Debt Leverage Zeroing)**：
   - 當帳戶無任何融資與質押借款（`totalDebt === 0`）時，無論現金為正或負，淨槓桿率與總槓桿率一律評定為 `0.00x`，徽章顯示「穩健無槓桿 (≤1.0x)」。
2. **利息膠囊依券商帳戶聚合與預扣稅分拆 (Broker Interest & Tax Separation)**：
   - 現金利息依「券商帳戶名稱 + 幣別」聚合為單一簡潔膠囊，不再依月份日期備註分裂成多個長條。
   - 預扣稅明確區分為「美股股息預扣」與「現金利息預扣」兩顆獨立膠囊。
3. **現金流水帳股息手動修改 ➔ Trade 雙向同步與全域連動 (Bidirectional Cash-Trade Sync)**：
   - 支援在現金流水帳中直接 ✏️ 編輯自動連動之股息紀錄，修改後同步雙向回寫 `Trade` 原始紀錄。
   - 驅動 React 全域資料流即時重算總淨值 (NAV)、現金水位、被動收益卡片主數字與未實現損益。
4. **全量回歸與領域文檔同步**：
   - 達成 `npm test` 100% 通過 (304 tests)、`npm run build` 0 錯誤。
   - 同步更新 `docs/adr/0046-*.md`、`CONTEXT.md` 與交付交接手冊。

---

## 📋 細粒度原子任務看板 (Granular Task Breakdown Board)

| 票券編號 | 任務名稱 | 預估工時 | 目標檔案與交付重點 | 狀態 | 分流標籤 |
| :---: | :--- | :---: | :--- | :---: | :---: |
| [**#01**](01-risk-leverage-zero-debt-zeroing-and-tests.md) | 零負債槓桿歸零 0.00x 計算引擎修復與 TDD 單元測試 | 0.3h | `src/engine/riskExposureEngine.ts`, `src/engine/riskExposureEngine.test.ts` | `RESOLVED` | `ready-for-agent` |
| [**#02**](02-broker-interest-aggregation-and-tax-separation.md) | 利息依券商聚合與預扣稅分離聚合引擎及單元測試 | 0.4h | `src/engine/cashLedgerEngine.ts`, `src/engine/cashLedgerEngine.test.ts` | `RESOLVED` | `ready-for-agent` |
| [**#03**](03-summary-cards-badges-and-tax-ui-update.md) | SummaryCards 被動收益卡片利息聚合膠囊與稅額分離 UI 整合 | 0.3h | `src/components/SummaryCards.tsx` | `RESOLVED` | `ready-for-agent` |
| [**#04**](04-cash-ledger-trade-bidirectional-sync.md) | 現金流水帳股息編輯與 Trade 雙向同步全域連動實作 | 0.5h | `src/components/CashLedgerWorkspace.tsx`, `src/components/CashTransactionModal.tsx`, `src/App.tsx` | `RESOLVED` | `ready-for-agent` |
| [**#05**](05-full-regression-and-doc-sync.md) | 全量回歸驗證、ADR 架構決策與領域文檔同步 | 0.3h | `npm test`, `npm run build`, `docs/adr/0046-*.md`, `CONTEXT.md` | `RESOLVED` | `ready-for-agent` |

---

## 子任務拆解清單 (5 張原子票券)
- [x] [01-risk-leverage-zero-debt-zeroing-and-tests.md](01-risk-leverage-zero-debt-zeroing-and-tests.md) - 零負債槓桿歸零 0.00x 計算引擎修復與 TDD 單元測試 (`RESOLVED`)
- [x] [02-broker-interest-aggregation-and-tax-separation.md](02-broker-interest-aggregation-and-tax-separation.md) - 利息依券商聚合與預扣稅分離聚合引擎及單元測試 (`RESOLVED`)
- [x] [03-summary-cards-badges-and-tax-ui-update.md](03-summary-cards-badges-and-tax-ui-update.md) - SummaryCards 被動收益卡片利息聚合膠囊與稅額分離 UI 整合 (`RESOLVED`)
- [x] [04-cash-ledger-trade-bidirectional-sync.md](04-cash-ledger-trade-bidirectional-sync.md) - 現金流水帳股息編輯與 Trade 雙向同步全域連動實作 (`RESOLVED`)
- [x] [05-full-regression-and-doc-sync.md](05-full-regression-and-doc-sync.md) - 全量回歸驗證、ADR 架構決策與領域文檔同步 (`RESOLVED`)
