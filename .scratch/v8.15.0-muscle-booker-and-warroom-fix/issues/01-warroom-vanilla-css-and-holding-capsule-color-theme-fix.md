# Ticket #1: 宏觀戰情室 Vanilla CSS 樣式重塑與膠囊色彩模式連動修復

- **狀態**：`CLOSED`
- **標籤**：`ready-for-agent` · `UI` · `CSS` · `ColorTheme` · `WarRoom`
- **關聯 PRD**：[docs/specs/0096-muscle-booker-workspace-and-war-room-styling-fix-spec.md](../../../docs/specs/0096-muscle-booker-workspace-and-war-room-styling-fix-spec.md)
- **優先級**：`P0`

---

## 1. 任務目標
1. 重構 `src/components/WarRoomWorkspace.tsx`：
   - 移除無效的 Tailwind 類別，全面套用原生 Vanilla CSS 與專案設計系統變數。
   - 建立優雅的毛玻璃金融終端佈局（網格、卡片陰影、間距、排版）。
2. 修正 `src/components/common/HoldingSignalCapsules.tsx`：
   - 將 `getSignalCapsuleStyle` 中的固定色彩替換為 CSS 變數：`var(--gain-color)`、`var(--loss-color)`、`var(--gain-bg)`、`var(--loss-bg)`。
   - 支援頂部「台股紅漲綠跌 / 國際綠漲紅跌」按鈕動態切換。

## 2. 驗收標準
- [x] 宏觀戰情室在無 Tailwind 環境下外觀專業精美，排版完整正常。
- [x] 切換紅綠主題模式時，多空膠囊顏色即時反轉對齊。
