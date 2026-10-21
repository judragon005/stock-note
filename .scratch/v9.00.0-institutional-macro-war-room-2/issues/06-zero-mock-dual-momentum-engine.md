# 06 — 徹底剷除假數據：真實歷史日 K 驅動雙重動能輪動

**Parent:** #283

**What to build:**
落實專案 `zeroMockPolicy`，徹底移除 `WarRoomWorkspace.tsx` 內 145 行寫死假數據 `MOCK_MOMENTUM_PRICES`，將雙重動能模組改由真實時序日 K 線（若本地湖倉或行情快取已存在則直接計算，無快取時平滑顯示提示與即時抓取），並精準計算 12-1M 滾動動能得分與 4% 無風險利率避風港。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 徹底刪除 `src/components/WarRoomWorkspace.tsx` 內的 `MOCK_MOMENTUM_PRICES` 常數及其關聯死代碼。
- [ ] 支援外部傳入真實歷史價格陣列（如來自 IndexedDB/Lakehouse/市場快取），並維持零報錯。
- [ ] 當某標的缺乏足夠天數之歷史數據時，動能分數安全標記為 0 或顯示資料載入中，絕不白屏崩潰。
- [ ] 單元測試 `src/engine/dualMomentumEngine.test.ts` 驗證真實日 K 輸入時之排序與 4% 現金避風港觸發邏輯。
