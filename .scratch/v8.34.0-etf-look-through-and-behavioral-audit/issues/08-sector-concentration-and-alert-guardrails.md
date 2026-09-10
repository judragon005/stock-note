# 08 — 產業因子集中度匯總與雙重紅線警示引擎 (Sector Concentration & Alert Guardrails)

**What to build:**
在穿透曝險聚合基礎上，引擎進一步按產業類別（半導體、資訊科技、金融保險、傳產原物料等）聚合整戶之穿透實質曝險市值與 NAV 佔比。同時實作風控安全閘門：
1. 單一標的穿透佔比超過 25% 時，標記 `isConcentrationAlert: true`；
2. 單一產業穿透佔比超過 50% 時，標記產業過度集中警示。
產出整合型之 `LookThroughReport`。

**Blocked by:** 07 — 穿透式總曝險遞歸加權聚合演算法 (Look-Through Exposure Aggregator)

**Status:** ready-for-agent

- [ ] 正確聚合各大產業類別的實質市值與百分比
- [ ] 當單一公司穿透曝險 $> 25\%$ 時正確觸發警示旗標
- [ ] 當單一產業穿透曝險 $> 50\%$ 時正確觸發產業集中度警示
- [ ] 單元測試驗證極限邊界條件（例如 100% 科技股或均勻分散）的警示觸發行為
