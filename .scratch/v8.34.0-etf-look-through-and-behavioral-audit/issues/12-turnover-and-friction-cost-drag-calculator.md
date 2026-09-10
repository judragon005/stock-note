# 12 — 交易摩擦稅費與年化資產拖累率精算器 (Turnover & Friction Cost Drag Calculator)

**What to build:**
累計特定期間（或歷年全量）的所有買賣交易手續費 (`fee`) 與證券交易稅 (`tax`) 總和。根據投資人的平均淨資產規模 (Average NAV) 與持有天數，精確換算為「年化資金週轉率 (Annualized Turnover Rate %)」與「摩擦成本年化拖累率 (Friction Cost Drag % on NAV)」，讓投資人清楚量化「頻繁進出為券商與國庫貢獻了多少百分點的報酬率侵蝕」。

**Blocked by:** 11 — 處置效應量化指標引擎 (Disposition Effect Engine: PGR/PLR & Holding Days)

**Status:** ready-for-agent

- [ ] 完整累計指定區間內之手續費與證交稅金額
- [ ] 支援台幣與美股手續費匯率折算
- [ ] 輸出年化週轉率與佔 NAV 之年化拖累率百分比
- [ ] 單元測試驗證零手續費、高頻短線與長線存股等多種週轉情境之數值計算
