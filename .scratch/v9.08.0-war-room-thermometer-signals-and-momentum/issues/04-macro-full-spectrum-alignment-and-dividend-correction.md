# 04 — 宏觀戰情室全景聯動與除息總報酬校準 (Macro War Room Full-Spectrum Alignment & Dividend Correction)

**What to build:**
全景串聯與數理校準：在 `dualMomentumEngine.ts` 中加入除息還原總報酬校準，防止高息 ETF 因除息缺口遭到動能模型誤判淘汰；在 `PortfolioShieldAndAmmoCard` 中連動「雙冷（總經<45且波段<30）」之維持率與流動性防斷頭警示；在 `HoldingTacticalSignalsCard` 中附帶標註 20MA 月線乖離率，> 6% 時標黃提醒調節，呼應戰術溫度計；執行全站端到端檢驗。

**Blocked by:** 01, 02, 03

**Status:** closed

- [x] 3M 動能分數分子加回近 3 個月已發放股息，還原真實總報酬動能
- [x] 雙冷（總經<45且波段<30）時，個人防護盾主動高亮提醒維持率防斷頭
- [x] 持股戰術訊號清單補充標註月線乖離率，> 6% 時高亮提醒過熱調節
- [x] 全站測試 100% 綠燈覆蓋，`npm test` 0 失敗，`npm run build` 0 警告錯誤
