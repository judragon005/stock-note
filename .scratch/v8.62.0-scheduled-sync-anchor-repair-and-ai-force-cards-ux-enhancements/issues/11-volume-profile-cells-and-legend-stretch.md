# 11 — 熱力格柱列與圖例垂直均勻拉伸適配

**What to build:**
在 `VolumeProfileCard.tsx` 中，將垂直熱力格柱（Heatmap Cells）改為 `flex: 1` 均勻填充高度，同時調整右側圖例之 `justifyContent: 'space-between'`，使刻度、方格與圖例垂直完全貼合，徹底消除上下各 90px 的無效黑底留白。

**Blocked by:** 10 — 籌碼熱區圖容器 stretch 填滿 (移除寫死 190px)

**Status:** ready-for-agent

- [ ] 熱力柱內各格方塊依卡片高度垂直拉伸。
- [ ] 消除熱區圖上下無效留白，視覺飽滿舒展。
