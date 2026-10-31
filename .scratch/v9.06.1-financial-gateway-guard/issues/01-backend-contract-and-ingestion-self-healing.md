# 01 — 後端合約收斂與輸入網關自愈 (Backend Contract & Ingestion Gateway Self-Healing)

**What to build:**
修復後端 `ingest-macro-sentiment.cjs` 回傳之標量欄位命名污染，將 `dxy`、`vix`、`gold` 強制輸出為標量數值 (`?.price ?? null`)，Quote 實體物件統一歸入 `quotes`。同時升級 `src/utils/macroPulseStorage.ts` 的 `sanitizeMacroRecord`，建立 `toFiniteNumber(val, fallback)`，自動從任何行情物件中拆解取出 `.price`，徹底修復並自愈瀏覽器 LocalStorage 舊有殘留之髒數據。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `scripts/market-sync/ingest-macro-sentiment.cjs` 根屬性 `dxy`、`vix` 輸出純數值，Quote 物件留於 `quotes` 內。
- [ ] `src/utils/macroPulseStorage.ts` 的 `sanitizeMacroRecord` 導入 `toFiniteNumber`，遇到行情物件自動解出 `.price`，確保數值欄位 100% 為純標量。
- [ ] 既有總經存儲單元測試 `src/utils/macroPulseStorage.test.ts` 新增行情物件輸入時的自動解包自愈測試。

