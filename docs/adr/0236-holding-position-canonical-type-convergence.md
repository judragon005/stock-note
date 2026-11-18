# ADR 0236: HoldingPosition 正統領域型別收斂與戰情室靜默斷路根除

- **狀態**：已採用 (Accepted)
- **日期**：2026-11-18
- **關聯規格與票券**：Spec 0236 / GitHub Issue #586 / Debt 0059

## 背景與問題
技術債 0059 原始建議於 `HoldingPosition` 擴充 `avgExchangeRate?`、`tradePlan?` 與 `dispositionEvents?` 以消除戰情室 (`useWarRoomPortfolioMetrics.ts`、`warRoomBriefBuilder.ts`) 中的 `as unknown as` 雙重型別斷言。然而跨模組溯源審計揭露：`src/types/stock.ts` 早已定義 `avgCostFxRate?: number` 與 `plan?: TradePlan`，且會計引擎 `calculator.ts` 僅寫入此二正統欄位；戰情室讀取未定義的 `avgExchangeRate` 導致美股成本匯率 100% 靜默回退為常數 `31.8`，造成匯差緩衝墊長期失真。

## 決策
1. **正統 SSOT 欄位收斂（拒絕雙胞胎別名）**：嚴禁於 `HoldingPosition` 新增 `avgExchangeRate` 與 `tradePlan` 冗餘欄位；強制 `useWarRoomPortfolioMetrics.ts` 改讀 `h.avgCostFxRate`，`warRoomBriefBuilder.ts` 改讀 `h.plan`，並於 `CONTEXT.md` 明文禁用此二別名。
2. **處置事件型別層提升與單向依賴**：將 `DispositionEventInput` 定義自計算引擎層提升至 `src/types/stock.ts` 並正式掛載於 `HoldingPosition.dispositionEvents`，原處置視窗引擎 `dispositionWindowEngine.ts` 改為 `re-export` 以維持向後相容與零反向依賴。
3. **最小爆炸半徑契約驗證**：補齊 `useWarRoomPortfolioMetrics.test.ts` 與 `warRoomBriefBuilder.test.ts` 公開介面縫隙測試，並將技術債 0059 標記為 `RESOLVED`。
