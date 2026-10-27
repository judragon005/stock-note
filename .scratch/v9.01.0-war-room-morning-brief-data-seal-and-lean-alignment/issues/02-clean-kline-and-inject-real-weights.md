# 02 — 拔除假造 K 線並提取真實部位權重與損益 (Clean Kline & Inject Real Weights)

**Parent:** Spec 0204 (Ticket 02)

**What to build:**
修改 `src/components/WarRoomWorkspace.tsx` 中的 `holdingSignals` 提取邏輯。
1. 徹底拔除 `volume: 10000` 與 `high: c * 1.01`, `low: c * 0.99` 假造 K 線邏輯。若無真實成交量，傳入 `volume: 0`，讓肌肉書僮回退為純收盤價箱體防守，杜絕量化欺騙。
2. 計算並傳入各檔標的的 `shares`, `costBasis`, `currentPrice`, `marketValueTWD`, `weightPercent`, `unrealizedPnlPercent`, `boxTop`, `boxBottom`。

**Blocked by:** Ticket 01

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 在 `WarRoomWorkspace.tsx` 的 `holdingSignals` extraction 區塊中：
  - 徹底移除 `volume: 10000` 與 `c * 1.01`, `c * 0.99`。若有日 K 資料，使用其真實值；若只有收盤價，`volume` 設為 0，`high`/`low` 設為 `c`。
  - 對每一檔 `h`（`holdings.filter(h => h.shares > 0)`）：
    - 計算部位台幣市值 `marketValueTWD = h.shares * (h.currentPrice || 0) * (h.market === 'US' ? usdToTwdRate : 1)`。
    - 計算權重 `weightPercent = totalNavTwd > 0 ? (marketValueTWD / totalNavTwd) * 100 : 0`。
    - 計算損益率 `unrealizedPnlPercent = h.costBasis > 0 ? ((h.currentPrice - h.costBasis) / h.costBasis) * 100 : 0`。
    - 傳入 `MacroHoldingSignalInput`。
- [ ] 確保在戰情室載入時無 `NaN` 或 `undefined`，數值四捨五入至小數點後一位。
