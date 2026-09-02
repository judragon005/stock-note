# 01 — 多來源減資區間合併去重與重複入帳防護

**What to build:** 
修正 `fetchLiveCorporateEvents` 與 `isAlreadyRecorded` 針對台股減資事件之比對邏輯：
1. **多來源減資去重合併**：在 `fetchLiveCorporateEvents` 整合 Yahoo Finance（反向分割）與 TWSE（官方減資）時，以 $\le 90$ 天為時間視窗進行去重合併，優先採用官方精準基準日與每股退款金額，避免將同一場次減資重複記錄為兩筆獨立事件。
2. **已記錄歷史比對防護**：在 `isAlreadyRecorded` 判定中新增減資事件 $\le 90$ 天的模糊比對，避免在已記錄官方減資時再次被掃描並重複補登。

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] 在 `corporateActionScanner.ts` 的 `fetchLiveCorporateEvents` 中新增 $\le 90$ 天減資去重合併邏輯
- [x] 在 `corporateActionScanner.ts` 的 `isAlreadyRecorded` 中建立減資相近日期重複補登防護
- [x] 官方已公告常態備援庫 (`officialCorporateActions`) 與線上端點平滑合併
