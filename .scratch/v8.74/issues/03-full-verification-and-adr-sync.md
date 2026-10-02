# 03 — 全量整合驗收與 ADR-0161 架構決策文檔

**What to build:** 執行全專案 162+ 測試套件回歸驗證、TypeScript 型別安全驗證；同步建立 `docs/adr/0161-market-freshness-service-decoupling.md` 並更新全量交接手冊。

**Blocked by:** 01 — 獨立抽取市場新鮮度服務與單元測試, 02 — 中介層委託服務解耦與向後相容驗證

**Status:** done

- [x] 建立 `docs/adr/0161-market-freshness-service-decoupling.md`
- [x] 更新 `docs/handoff/handoff_stock_tracker_final.md` 至 V8.74.0
- [x] 執行相關單元測試 (確保 100% 綠燈)
- [x] 準備全量回歸驗收
