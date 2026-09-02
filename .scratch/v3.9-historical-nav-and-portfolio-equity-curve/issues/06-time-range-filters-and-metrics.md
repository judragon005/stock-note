# 06 — 週期篩選器與關鍵績效指標統計 (Time Range Filters & Performance Metrics)

**What to build:** 實作數據切片與指標計算模組。支援快速過濾 `1M` / `3M` / `6M` / `1Y` / `YTD` / `ALL` 區間數據，並計算指定區間內的最大回撤 (Max Drawdown, MDD)、歷史最高淨值 (ATH)、區間累積報酬率 (%) 與年化報酬率 (CAGR)。

**Blocked by:** 05 — 每日持股重播與 NAV 總報酬計算核心

**Status:** ready-for-agent

- [ ] 實作 `filterNavSeriesByRange(series, range)` 支援時間區間切片
- [ ] 實作 `calculatePerformanceMetrics(filteredSeries)` 計算區間報酬、MDD、ATH 與 CAGR
- [ ] 撰寫單元測試驗證各種時間週期切片與指標統計之數學精確性
