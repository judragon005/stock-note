# 03 — 戰情室晨報訊號組裝器對齊正統 plan 與 dispositionEvents 契約

**What to build:** 移除 `warRoomBriefBuilder` 中 `tradePlan` 與 `dispositionEvents` 兩處 `as unknown as` 雙重轉型，直接消費 `h.plan` 與 `h.dispositionEvents ?? []`，並補齊 TDD 契約測試。

**Blocked by:** 01 — DispositionEventInput 領域層提升與 HoldingPosition.dispositionEvents 契約確立

**Status:** done (Spec 0236 / Issue #586)

- [x] `warRoomBriefBuilder.ts` 全面移除雙重轉型並改用 `h.plan` 與 `h.dispositionEvents ?? []`
- [x] 新增 `warRoomBriefBuilder.test.ts` 驗證 `planRiskStatus` 與 `dispositionStatus`
