# Ticket 05: 卡片 04 AI 籌碼熱區圖動態 60 日聚焦、幽靈網格與現價指針

## 關聯規格
- Spec: `docs/specs/0172-ai-force-war-room-comprehensive-layout-and-quant-engine-refactor-spec.md` (Story 4 / AC 4.1, AC 4.2, AC 4.3)

## 問題背景
卡片 04（AI 籌碼熱區圖）縱軸採用歷史 250 天極值（如威剛 140~525 元），而近 60 日股價主要集中在 362~380 元，導致上下 7 格全黑無成交量；且未成交之格子採用背景色直接隱形，造成嚴重視覺空洞與破圖感，且缺乏最新價格位置指針。

## 任務細節
1. 修改 `src/engine/volumeProfileEngine.ts`：
   - 縱軸價格區間由全歷史極值改為「近 60 日蠟燭真實 high/low ± 5% 緩衝」，細緻切分 9 個價格層級。
   - 計算當前最新收盤價落於熱區圖之相對高度比例（`currentPriceYRatio`）。
2. 修改 `src/components/aiForceDashboard/cards/VolumeProfileCard.tsx`：
   - 未亮燈之格子給予微光幽靈網格（Ghost Grid）邊框 `rgba(255, 255, 255, 0.05)` 與微深色填充，維持完整 9×4 矩陣視覺結構。
   - 繪製最新收盤價水平指針線（白色/金色發光線 + 最新現價標籤）。
   - 右側圖例清晰標註「大量成交峰」與「籌碼真空帶」。
3. 同步更新 `volumeProfileEngine.test.ts` 與 `VolumeProfileCard.test.ts`。

## 驗收標準
- [ ] 威剛 3260 之熱區圖縱軸刻度貼近近 60 日行情（如 330~410 元），不再出現 140~525 元誇張跨度。
- [ ] 熱區圖 4 欄週期呈現豐富色階（綠/藍/黃/橙），不再上下大面積全黑。
- [ ] 清楚顯示最新收盤價（362.5 元）水平參考線。
