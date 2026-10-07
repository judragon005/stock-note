# 04-ai-force-adaptive-depth-and-photo-1-alignment

## Description
在 `src/components/aiForceDashboard/AiForceDashboardView.tsx` 與 `src/engine/aiForceDashboardEngine.ts` 中實作「短天期標的智慧自適應降級 (Smart Adaptive Depth)」，解決照片一的所有缺陷。當輸入 `00411A` 時，幣別呈現 `TWD`、單位為 `張`、全戰情室 18 張卡片全面連動真實資料庫即時演算更新；需 60D 季線或 250D 年線之長天期指標落實 Honest Empty State 標註「新上市數據累積中」，禁止虛構或崩潰。

## Target Files
- `src/components/aiForceDashboard/AiForceDashboardView.tsx`
- `src/engine/aiForceDashboardEngine.ts`
- `src/engine/aiForceDashboardEngine.test.ts`
- `src/components/aiForceDashboard/AiForceRealDataE2E.test.ts`

## Acceptance Criteria
- [x] 戰情室輸入 `00411A` 時，頂部 Bar 正確顯示：
  - 幣別為 `TWD`（非 `USD`）。
  - 成交量標籤為 `成交量(張)` 或 `前日成交量(張)`。
  - 最新交易日與價格正確映射真實日 K。
- [x] 主 K 線圖、AI 決策核心、多維度雷達、量價累積、三大法人動向等 18 張卡片同步連動本地真實 37 筆數據完成演算。
- [x] 未滿 60D/250D 之長天期卡片與指標（如 MA60, MA250）依 Zero Mock 原則標註「數據累積中」，頁面零崩潰。
- [x] 撰寫測試 `aiForceDashboardEngine.test.ts` 驗證短天期 37 筆日 K 輸入時之自適應演算正確性。

## Status
- [x] done
