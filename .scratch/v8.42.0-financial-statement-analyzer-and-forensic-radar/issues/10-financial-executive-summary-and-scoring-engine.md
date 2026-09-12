# 10 — Financial Health Scoring & Executive Summary Engine

**What to build:**
實作綜合評分與白話操盤總結引擎 `src/engine/financialScoringEngine.ts`。
綜合獲利能力、安全性、營運效率、現金流健康度四維度，產出 0~100 分總體評分與四等級標籤 (`EXCELLENT` | `HEALTHY` | `WARNING` | `DANGEROUS`)。產出四大體質指示燈 (Traffic Lights) 與一句白話核心結論，提供 0 秒極速決策。

**Blocked by:** 08-forensic-fraud-and-contrarian-radar.md, 09-industry-gate-and-cyclical-guard.md

**Status:** ready-for-agent

- [x] 實作四大維度子評分與綜合加權總分（0~100）演算法
- [x] 整合產業隔離（金融業加權自適應調整）
- [x] 產生四大指示燈狀態（獲利、安全、效率、現金）
- [x] 產生直白精準的「0 秒核心操盤結論一句話」
- [x] 單元測試驗證極端優質企業與嚴重背離地雷股的分數階梯與評語正確性
