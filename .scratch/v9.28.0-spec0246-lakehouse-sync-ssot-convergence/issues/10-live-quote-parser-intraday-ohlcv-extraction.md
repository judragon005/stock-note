# 10 — 即時報價解析器補齊盤中 OHLCV (open / high / low / volume) 提取

**Parent:** #607 (Spec 0246)

**What to build:** 擴充即時報價資料型別與報價解析器，在解析上游即時行情回應時同步提取並驗證盤中 `open`、`high`、`low`、`volume` 與行情時間戳欄位（保持既有必選欄位向後相容），當上游未提供或為無效值時安全省略或降級為未定義，不產生 `NaN` 或虛假數值。

**Blocked by:** None — can start immediately

**Status:** done

- [x] 即時報價型別新增可選盤中欄位 `open`、`high`、`low`、`volume`，既有呼叫端 100% 向後相容零型別錯誤
- [x] 報價回應包含有效盤中 OHLCV 時，解析器準確回傳對應數值
- [x] 報價回應缺少部分或全部 OHLCV 欄位（或為非有限數值／負數）時安全降級，不污染價格或產生 `NaN`
- [x] Seam 3 報價解析器單元測試覆蓋台美股完整欄位與缺欄降級情境並 100% 通過
