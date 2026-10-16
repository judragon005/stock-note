# Ticket 05 — 端到端全量驗收、文檔同步與交付閉環

**What to build:**
完成前四張票券之端到端整合驗收，執行：
1. 本地 `npm test` 確保所有測試 100% 綠燈通過。
2. 本地 `npm run build` 確保 TypeScript 編譯 0 錯誤。
3. 執行交接閉環，更新交接文檔與 ADR 索引。

**Blocked by:**
- Ticket 01 — 台股湖倉水位線與缺口自動探測核心 (`detectTwDateGaps`)
- Ticket 02 — 真·零延遲快取跳過與 ETA 時間權重校準 (Zero-Delay Cache Skip)
- Ticket 03 — 總控引擎與中介層端點自適應回補整合 (`days=auto` & 美股日常增量)
- Ticket 04 — 排程中心控制台 UI 顆粒度升級與智慧補缺預設 (`MarketScheduleHubSection`)

**Status:**
closed

**Acceptance criteria:**
- [x] `npm test` 100% 通過（無回歸破壞）。
- [x] `npm run build` 0 錯誤。
- [x] 工作區乾淨，更新 PR 描述準備合併。
