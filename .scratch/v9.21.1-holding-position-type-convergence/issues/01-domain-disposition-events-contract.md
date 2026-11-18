# 01 — DispositionEventInput 領域層提升與 HoldingPosition.dispositionEvents 契約確立

**What to build:** 將 `DispositionEventInput` 定義提升至核心領域型別層，由處置視窗引擎維持向後相容 re-export（零反向依賴），並於 `HoldingPosition` 正式擴充 `dispositionEvents?: DispositionEventInput[]`。

**Blocked by:** None — can start immediately

**Status:** done (Spec 0236 / Issue #586)

- [x] `DispositionEventInput` 定義於 `src/types/stock.ts` 並掛載至 `HoldingPosition.dispositionEvents`
- [x] `src/engine/dispositionWindowEngine.ts` 改為由領域層匯入並 `re-export`
- [x] `npx tsc --noEmit` 與 `dispositionWindowEngine.test.ts` (12/12) 全數通過
