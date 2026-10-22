# 13 — 美股 1,500 檔歷史補齊與日常 5 秒增量補漏整合

**Category:** enhancement
**Status:** closed
**Blocked by:** 09 — 台股財報分析管線 Lakehouse-First 重構, 10 — 美股財報分析管線 Lakehouse-First 重構, 11 — Tiingo 美股行情抓取與 Yahoo 429 降級備援守衛, 12 — 台股 250 交易日官方日報全量歷史補齊腳本

**What to build:**
使用者可透過統一指令（如 `npm run backfill:full`）一次性完成台美雙市場歷史數據的完整冷啟動（台股 250 天 + 美股 1,500 檔歷史日 K + 官方 ETF/董監/財務三表）。日常開機時，排程僅需 5 秒鐘針對最新 1~2 天進行微量填補，徹底實現「一次全量注水、日常極速補漏」。

**Acceptance criteria:**
- [x] 於 `package.json` 配置 `npm run backfill:full` 統一調度腳本
- [x] 支援美股 1,500 檔 250 天歷史日 K 全量注水（Yahoo 主用 + Tiingo 備援）
- [x] 整合日常增量排程：開機時以 `sync_checkpoints` 自動偵測僅補漏最新 1~2 天，5 秒內快速完成
- [x] 執行全量 `npm test` (100% 通過) 與 `npm run build` (0 錯誤)

