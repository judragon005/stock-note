# 06 — 均線扣抵表分頁器與單卡 React.memo 級聯隔離

**What to build:**
1. 在 `DeductionTelescopeTable.tsx` 導入成熟的 50 / 100 / ALL 分頁控制器（借鑒 `TradeHistoryTable`），表格 DOM 節點減少 95%。
2. `MuscleStockCard.tsx` 封裝 `React.memo`，切斷展開單卡時引發的 3,000+ 張卡片級聯重繪。
3. 剪貼簿操作全面替換為專案現成 `src/utils/clipboard.ts` 中的 `copyTextToClipboard`。
4. 幣別價格格式化收斂至 `src/utils/formatters.ts`。

**Blocked by:** 05 — Apple 風格分段視圖控制器與觀望池折疊收納

**Status:** ready-for-agent

- [x] `DeductionTelescopeTable.tsx` 加入分頁狀態與控制條
- [x] `MuscleStockCard.tsx` 封裝為 `React.memo`
- [x] 替換 `copyTextToClipboard` 與 `formatCurrencyAmount`
- [x] 單元測試驗證分頁與格式化
