# 01 — 純函數量化計算引擎與小白友善診斷器 (Smart Money Engine & Beginner Diagnosis)

**What to build:**
建立跨市場（台股與美股）純函數量化籌碼核心引擎，涵蓋：
1. 台股三大法人買賣超標準化換算（買超張數/金額轉化、投外本比估計）。
2. 美股 20 日 CMF（Chaikin Money Flow 佳慶資金流向）演算法與量價散度計算。
3. 四象限座標無量綱標準化映射（$X, Y \in [-100, +100]$，以 0 軸為中心中軸）。
4. 自動生成零基礎新手專屬之「大白話診斷結論」與「四象限生活化標籤」（如 `🔥 主力抬轎飆股區`、`⚠️ 割韭菜警戒區`、`🛡️ 逢低撿便宜區`、`❄️ 冷凍提款區`）。

**Blocked by:** None — can start immediately.

**Status:** closed

- [x] 支援傳入標的日 K 線與法人買賣超數據，正確計算台股籌碼流向強度
- [x] 支援基於 High, Low, Close, Volume 數據精準計算美股 20 日 CMF 值（範圍 $[-1.0, +1.0]$）
- [x] 將台美股數值無量綱標準化映射至 $[-100, +100]$ 畫布坐標系
- [x] 依象限與動能輸出直白的人類診斷結論標籤（`BREAKOUT`、`ACCUMULATION`、`DISTRIBUTION`、`LIQUIDATION`）
- [x] 撰寫完整獨立的 Vitest 單元測試，測試覆蓋率達 100% 綠燈

