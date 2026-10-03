# 03 — 美股符號相容轉譯正規化器與 Checkpoints 失敗修復

**What to build:** 
建立美股標的代碼正規化器 (`normalizeUsSymbol`)，將含點號之主流代碼（如 `BRK.A` ➔ `BRK-A`、`BRK.B` ➔ `BRK-B`、`BF.B` ➔ `BF-B`）精確轉譯為 Yahoo Finance 可辨識格式。在 `scripts/market-sync/sync-us-market.cjs` 與 Checkpoint 模組中套用，修復目前 351 檔 FAILED 標的。

**Blocked by:** None — can start immediately

**Status:** done

- [x] 在 `scripts/market-sync/market-sync-core.cjs` 實作 `normalizeUsSymbol(rawSymbol)` 函式
- [x] 整合進 `ingest-us-quotes.cjs`、`sync-us-market.cjs` 與 `us-sync-checkpoint-engine.cjs`，在發起網路請求與比對 Checkpoint 時正確轉換
- [x] 撰寫單元測試 `tests/market-sync/us-symbol-normalizer.test.ts` (實作於 `src/engine/usSymbolNormalizer.test.ts`)，驗證各類美股符號轉譯皆 100% 正確
- [x] 清除並重設失敗標的為 PENDING，驗證符號相容性管線就緒
