# 02 — ADX Chop Discount & Contradiction Penalty Scorer

**What to build:** 
升級多空共振評分儀 `calculateOmniScore`。當市場處於無趨勢盤整（ADX < 20）時，將趨勢維度得分乘上 0.4 折扣；當均線多頭排列但 -DI > +DI 時，扣除矛盾懲罰 20 分並強制將總評分上限封頂在 58 分 (`NEUTRAL`)，並觸發 `ALERT_DI_CONTRADICTION`。

**Blocked by:** 01 — Market Regime Evaluator & Pure State Machine

**Status:** ready-for-agent

- [x] 實作趨勢分數鈍化折扣係數計算
- [x] 實作均線多頭 vs -DI > +DI 矛盾懲罰與 58 分封頂邏輯
- [x] 單元測試驗證使用者回饋情境（ADX 5.94, -DI 30.38 > +DI 26.77）總分絕不超過 58 分且標註矛盾
