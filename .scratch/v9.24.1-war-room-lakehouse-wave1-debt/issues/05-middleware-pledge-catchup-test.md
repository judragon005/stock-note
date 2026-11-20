# 05 — 市場同步中介層董監事質押追趕測試斷言補齊

**What to build:** 於市場同步中介層單元測試補齊缺質押日自動追趕之 mock 呼叫計數與交易日參數斷言，防止後續重構意外破壞董監事質押自動追趕接線。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 模擬當日缺少台股董監事質押記錄情境
- [ ] 斷言 `fetchAndIngestTwPledge` 被準確呼叫且帶入預期交易日參數
- [ ] 既有中介層測試套件 100% 通過
