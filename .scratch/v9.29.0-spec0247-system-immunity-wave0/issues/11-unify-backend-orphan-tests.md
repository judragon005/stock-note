# 11 — 收斂 10 支後端孤兒測試至單一執行契約並修復假函式自測

**Parent:** #609 (Spec 0247)

**What to build:** 統一 10 支孤兒後端測試至單一無依賴執行契約、消除重複測試檔、將台股同步守門假 Lambda 替換為真實生產檢核函式，建立 `test:backend` 腳本。

**Blocked by:** None — can start immediately

**Status:** done

- [x] `npm run test:backend` 一次執行全部後端同步測試套件並 100% 通過
- [x] 台股同步守門測試直接調用真實生產模組函式，零假 Lambda 自測
- [x] 無重複殘留之 SQLite 測試檔
