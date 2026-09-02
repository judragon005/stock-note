# Ticket #008: [P2] 股票股利（配股）與現金股利雙軌會計口徑標準化

## 關聯規格
- PRD: [docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md)

## 目標 (Goal)
標準化股票股利（除權配股：增加持股數、稀釋每股成本）與現金股利（資金流入）的會計處理，防止配股被誤算為現金流。

## 任務清單 (Tasks)
- [x] 在 `src/engine/calculator.ts` 與 `src/engine/lotEngine.ts` 中：
  - 統一將 `STOCK_DIVIDEND` 定位為「零成本股數增加，自然稀釋每股平均成本」，總成本基準保持不變。
  - 現金帳本不生成任何資金異動流水（現金流 0 污染）。
- [x] 撰寫測試驗證除權配股前後之每股成本稀釋與總市值變化。

## 驗收條件 (Acceptance Criteria)
- [x] 股票股利（配股）與現金股利雙軌會計口徑清晰，會計邏輯與台股實務 100% 一致。
