# V8.18.0 在倉持股精確分流與小白動能百科交接手冊 (HANDOFF)

## 1. 任務核心變更概述
針對使用者實戰回饋的 3 大體驗痛點，全面完成優化：
1. **AI 晨報在倉標的精確過濾**：
   - 修正 `WarRoomWorkspace.tsx` 晨報持股掃描邏輯，將 `holdings.map` 嚴格過濾為 `holdings.filter((h) => h.shares > 0).map`。
   - 已全數平倉清空（`shares === 0`，如 00746B、1717、5312 等）之歷史標的，不再錯誤出現在晨報的「⚠️【破線停損】」清單中。
2. **肌肉書僮持股資產池拆分為「在倉持股」與「歷史平倉」**：
   - 在 `MuscleBookerWorkspace.tsx` 中，將原本混雜 60 檔的 `HOLDINGS` 拆分為：
     - `HOLDINGS_ACTIVE`（在倉持股，`shares > 0`）
     - `HOLDINGS_CLOSED`（歷史平倉，`shares === 0`）
   - 按鈕列動態顯示各自數量，點擊即可分別查看在倉即時戰術或覆盤歷史標的。
3. **股市小白專屬動能與操盤術語 Tooltip 百科**：
   - 定義生活化白話文字典 `BEGINNER_TOOLTIPS`。
   - 在三色實戰導航儀、四大象限動能卡片與均線扣抵望遠鏡表頭中，為「風益比 (1:X R)」、「箱頂防守」、「破底翻」、「布林極致壓縮」、「破線停損」、「MA20 扣抵」等指標套上 `<Tooltip>` 與下劃虛線游標導引。

## 2. 異動檔案清單
- `src/components/WarRoomWorkspace.tsx`: AI 晨報持股訊號過濾 `shares > 0`。
- `src/components/MuscleBookerWorkspace.tsx`: 拆分在倉/平倉按鈕與標的池、引入 Tooltip 與 `BEGINNER_TOOLTIPS`。
- `src/components/MuscleBookerWorkspace.test.ts`: 新增百科字典與持股分流單元測試。
- `docs/specs/0099-active-closed-holdings-filter-and-beginner-tooltips-spec.md`: PRD #0099。
- `docs/adr/0099-active-closed-holdings-filter-and-beginner-tooltips.md`: ADR #0099。
- `docs/handoff/2026-09-08-v8.18.0-active-closed-holdings-filter-and-beginner-tooltips.md`: 正式交付手冊。
- `CONTEXT.md`: 同步更新領域模型。

## 3. 測試與構建驗證
- 單元測試：`57 passed / 57 test files (624 passed)`，100% 綠燈。
- 專案建置：`npm run build` 0 錯誤通過。
