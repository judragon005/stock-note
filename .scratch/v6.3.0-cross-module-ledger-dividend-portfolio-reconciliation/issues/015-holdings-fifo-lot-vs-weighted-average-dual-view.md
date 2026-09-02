# Ticket #015: [P2] 庫存 FIFO 批次成本與加權平均成本雙軌切換與對帳視角

## 關聯規格
- PRD: [docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md)

## 目標 (Goal)
提供在庫持股在「加權平均成本」與「FIFO 批次成本」兩種會計模式下的清晰標籤與損益對照，消除投資人跨頁面對帳時的口徑困惑。

## 任務清單 (Tasks)
- [x] 在 `src/engine/calculator.ts` 與 `src/engine/lotEngine.ts` 中：
  - 支援加權平均法 (MOVING_AVERAGE) 與批次沖銷法 (FIFO / LIFO / HIFO) 雙軌切換。
  - 在持倉明細中輸出各批次 `lots` 買進單價與股數。
- [x] 撰寫測試驗證雙軌切換下的成本與已實現損益計算。

## 驗收條件 (Acceptance Criteria)
- [x] 使用者可靈活切換台灣券商習慣的「加權平均成本」與美股報稅的「FIFO 批次成本」。
