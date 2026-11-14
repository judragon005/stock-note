# 02 — 股利歷史表格四態膠囊完整渲染與防隱形防禦 (Dividend History Table Resilient Pill Rendering)

**Parent:** https://github.com/judragon005/stock-note/issues/539

**What to build:**
重構 `src/components/dividend/DividendHistoryTable.tsx` 填息欄位渲染邏輯。徹底移除現有 `if (!fillStatus) return null` 類的條件短路，建立 `DividendFillStatusBadge`。無論個股在庫存中、已清倉或缺少除息價，100% 渲染自癒膠囊，徹底解決「填息膠囊無故消失」的缺陷。

**Blocked by:** 01 — 填息研判引擎四態擴充與清倉回溯計算 (Fill Status Engine Tri-State Evolution)

**Status:** ready-for-agent

- [ ] 移除 `DividendHistoryTable.tsx` 中對 `fillStatus` 的空值短路，全面改用 Ticket 01 之自癒狀態推導
- [ ] 實作四態對應之 Glassmorphism 膠囊顏色與邊框（FILLED 翡翠綠、UNFILLED 玫瑰紅、CLOSED_POSITION 藍灰、PENDING_DATA 琥珀微光）
- [ ] 更新 `src/components/dividend/DividendHistoryTable.test.tsx`，驗證清倉標的與缺價標的之膠囊 100% 渲染且無空白列
