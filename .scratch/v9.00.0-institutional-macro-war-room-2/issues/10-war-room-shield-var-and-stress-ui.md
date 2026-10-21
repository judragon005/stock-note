# 10 — 個人防護盾 VaR、FX Delta 與 3 階壓力測試互動 UI

**Parent:** #283

**What to build:**
於戰情室個人防護盾面板直觀展示 1-Day 95% 在險價值（VaR）與美股部位的台幣匯率敏感度（FX Delta），並提供 `[-10%] 震盪`、`[-20%] 回檔`、`[-30%] 崩盤` 3 階壓力測試按鈕，點擊即時呈現維持率變化與追繳缺口警報。

**Blocked by:** 04-portfolio-var-and-fx-delta, 05-portfolio-stress-test-matrix

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 個人防護盾區塊呈現「單日 95% 在險價值 (VaR)」卡片，顯示潛在最壞損失金額與佔 NAV 百分比。
- [ ] 呈現「美股匯率敏感度 (FX Delta)」卡片，顯示台幣升值 1 元之損益影響。
- [ ] 提供 `[-10%]`, `[-20%]`, `[-30%]` 互動切換 Tab/按鈕，點擊後即時展開試算維持率、與追繳保證金缺口。
- [ ] 零借款使用者顯示「無負債・安全無虞」綠色徽章，避免無效警告干擾。
