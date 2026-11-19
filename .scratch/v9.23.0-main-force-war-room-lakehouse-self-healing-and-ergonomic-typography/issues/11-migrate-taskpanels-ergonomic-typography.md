# 11 — Migrate Batch 5：任務頁籤 2~5 技術面板與明細表人體工學升級（TaskPanels）

**Parent:** #590 (Spec 0238)
**What to build:** 將 `TaskPanels.tsx`（任務二技術警示報告、任務三 KD+MA、任務四 MACD、任務五原始資料表）內共 36 處 `10px/11px` 微字與 6 處 `#64748b` 低對比文字全面升級至 `>= 12px` 與 `#94a3b8` 以上，確保多週期副圖與歷史資料明細表同樣具備舒適閱讀體驗。
**Blocked by:** 06 — Expand：戰情室人體工學字級契約、Layer 6 雙欄矩陣與頂部 Bar 升級
**Status:** ready-for-agent

- [ ] `TaskPanels.tsx` 內 36 處 `< 12px` 字級全面升級至 `>= 12px`。
- [ ] `TaskPanels.tsx` 內 6 處 `#64748b` 文字全面升級至 `#94a3b8` / `#cbd5e1`。
- [ ] 既有 TaskPanels 相關單元測試 100% 通過。
