# 迭代主票券: v5.5.1 Tooltip 邊界防溢出與對齊引擎 (Tooltip Boundary Overflow Prevention & Alignment Engine)

- **關聯 PRD**: [docs/specs/0039-tooltip-boundary-overflow-prevention-and-alignment.md](../../docs/specs/0039-tooltip-boundary-overflow-prevention-and-alignment.md)
- **版本**: v5.5.1
- **分流狀態 (Triage Status)**: `COMPLETED` (全數完工驗收完畢)

---

## 🎯 迭代目標
解決 `LotsBreakdownModal.tsx` 頂部 Header 中 Tooltip 在外層容器 `overflow: hidden` 下向上及向右展開時產生的雙重邊界截斷問題，為全域共用 `Tooltip` 元件導入 `align="center" | "left" | "right"` 屬性支援與動態箭頭座標演算法，並補齊 TDD 單元測試。

---

## 📋 任務拆解看板 (Task Breakdown Board)

| 票券編號 | 任務名稱 | 預估工時 | 分流標籤 | 狀態 | 驗收結果 |
| :---: | :--- | :---: | :---: | :---: | :---: |
| [**#01**](01-tooltip-align-and-positioning-engine.md) | Tooltip 元件多維對齊擴充與箭頭動態定位演算法 | 1.0h | `ready-for-agent` | `RESOLVED` | ✅ 擴充 `align` 屬性，支援 `top`/`bottom` 下 `right`/`left` 對齊與箭頭 8px 內縮 |
| [**#02**](02-lots-modal-header-tooltip-integration-and-tests.md) | 彈窗 Header Tooltip 整合套用與 TDD 單元測試 | 1.0h | `ready-for-agent` | `RESOLVED` | ✅ 整合 `position="bottom" align="right"`，補齊 `Tooltip.test.ts` 8 項測試，237 測試綠燈通過 |
