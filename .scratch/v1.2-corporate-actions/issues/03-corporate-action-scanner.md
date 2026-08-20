# 03 — 智慧金融掃描與一鍵批次補登模組 (Corporate Action Scanner & Batch Entry Modal)

**What to build:**
實作 `src/engine/corporateActionScanner.ts` 與 `src/components/CorporateActionScannerModal.tsx`。整合 Yahoo Finance 免費 API 與內建離線備援資料庫，對比使用者歷史持有區間內的所有除權息、分割與減資事件，依據基準日持股自動計算預估配息與配股，並於 Header 提供一鍵入口與批次補登介面。

**Blocked by:** 01 — 時序回溯與公司行動會計核心

**Status:** completed

- [x] 實作 `fetchLiveCorporateEvents` 整合 Yahoo Finance API（含 CORS 代理與 4s 逾時降級機制）。
- [x] 內建 `BUILT_IN_EVENT_REGISTRY` 提供離線/斷網備援資料庫。
- [x] 實作 `scanCorporateActions` 查重比對與自動計算待補登事件。
- [x] 建立 `CorporateActionScannerModal.tsx`，支援全選/單選、資料源狀態標籤與一鍵批次補登。
- [x] 於 `Header.tsx` 整合「✨ 智慧掃描」按鈕。
- [x] 撰寫 scanner 單元測試確保查重與換算精確。
