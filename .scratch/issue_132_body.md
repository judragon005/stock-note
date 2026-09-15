## 🎯 需求概述 (Overview)

依據 [Spec 0132](docs/specs/0132-scheduled-market-sync-and-zero-latency-cache-spec.md) 規劃，建立每日收盤後全市場台美股數據定時同步、本地快取秒讀與零遺漏稽核系統。

## 🏢 背景與目標 (Context & Goals)

1. **台股市場**：每日下午 16:00 自動整包更新 TWSE/TPEx 三大法人籌碼 (T86)、收盤日 K (MI_INDEX) 並於本地 CPU 增量計算技術指標 (MA/RSI/MACD/Darvas 箱體)。
2. **美股市場**：每日上午 08:00 自動以雙層優先隊列更新日 K 線與技術指標，防禦 429 限流。
3. **零延遲秒讀**：持久化於本地快取目錄，前端打開首頁毫秒級瞬間讀取（0 網路延遲），背景非同步寫入 IndexedDB。
4. **零遺漏稽核 (Zero Data Loss)**：內建休市日曆過濾、Dead-Letter Queue 自動重試 3 次，產出 `sync_audit_report.json`。
5. **Windows 工作排程**：提供一鍵安裝腳本，自動在 Windows 工作排程器註冊每日 16:00 與 08:00 定時無感執行。

## 🧱 拆解任務票券 (Sub-tasks)

- [ ] Ticket 01: 台股全市場批次獲取與本地指標計算引擎 (`scripts/market-sync/sync-tw-market.cjs`)
- [ ] Ticket 02: 美股分級優先隊列與自適應限流引擎 (`scripts/market-sync/sync-us-market.cjs`)
- [ ] Ticket 03: 防漏水稽核與死信補跑機制 (`sync_audit_report.json`)
- [ ] Ticket 04: 前端零延遲快取載入器與 IndexedDB 同步 (`src/engine/marketCacheLoader.ts`)
- [ ] Ticket 05: 同步狀態指示徽章與稽核彈窗 (`src/components/MarketSyncStatusBadge.tsx`)
- [ ] Ticket 06: Windows 工作排程器一鍵安裝腳本 (`scripts/market-sync/setup-windows-task.bat`)
- [ ] Ticket 07: 全量回歸測試與構建校驗 (`npm test` 100% 通過)

## 🏁 完成定義 (Definition of Done)

- [x] 規格文件 `docs/specs/0132-scheduled-market-sync-and-zero-latency-cache-spec.md` 已 Approved
- [x] 本地任務票券鏡像已在 `.scratch/v8.47.0-scheduled-market-sync-and-zero-latency-cache/issues/` 建立
- [ ] 所有單元測試通過且覆蓋核心路徑
- [ ] `npm run build` 0 TypeScript 錯誤
