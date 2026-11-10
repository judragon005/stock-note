# Ticket 08: 專屬頁面 UI、分段鏡頭與全域技能升級

**State:** CLOSED  
**Parent:** #472 (Spec 0221)  

## What to build
1. 註冊導航列頁籤：`src/components/WorkspaceTabs.tsx` 新增 `🐢 慢富週期與配置` (`key: 'zavy'`)。
2. 建立組件模組（單檔嚴格 `≤ 250 行`）：
   - `src/components/zavy/ZavySlowWealthWorkspace.tsx`
   - `src/components/zavy/ZavyMacroCompassCard.tsx`
   - `src/components/zavy/ZavyMarketBreadthCard.tsx`
   - `src/components/zavy/ZavyDualTrackDecisionCard.tsx`
   - `src/components/zavy/ZavyTenSecondsModal.tsx`
3. 升級全域技能：
   - 更新 `C:\Users\GV72\.gemini\config\skills\E06_zavy-perspective\SKILL.md` 至 2026/10 知識庫。

## Acceptance criteria
- [x] 所有新增 UI 組件程式碼單檔均 `≤ 250 行`。
- [x] 成功載入與渲染三層分段鏡頭與 HUD 橫幅。
- [x] 全專案 build 與測試通過。
