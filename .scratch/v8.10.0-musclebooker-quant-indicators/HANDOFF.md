# 交接記錄手冊 (Handoff Manual) - v8.10.0

## 1. 本次迭代目標
依據使用者指令啟動 **Phase 2**，完成精選技術債之量化數據核心：
- **技術債 #0019 (P2)**：本地全量歷史技術指標庫與免費外部資源自動回補引擎 (肌肉書僮短線量化體系)。
- 為系統建立完整的全量歷史日 K (OHLCV) 與肌肉書僮實戰指標時序數列，並為下一階段 **#0027 (雙重動能輪動)** 與 **#0020 (宏觀戰情室)** 提供數據基底。

---

## 2. 產出成果與變更清單
- **PRD 規格書**：[docs/specs/0091-local-historical-indicators-and-external-backfill-engine-spec.md](../../docs/specs/0091-local-historical-indicators-and-external-backfill-engine-spec.md)
- **ADR 架構決策**：[docs/adr/0091-local-historical-indicators-and-external-backfill-engine.md](../../docs/adr/0091-local-historical-indicators-and-external-backfill-engine.md)
- **本地票券鏡像**：
  - `01-musclebooker-quant-engine-and-unit-tests.md` (CLOSED)
  - `02-indexeddb-v3-schema-upgrade.md` (CLOSED)
  - `03-historical-ohlcv-backfill-and-system-integration.md` (CLOSED)
- **核心架構與型別定義**：
  - [src/types/indicators.ts](../../src/types/indicators.ts)：定義 `DailyCandle`、`BoxStatus`、`TrendSlope`、`MuscleBookerIndicatorPoint`、`SymbolOhlcvStore` 與 `SymbolIndicatorsStore`。
  - [src/engine/muscleBookerEngine.ts](../../src/engine/muscleBookerEngine.ts)：純函式實作箱子戰術、均線扣抵、底穿上假跌破、布林 Squeeze、ATR 動態移動防守與投量比。
  - [src/engine/muscleBookerEngine.test.ts](../../src/engine/muscleBookerEngine.test.ts)：9 個量化核心單元測試 100% 通過。
  - [src/utils/db.ts](../../src/utils/db.ts)：升級 `DB_VERSION = 3`，擴充 `historicalOhlcv` 與 `technicalIndicators` 物件倉庫，提供專屬 CRUD 介面。
  - [src/engine/historicalOhlcvBackfill.ts](../../src/engine/historicalOhlcvBackfill.ts)：安全背景回補調度器，接入 `globalRequestScheduler` 速率限制器，安全拉取並增量沉澱 Yahoo Chart API 日 K。
  - [src/engine/historicalOhlcvBackfill.test.ts](../../src/engine/historicalOhlcvBackfill.test.ts)：4 個回補流程測試 100% 通過。
- **技術債狀態更新**：
  - [docs/debts/0019-local-historical-indicators-and-external-backfill-engine.md](../../docs/debts/0019-local-historical-indicators-and-external-backfill-engine.md) 標記為 `RESOLVED`。
  - [docs/debts/README.md](../../docs/debts/README.md) 看板同步標註 `已於 v8.10.0 (ADR #0091) 完整解決`。
- **領域模型同步**：
  - [CONTEXT.md](../../CONTEXT.md) 擴充肌肉書僮量化體系領域標準術語。

---

## 3. 測試與驗收指標
- **單元測試**：全專案 **52 個測試套件、584 個測試 100% 全數通過**（新增 13 個肌肉書僮與回補測試，2 個資料庫儲存測試）。
- **構建檢查**：`tsc && vite build` **0 錯誤**，產出生產環境打包 bundle。
- **回歸風險**：0 回歸。既有交易、帳戶、質押維持率、籌碼星圖完全相容且正常運行。
