# 技術債 0039: AI 決策儀表板純前端 Canvas 快照下載演進

- **建立日期**: 2026-09-26
- **解決日期**: 待定
- **來源**: Code Review (Spec 0140 / Issue #93)
- **狀態**: `OPEN`
- **優先級**: `P3 (Low)`
- **標籤**: `Feature` · `Export` · `Canvas` · `UX` · `AiForceDashboard`

---

## 1. 現況與背景 (Context)

在 Spec 0140 (Issue #93) 「AI 主力行為判讀與全功能量化決策儀表板」的實作中，於 `src/components/aiForceDashboard/HeaderExportBar.tsx` 實現了多格式匯出功能（包括 JSON 結構化數據、CSV 量化數據表、文字總結報告及全頁列印模式）。

其中「下載儀表板 PNG」按鈕目前設計為引導 Toast 提示：
> 提示使用者可透過瀏覽器列印功能 (Ctrl+P) 另存為 PDF / 圖片，或於單張卡片右鍵另存向量圖形 (SVG)。

此設計符合當前 KISS 原則，避免了引入如 `html2canvas` 等體積龐大（>200KB）且對 CSS Grid / 現代色彩函數相容性較差的外部依賴。

---

## 2. 潛在價值與改善空間 (Impact & Motivation)

- **使用者體驗進一步提升**：部分使用者期望「一鍵點擊」即可直接下載整張 18 卡片 Bento-Grid 儀表板的合成 PNG 圖片，而不需跳出瀏覽器列印對話框。
- **純前端零依賴方案可行性**：現代瀏覽器支援使用原生 Canvas API (`OffscreenCanvas` 或 `HTMLCanvasElement`) 搭配 XMLSerializer 將 DOM 中的原生 SVG 序列化繪製成點陣圖，再匯出為 PNG DataURL。

---

## 3. 建議改善方案 (Proposed Solution)

未來可於 `src/engine/exportReportPipeline.ts` 封裝獨立的 Canvas 渲染器：
1. 走訪儀表板內的各卡片 SVG 節點，讀取 `viewBox` 與向量路徑。
2. 於原生 `<canvas>` 進行垂直拼接與文字背景鋪設。
3. 透過 `canvas.toBlob((blob) => saveAs(blob, 'ai-force-dashboard.png'))` 提供真正的一鍵 PNG 下載。
4. 若無特定效能損耗，可維持零外部依賴。

---

## 4. 預計觸發時機

當使用者明確提出需要將儀表板圖片自動分享至社群媒體、LINE 群組或進行日常截圖留存時。
