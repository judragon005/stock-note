# 09 — 智策提示詞適配器董監質押注入單元測試

**What to build:** 在 `src/engine/aiForcePromptAdapter.test.ts` 補充單元測試，確保有董監質押資料與無質押資料時 XML 事實清單事實定錨度無死角。

**Blocked by:** 08 — 智策適配器董監質押比率安全讀取與事實清單注入

**Status:** ready-for-agent

- [x] 驗證當報表存在董監質押比率時，`createWarRoomPromptDigest` 正確輸出 `fundamental.directorPledgeRatioPct`
- [x] 驗證當報表缺少董監質押比率時，安全為 `undefined` 且 XML 標籤正確產出為 N/A 或省略
- [x] 確保 `aiForcePromptAdapter.test.ts` 測試 100% 綠燈

