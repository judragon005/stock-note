# 01 — 建立雙市場法定與天災休市日曆 SSOT 字典 (market-holidays.json)

**Parent:** #275

**What to build:**
建立 `src/data/market-holidays.json` 作為全市場唯一的法定節假日與已知天災停市日字典。完整涵蓋 2023～2030 年台美兩市法定休市日、2025/2026 修法節日（2025-10-24 光復節補假、2025-12-25 行憲紀念日、2026-09-28 教師節）、已發生之歷史不可抗力停市日（2026-07-10 巴威颱風假）以及美股半日市。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] `src/data/market-holidays.json` 包含 `TW` 與 `US` 兩大市場根節點，日期格式嚴格為 `YYYY-MM-DD`，值為中文原因標籤。
- [ ] `TW` 節點中完整包含 `2025-10-24` (光復節補假)、`2025-12-25` (行憲紀念日)、`2026-07-10` (巴威颱風停市)、`2026-09-28` (教師節)。
- [ ] 撰寫單元測試驗證 JSON 檔案結構完整性、日期鍵有效性與非空中文描述。
