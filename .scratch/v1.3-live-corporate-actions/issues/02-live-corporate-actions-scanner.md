# 02 — 全市場純線上多源掃描模組 (Full Market Live Scanner & TWSE OpenAPI)

**What to build:**
升級 `src/engine/corporateActionScanner.ts`。串接台灣證交所 (TWSE) 官方 OpenAPI（`TWT48U_ALL` 減資預告表、`TWT49U_ALL` 除權除息預告表）與櫃買中心 (TPEx) 上櫃/債券資料源，直連美股 Yahoo Finance API；實作多重 CORS 代理池自動輪詢；廢除靜態假資料庫；依持股「最早買進日」至「今日」時間窗口動態拉取歷史事件，並支援指數退避自動重試與單一標的重試。

**Blocked by:** 01 — 事件流模型擴充與特殊公司行動會計核心

**Status:** completed

- [x] 實作 TWSE OpenAPI 減資預告表 (`TWT48U_ALL`) 與除權息預告表 (`TWT49U_ALL`) 資料解析。
- [x] 支援台股上市 (`.TW`)、上櫃 (`.TWO`)、股票/債券 ETF 及美股全市場代碼正規化。
- [x] 建立多重 CORS 代理池自動切換機制（`corsproxy.io`, `api.allorigins.win` 等）。
- [x] 廢除靜態假資料庫 `BUILT_IN_EVENT_REGISTRY`，全面採用純線上即時資料。
- [x] 實作自動時間窗口劃定（最早買進日至今日）與事件查重比對。
- [x] 撰寫 `corporateActionScanner.test.ts` 單元測試驗證台股減資解析與重試機制。
