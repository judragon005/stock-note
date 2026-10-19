# 05B — Layer 6 四欄等高網格拓撲重構與 250px 防破版佈局對齊

**Parent:** #290

**What to build:**
重構 `AiForceDashboardView.tsx` Layer 6 網格：
- 欄 1：`EnergySentimentTwinCard`（Card 10 + 13 雙子容器）
- 欄 2：Card 12（AI 主力動態信號）
- 欄 3：`ValuationMetricsCard`（Card 21 全新估值卡）
- 欄 4：Card 14（AI 信心維度）
網格鎖定 `minHeight: 250px` 與 `alignItems: 'stretch'`，四欄 1:1 像素級齊平，徹底消除縱向變形破版。

**Blocked by:** 04B, 04C, 05A

**Status:** completed

## Acceptance Criteria
- [x] Layer 6 網格包含 4 欄：雙子容器、Card 12、Card 21、Card 14。
- [x] 四欄等高齊平，高度鎖定約 250px，無拉長破版問題。
- [x] 在桌面與平板螢幕自適應排版正常。
- [x] 單元測試通過。
