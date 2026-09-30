# 13 — 5 軸文字與數值字級放大 (10px ➔ 13px)

**What to build:**
在 `RiskSpiderCard.tsx` 中，將外圍 5 軸指標文字標籤（⚡ 波動、💧 流動、📊 籌碼、🏛️ 法人、📈 趨勢）字級由 10 提升至 13（fontWeight: 700），數值字級由 9.5 提升至 12（fontWeight: 800），並將坐標位移半徑調整至 `maxRadius + 22`，改善微小文字難以閱讀的問題。

**Blocked by:** 12 — 雷達圖半徑擴大 (maxRadius 76 ➔ 96)

**Status:** ready-for-agent

- [ ] 標籤文字字級改為 13，數值字級改為 12。
- [ ] 文字排版不與雷達網格頂點重疊。
