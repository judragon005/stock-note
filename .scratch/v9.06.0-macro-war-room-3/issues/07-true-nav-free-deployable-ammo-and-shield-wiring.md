# 07 — 實質淨值 (effectiveNavTWD)、真·自由可動用子彈（扣 T+2 交割與 7 日 DCA）與質押/再平衡/匯差護欄貫通 (True NAV, Free Deployable Cash Ammo, Margin Stress, Rebalancing Drift & US FX Cushion)

**What to build:**
打通「部位防禦護欄與自由子彈卡」五大跨模組接線：(1) 總資產改接 `exposureMetrics.effectiveNavTWD`；(2) 可用現金自動扣除 `pendingSettlements`（T+2 待交割淨流出）與近 7 日 `dcaSchedulerEngine` 預留扣款，顯示「🎯 真·自由可動用子彈」；(3) 再平衡偏離度改接 `rebalancingEngine` 真實計算（廢除寫死 `2.8%`）；(4) 無借款時拔除 `250%` 假維持率（誠實顯示零槓桿），有借款時接入 `marginStressEngine` 顯示距離 130% 追繳線之大盤耐受跌幅；(5) 1-Day 95% VaR 隨即時 VIX 動態縮放，並於 `USD/TWD` 卡片接入 `fxBreakdown` 顯示美股持倉加權買進成本匯率與累積匯差緩衝墊。

**Blocked by:** 01 — 戰情室元件預重構與台美紅綠漲跌主題色全面對齊

**Status:** ready-for-agent

- [x] 戰情室總資產對齊 `effectiveNavTWD`，自由可動用現金精確扣除待交割淨流出與近 7 日定期定額預留款
- [x] 無質押借款時維持率回傳 `null` 並顯示「無質押負債 (零槓桿)」，徹底根除 `250%` 假數字；有借款時顯示追繳耐受跌幅
- [x] 再平衡偏離度動態接軌 `rebalancingEngine`，1-Day 95% VaR 隨 VIX 動態縮放，`USD/TWD` 卡片顯示美股成本匯率與匯差緩衝墊

