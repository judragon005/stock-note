# Ticket #3: 獨立建置「💪 肌肉書僮·動能雷達」專屬工作區

- **狀態**：`CLOSED`
- **標籤**：`ready-for-agent` · `UI` · `MuscleBooker` · `Workspace` · `ShortTermStrategy`
- **關聯 PRD**：[docs/specs/0096-muscle-booker-workspace-and-war-room-styling-fix-spec.md](../../../docs/specs/0096-muscle-booker-workspace-and-war-room-styling-fix-spec.md)
- **優先級**：`P1`

---

## 1. 任務目標
1. 擴充 `src/components/WorkspaceTabs.tsx`：
   - 新增 `musclebooker` 標籤，顯示「💪 肌肉書僮」，並附帶「短線聖經」徽章。
2. 建立 `src/components/MuscleBookerWorkspace.tsx`：
   - 頂部箴言與箱子戰術理念解說。
   - 三大資產池切換鈕：`在倉持股 (Holdings)` / `法人焦點 Top 30 (預設)` / `台股權值 Top 50`。
   - 四象限即時雷達看板：【箱頂突破區】、【底穿反轉區】、【布林極致壓縮區】、【跌破箱底警戒區】。
   - 均線扣抵望遠鏡清單（未來 3~5 天月線/季線扣低翻揚股）。
3. 於 `src/App.tsx` 掛載 `activeTab === 'musclebooker'` 之視圖。

## 2. 驗收標準
- [x] 導覽列可一鍵進入「💪 肌肉書僮」專屬工作區。
- [x] 支援切換「在倉持股」與「法人焦點 Top 30」，標的正確分類至四大箱子狀態卡片。
- [x] 完全採用原生 Vanilla CSS，具備頂級深色毛玻璃金融終端質感。
