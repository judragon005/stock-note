# 迭代主票券: v5.7.4 淨槓桿零負債現貨保護機制與被動收入各項利息獨立膠囊展示

- **關聯 PRD**: [docs/specs/0045-risk-leverage-zero-debt-fix-and-passive-income-badges.md](../../docs/specs/0045-risk-leverage-zero-debt-fix-and-passive-income-badges.md)
- **版本**: v5.7.4
- **狀態**: `RESOLVED`
- **分流標籤**: `ready-for-agent`
- **分流狀態 (Triage Status)**: `ready-for-agent`

---

## 🎯 迭代目標

1. **淨槓桿零負債現貨保護 (Risk Exposure Zero-Debt Spot Protection)**：
   - 修復當使用者無任何借貸負債（`loans` 為空且未融資）、僅因未手動補錄現金入金導致現金為負時，槓桿被誤判為 `99.99x 極度危險` 的 Bug。
   - 當 `totalDebt === 0` 時，系統自動判定為自有資金現貨持有，淨槓桿率固定為 `1.00x 穩健無槓桿`。
   - 槓桿計算嚴格隨當前市場切換（美股/台股/全部）隔離對應資產、現金與負債。
2. **被動收入卡片主數字擴展**：
   - 累計被動收入卡片主數字顯示「被動收入總額 (累計已領股息 + 當前市場各項利息收入)」。
3. **各項利息收入獨立膠囊展示 (Multi-Interest Badges)**：
   - 從現金帳本中提取 `INTEREST_INCOME`，依來源項目/備註（如活存利息、借券收益、美債息）與幣別分組。
   - 在卡片底部以獨立特色膠囊（Cyan 徽章）個別分開呈現，不混雜為單一項目。
   - 完整相容既有之美股 30% 預扣稅、二代健保補充保費與減資退款膠囊。
4. **全量回歸與領域文檔同步**：
   - 達成 `npm test` 100% 通過、`npm run build` 0 錯誤。
   - 同步產出 `docs/adr/0045-*.md`、更新 `CONTEXT.md` 與交接手冊。

---

## 📋 細粒度原子任務看板 (Granular Task Breakdown Board)

| 票券編號 | 任務名稱 | 預估工時 | 目標檔案與交付重點 | 狀態 | 分流標籤 |
| :---: | :--- | :---: | :--- | :---: | :---: |
| [**#01**](01-risk-exposure-zero-debt-spot-fix-and-tests.md) | 淨槓桿零負債現貨保護引擎修復與 TDD 單元測試 | 0.4h | `src/engine/riskExposureEngine.ts`, `src/engine/riskExposureEngine.test.ts` | `RESOLVED` | `ready-for-agent` |
| [**#02**](02-passive-income-multi-interest-aggregation-engine.md) | 各項利息收入聚合 Helper 與單元測試 | 0.3h | `src/engine/cashLedgerEngine.ts`, `src/engine/cashLedgerEngine.test.ts` | `RESOLVED` | `ready-for-agent` |
| [**#03**](03-summary-cards-badges-ui-integration.md) | SummaryCards 被動收入卡片與獨立利息膠囊 UI 整合與 App.tsx 市場隔離連動 | 0.5h | `src/components/SummaryCards.tsx`, `src/App.tsx` | `RESOLVED` | `ready-for-agent` |
| [**#04**](04-full-regression-and-doc-sync.md) | 全量回歸驗證、ADR 架構決策與領域文檔同步 | 0.3h | `npm test`, `npm run build`, `docs/adr/0045-*.md`, `CONTEXT.md` | `RESOLVED` | `ready-for-agent` |

---

## 子任務拆解清單 (4 張原子票券)
- [x] [01-risk-exposure-zero-debt-spot-fix-and-tests.md](01-risk-exposure-zero-debt-spot-fix-and-tests.md) - 淨槓桿零負債現貨保護引擎修復與 TDD 單元測試 (`RESOLVED`)
- [x] [02-passive-income-multi-interest-aggregation-engine.md](02-passive-income-multi-interest-aggregation-engine.md) - 各項利息收入聚合 Helper 與單元測試 (`RESOLVED`)
- [x] [03-summary-cards-badges-ui-integration.md](03-summary-cards-badges-ui-integration.md) - SummaryCards 被動收入卡片與獨立利息膠囊 UI 整合與 App.tsx 市場隔離連動 (`RESOLVED`)
- [x] [04-full-regression-and-doc-sync.md](04-full-regression-and-doc-sync.md) - 全量回歸驗證、ADR 架構決策與領域文檔同步 (`RESOLVED`)

