# 01 — [Spec 0223 / Ticket 01] Zavy 慢富白話決策字典、週期/利率枚舉中文化與頂部 30 秒慢富導覽垂直切片

## Parent

- #494 ([Spec 0223] Zavy 慢富週期與配置新手白話導覽、零造輪子 TermTooltip 整合與既有引擎 12 項漏接欄位全貫通)

## What to build

建立 Zavy 慢富白話決策字典（收錄 M01~M06、B01~B04、T01~T08 共 18 項核心慢富詞條，符合既有 `GlossaryEntry` 契約，完整包含「💡 白話比喻、📊 指標含義、🎯 買賣操作指引」）與週期階段/利率狀態繁體中文轉譯純函式；將 10 秒快速校準摘要（`tenSecondsExecutiveSummary`）與匯出報告中的裸露英文枚舉（如 `EXPANSION`、`IN_RANGE_4_TO_5_5`）全數轉為繁體中文白話描述；並於慢富工作區頂部操作列新增「📖 新手 30 秒慢富導覽」切換按鈕，支援展開與收合「🔭 看天氣（鏡頭一）➔ 🌡️ 量體溫（鏡頭二）➔ 🛡️ 穿防彈衣（鏡頭三）」三步驟白話看盤心法橫幅。

## Acceptance criteria

- [x] 建立 Zavy 慢富白話決策字典，涵蓋三大鏡頭 18 項核心詞條，每項皆具備非空之 `term`、`metaphor`、`meaning`、`buySignal`、`sellSignal` 與 `neutralWarning`。
- [x] 提供週期階段（`WaveBusinessCyclePhase`）與 10Y 殖利率新常態狀態之繁體中文格式化純函式，消除 `tenSecondsExecutiveSummary` 與匯出報告中之裸露英文枚舉（如 `IN_RANGE_4_TO_5_5`、`EXPANSION`）。
- [x] 於慢富工作區頂部操作列提供「📖 新手 30 秒慢富導覽」切換按鈕（預設收合），點擊可展開呈現「看天氣 ➔ 量體溫 ➔ 穿防彈衣」三步驟白話心法卡，再次點擊可收合。
- [x] 新增並通過字典結構、中文枚舉轉譯與頂部 30 秒導覽展開/收合之單元測試。

## Blocked by

- None — can start immediately

