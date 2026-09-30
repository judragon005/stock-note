# 09 — 全站 15 張卡片 Tooltip 穿透無死角檢視

**What to build:**
逐一檢視戰情室 Card 01 至 Card 15 以及頂部 Header 中所有使用 `TermTooltip` 的元件，驗證在各行 Grid 相互貼近時，彈出的卡片 100% 位於所有相鄰卡片最上層，零遮蔽、零死角。

**Blocked by:** 08 — 螢幕絕對座標計算與視窗邊界防溢出

**Status:** ready-for-agent

- [ ] Card 03 與 Card 04 相互懸停測試，浮層不再被右側卡片截斷。
- [ ] Card 01~15 所有 Tooltip 均順暢穿透。
