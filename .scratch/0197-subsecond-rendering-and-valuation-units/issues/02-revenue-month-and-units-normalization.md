# 02 — 月營收最新月份、籌碼度量衡與循環股校準

**What to build:**
修正 `aiForcePromptAdapter.ts` 取月營收陣列取倒反 Bug，取最新月份 (`rev.history[rev.history.length - 1]`)，恢復輸出 `2026-09`；計算台股均量時統一除以 1000 換算為張數，消滅 `0%` 均量佔比與 `0倍` 量增比算術失真；將華星光 `4979` 納入 `industryGate.ts` 景氣循環股清單；連通美債 10Y 與 VIX 宏觀快取。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 在 `src/engine/aiForcePromptAdapter.ts` 將 `latestRevItem` 改取陣列最後一筆
- [ ] 在 `src/engine/aiForcePromptAdapter.ts` 將台股 20 日均量除以 1000 轉為張數後再計算比率
- [ ] 在 `src/engine/industryGate.ts` 補齊 `'4979'` 為循環股
- [ ] 台股標的連通宏觀快取美債 10Y 與 VIX
- [ ] 單元測試驗證通過
