# Ticket #010: [P1] 質押擔保品股票庫存動態連動（賣出時即時預警與維持率扣減）

## 關聯規格
- PRD: [docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md)

## 目標 (Goal)
消除在席持股賣出後，質押合約仍採計已不存在之股票計算維持率的「假安全」風控漏洞。

## 任務清單 (Tasks)
- [x] 在 `src/engine/marginStressEngine.ts` 中比對在庫真實持股數與質押擔保品股數：
  - 若 $\text{Holding Shares} < \text{Pledged Shares}$，自動限制可用擔保品為最新庫存數，並輸出 `COLLATERAL_DEFICIT` 風險警告。
- [x] 撰寫測試驗證賣出質押股票後，壓力維持率即時驟降與追繳警示。

## 驗收條件 (Acceptance Criteria)
- [x] 質押擔保品與庫存 100% 動態連動，杜絕虛擬擔保品維持率膨脹。
