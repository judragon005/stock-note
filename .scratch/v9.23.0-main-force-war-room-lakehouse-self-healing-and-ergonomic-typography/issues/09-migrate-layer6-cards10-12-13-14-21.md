# 09 — Migrate Batch 3：Layer 6 能量情緒、信號、估值與信心卡片重構（Card 10·13, 12, 21, 14）

**Parent:** #590 (Spec 0238)
**What to build:** 配合 Layer 6 雙欄（`minmax(440px, 1fr)`）倍增寬度，全面重構 `EnergySentimentTwinCard`（Card 10·13）、`DynamicSignalsCard`（Card 12）、`ValuationMetricsCard`（Card 21）與 `AiConfidenceCard`（Card 14）的內部字級與間距，徹底消除 `0.58rem~0.62rem` 微字與 82px 三宮格擠壓，並將 `#64748b` 升級為 `#94a3b8`。
**Blocked by:** 04 — Card 20 & 21 ETF 資產多型合流, 06 — Expand：戰情室人體工學字級契約、Layer 6 雙欄矩陣與頂部 Bar 升級
**Status:** ready-for-agent

- [ ] `ValuationMetricsCard`（25 處微字）與 `EnergySentimentTwinCard`（6 處 `0.62rem`）全數升級至 `>= 0.75rem (12px)`。
- [ ] `DynamicSignalsCard` 與 `AiConfidenceCard` 進度條與診斷文全數達到 `>= 12px` 且具備充足留白。
- [ ] Layer 6 四張卡片達到 `0` 處 `< 12px` 字級與 `0` 處 `#64748b` 文字。
