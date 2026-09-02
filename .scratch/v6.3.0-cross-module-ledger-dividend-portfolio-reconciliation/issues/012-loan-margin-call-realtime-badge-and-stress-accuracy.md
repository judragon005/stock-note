# Ticket #012: [P2] 質押維持率多階梯警戒顏色與即時追繳差額逆運算

## 關聯規格
- PRD: [docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md)

## 目標 (Goal)
提供精準的質押維持率水位（<130% 斷頭追繳、130%~160% 警戒、160%~200% 健康、>200% 極安全），並即時計算需回補之擔保品或現金差額。

## 任務清單 (Tasks)
- [x] 在 `src/engine/marginStressEngine.ts` 中支援多階梯警戒顏色（安全 > 166%、預警 140~166%、危險 130~140%、斷頭追繳 < 130%）。
- [x] 精確計算補足至 130% 與 160% 安全水位所需之現金與股票市值差額（`requiredCashFor130TWD`、`requiredCashFor160TWD`）。
- [x] 撰寫測試驗證維持率計算與補繳逆運算。

## 驗收條件 (Acceptance Criteria)
- [x] 質押風控狀態一目了然，追繳補水金額精確可行動。，為槓桿投資人提供關鍵保命數據。
