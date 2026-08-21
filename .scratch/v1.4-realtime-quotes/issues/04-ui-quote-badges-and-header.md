# 04 — 持股列表狀態徽章、漲跌標籤與頂部狀態更新 UI 整合 (Ticket 4)

**GitHub Issue:** [#50](https://github.com/judragon003/-/issues/50)

**What to build:**
更新 `src/index.css`、`src/components/Header.tsx`、`src/components/HoldingsTable.tsx` 與 `src/App.tsx`。在持股表格呈現 🟢 盤中即時/延遲、🟡 昨日收盤價、🔒 自訂鎖定、⚠️ 離線快取四大徽章與當日漲跌額幅；新增單檔 🔒 鎖定切換與 🔄 立即刷新；在頂部新增「⚡ 一鍵更新市價」按鈕（含旋轉動畫）與開休市狀態/時間戳標籤；在 `App.tsx` 串接 `usePriceAutoRefresh` 並自動連動資產計算與圖表。

**Blocked by:** 01-price-fetcher-engine, 02-quote-storage-and-locking, 03-auto-refresh-hook

**Status:** completed

- [x] 在 `index.css` 新增 `.badge-realtime`、`.badge-prevclose`、`.badge-locked`、`.badge-cached`、`.spin-animation` 樣式。
- [x] 在 `HoldingsTable.tsx` 整合狀態徽章、當日漲跌幅色塊、單檔鎖定切換與刷新按鈕，並抽出 `<PriceDisplayView />` 子元件。
- [x] 在 `Header.tsx` 新增「⚡ 一鍵更新市價」按鈕、開休市狀態標籤與最後更新時間戳。
- [x] 在 `App.tsx` 完整串接 Hook 與 props，手動編輯市價時自動套用鎖定防禦。
- [x] 全量單元測試 66/66 100% 通過，TypeScript 編譯 0 錯誤。
