# Issue 01: 三色實戰導航儀動作總數對齊與 HOLD 狀態歸併

## 狀態

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`bug`, `ui`, `engine`, `muscle-booker`

## 需求說明

1. 在 `MuscleBookerWorkspace.tsx` 與 `muscleBookerEngine.ts` 中，將達瓦斯箱體常態整理之 `HOLD` 狀態在前端三色篩選體系中歸併至黃燈「觀望待變／不碰」。
2. 確保「建議買進 + 觀望待變 + 建議賣出」各組數量相加精確等於「全部標的」總數（即 $10 + 5 + 1 = 16$）。
3. 實戰動作篩選列點擊「觀望待變」時，列表同時包含均線壓頂、布林壓縮與箱內整理標的。

## 實作成果

- 已於 `MuscleBookerWorkspace.tsx` 中將 `avoidItems` 與 `actionFilter === 'AVOID'` 條件擴充為包含 `action === 'AVOID' || action === 'HOLD'`。
- 動作篩選按鈕與三色導航儀黃色區塊數量精確對齊為 5 檔，三色合計 $10 + 5 + 1 = 16$ 與全部標的 (16) 完全一致。
- 單元測試新增驗證並 100% 通過。
