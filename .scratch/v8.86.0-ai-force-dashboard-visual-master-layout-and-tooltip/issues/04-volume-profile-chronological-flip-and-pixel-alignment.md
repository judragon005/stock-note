# Ticket 04: Card 04 AI 籌碼熱區圖時間軸由遠及近翻轉與 1:1 像素對位

## 關聯規格
- Spec: `docs/specs/0174-ai-force-dashboard-visual-master-layout-and-tooltip-spec.md` (3.4 / AC 4.1 ~ 4.2)

## 問題背景
現行 Card 04（AI 籌碼熱區圖）時間軸為由近到遠（左側近5日 ➔ 右側近60日），違反日 K 線由歷史到當前（左至右）之常規視覺直覺，且最新籌碼被放置在遠離「現價指針」的最左側。此外，底部天期文字使用硬編碼 `paddingLeft: 32px; gap: 8px`，與上方熱力色塊完全錯位脫節。

## 任務細節
1. 修改 `src/components/aiForceDashboard/cards/VolumeProfileCard.tsx`：
   - 翻轉熱力資料欄位數列：
     - 由 `[col-1(5日), col-2(10日), col-3(20日), col-4(60日)]` 翻轉為：
     - `[col-4(近60日), col-3(近20日), col-2(近10日), col-1(近5日)]`。
     - 確保最右側欄位為最新「近 5 日」，緊鄰金色「現價指針」與 POC 大量峰圖例。
   - 底部天期標籤結構重構：
     - 移除舊版 `paddingLeft: 32px; gap: 8px` 的浮動排版。
     - 建立與上方繪圖區完全對齊的 3 欄 Grid/Flex 佈局：
       - 左側：與價格刻度相同寬度之隱藏佔位區。
       - 中間：採用與熱力柱一致的 `display: flex; gap: 5px; padding: 0 4px` 容器，內含 4 個 `flex: 1` 且文字置中的節點（`近60日`、`近20日`、`近10日`、`近5日`）。
       - 右側：與圖例區相同寬度之隱藏佔位區。
     - 保證每個天期標籤 100% 垂直對準上方對應欄位方塊之中心線。
2. 更新單元測試 `src/components/aiForceDashboard/cards/VolumeProfileCard.test.ts`：
   - 驗證 `heatmapColumns` 陣列首項為 `col-4`（近60日）、末項為 `col-1`（近5日）。
   - 驗證底部時間軸文字容器與上方欄位之 DOM 結構對齊特性。

## 驗收標準
- [x] `npm test src/components/aiForceDashboard/cards/VolumeProfileCard.test.ts` 100% 通過。
- [x] 籌碼熱區圖由左至右呈現「近60日 ➔ 近20日 ➔ 近10日 ➔ 近5日」。
- [x] 底部天期文字在不同螢幕寬度下，均精確置中對齊上方熱力方塊，無任何像素偏差。

