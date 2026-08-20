# 04 — 掃描彈窗狀態與持股/交易表格全市場特殊行動呈現 (Scanner Modal & Holdings/History UI)

**What to build:**
升級 `src/components/CorporateActionScannerModal.tsx`、`src/components/HoldingsTable.tsx` 與 `src/components/TradeHistoryTable.tsx`。在掃描彈窗呈現純線上即時掃描進度、標的連線狀態（🟢 即時 API / ⚠️ 連線異常）與手動重試按鈕；在持股庫存表中針對 9927 減資縮股、合併換股或分拆標的呈現清晰的股數對照與時間軸展開；在交易明細表擴充 12 種事件專屬徽章。

**Blocked by:** 01 — 事件流模型擴充與特殊公司行動會計核心, 02 — 全市場純線上多源掃描模組

**Status:** completed

- [x] 在 `CorporateActionScannerModal.tsx` 中升級掃描連線狀態徽章（🟢 全市場純線上即時掃描）。
- [x] 驗證並支援一鍵批次補登現金減資、股票分割、除權息等所有公司行動。
- [x] 在 `TradeHistoryTable.tsx` 中補齊 5 大特殊公司行動標籤徽章樣式（換股合併、特別股贖回、企業分拆、可轉債換股、公開收購）。
- [x] 驗證 9927 現金減資端到端補登流程：持股自動縮減至 7,172 股，成本扣減 $28,280，均價重新平滑。
