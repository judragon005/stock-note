# 11 — 主力戰情室 Card 01 盤中真實量價縫合與 Spec 0245 零量防禦相容驗證

**Parent:** #607 (Spec 0246)

**What to build:** 更新主力戰情室主 K 線盤中縫合邏輯，當即時報價具備有效盤中開、高、低與正成交量時，於 `Card 01` 當日 K 棒縫合真實盤中 OHLCV，使成交量柱體與查價列即時呈現當日真實量能；同時完整保留 Spec 0245 之零量定錨防禦契約（`isVolumeAnchoredToPrevClose`），於上游確實無有效成交量時安全退回前一已結算交易日。

**Blocked by:** 10 — 即時報價解析器補齊盤中 OHLCV (open / high / low / volume) 提取

**Status:** done

- [x] 盤中取得有效即時 OHLCV 時，主 K 線當日縫合棒正確帶入真實 `open`、`high`、`low`、`close`、`volume`，不再強塞零量平盤十字線
- [x] `Card 01` 成交量與量比於盤中有實量時即時反映當日量能，不因零量而被迫停留在舊結算日
- [x] 當即時報價缺乏有效成交量或成交量為 0 時，100% 保留 Spec 0245 `isVolumeAnchoredToPrevClose` 定錨退回行為，Card 01B 零回歸
- [x] Seam 3 主力戰情室與 Card 01／01B 相關單元測試 100% 通過
