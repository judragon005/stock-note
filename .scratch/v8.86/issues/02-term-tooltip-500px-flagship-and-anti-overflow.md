# Ticket 02: TermTooltip 500px 寬幅旗艦彈窗、防溢出算法與防抖優化

## 關聯規格
- Spec: `docs/specs/0174-ai-force-dashboard-visual-master-layout-and-tooltip-spec.md` (3.2 / AC 2.1 ~ 2.4)

## 問題背景
現行 TermTooltip 寬度寫死 320px、最大高度 400px，字體多為 11px，邊距僅 6px~8px。在桌機端使用時，文字頻繁折行，底部「當前個股即時診斷」經常被截斷且出現內滾軸，極為侷促。此外，邊界定位算法 `calculateTooltipPlacement` 寫死 320x280px，若單純放大寬度而不修改邊界計算，在螢幕右側卡片觸發時會被視窗邊緣硬生生裁切出界。

## 任務細節
1. 修改 `src/components/common/TermTooltip.tsx`：
   - 升級容器規格：`TOOLTIP_POPUP_CONFIG.width` 改為 `500px`，`maxWidth` 設為 `calc(100vw - 24px)`，`maxHeight` 放寬至 `580px`，內距改為 `16px 18px`。
   - 字體層級調整：
     - 標題列：繁體標題 16px (bold, #67e8f9)，英文 12px (#94a3b8)，關閉按鈕 15px。
     - 💡 白話比喻：內距 10px 12px，標題 13px，內文 13px，行高 1.65。
     - 📊 指標含義：標題 12.5px，內文 12.5px。
     - 🎯 買賣操作指引：買訊（🟢）/ 賣訊（🔴）文字 12.5px，加粗對比高亮。
     - ⚡ 當前個股即時診斷：金黃高亮邊框卡片，文字 13px，完整展開零截斷。
   - 邊界防溢出算法重構：`calculateTooltipPlacement` 預設常數改為 `{ width: 500, height: 380 }`，並修正 `left = Math.max(12, Math.min(viewport.width - 500 - 12, left))`。
   - 懸浮防抖：在 `handleMouseEnter` 中加入 80ms 延遲定時器，避免滑鼠劃過時巨型卡片閃現干擾。
2. 更新單元測試 `src/components/common/TermTooltip.test.tsx`（或對應測試檔）：
   - 驗證 500px 彈窗之 DOM 樣式規格。
   - 驗證邊界計算函式在近螢幕右側時正確觸發 `horizontal: 'right'` 且 left 值受邊界鉗位保護。

## 驗收標準
- [x] `npm test` 相關 TermTooltip 測試 100% 通過。
- [x] 桌面端點擊或懸停詞條時，彈窗以 500px 寬幅舒展呈現，字體清晰，無內部滾動條與文字截斷。
- [x] 在螢幕最右側邊緣觸發時，彈窗完整顯示在視窗內部，無水平溢出裁切。

