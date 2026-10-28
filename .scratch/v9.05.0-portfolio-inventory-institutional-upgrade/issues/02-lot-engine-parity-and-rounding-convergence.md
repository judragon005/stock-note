# 02 — 批次撮合引擎全型別支援與除權息尾差平滑 (Lot Engine Parity & Rounding Convergence)

**What to build:**
補齊 `lotEngine.ts` 對 `ADJUSTMENT`、`SPIN_OFF`、`STOCK_MERGER`、`MARGIN_BUY`、`MARGIN_SELL` 等法人級交易型別的處理邏輯，與 `calculator.ts` 保持 100% 同步。配股、減資除權息過程之浮點數截斷微量尾差自動收斂平滑，消除負數或殘留畸零股。

**Blocked by:** 01 — 美股加權成本匯率與累計報酬率分母重構

**Status:** ready-for-agent

- [ ] 批次引擎與 `calculator.ts` 在所有法人級特殊交易型別下的庫存與成本運算結果 100% 一致
- [ ] 模擬無償配股配發零股後全數賣出，剩餘股數精確歸零，無 `0.00000001` 等殘留

