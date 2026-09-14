# 03 — Complete Audited Quarter Sentry & Metric Normalization

**What to build:**
建立「正式審計季度過濾哨兵」。自動檢驗季度完整性，過濾僅有營收、尚未申報稅後淨利與資產負債的空殼季度（如 26Q2）。將 0 秒戰報、四大體質卡片、杜邦分析嚴格錨定於「最新完整申報季」，徹底消滅 `淨利率 0.0%`、`負債比 -`、`CFO 0 億` 之假陽性空白。

**Blocked by:** 02-cache-integrity-sentry-and-auto-healing.md

**Status:** done

- [x] 檢驗季度完整性，過濾未申報空殼季度
- [x] 0 秒戰報與四大體質卡片錨定最新完整申報季
- [x] 頂部週期標註明確呈現審計季度（如 `2025-Q2`）
- [x] 單元測試驗證空殼季度自動過濾
