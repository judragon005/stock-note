# 01 — 雙溫度計數值防折行與左右軌對稱重構 (Macro Dual Thermometer Layout & No-Wrap Guard)

**What to build:**
修復 `MacroDualThermometerBar.tsx`：將 `⚠️ 拉積盤警訊` 徽章移至第二行右側，與左軌「建議總股票上限」形成水平對稱；第一行右側純留分數 `{tacticalSwing.score} / 100`，強制宣告 `whiteSpace: 'nowrap'`、`flexShrink: 0` 與 `fontVariantNumeric: 'tabular-nums'`，徹底根治文字換行擠壓。

**Blocked by:** None — can start immediately

**Status:** closed

- [x] 移除第一行右側之警訊徽章，僅保留分數 `{tacticalSwing.score} / 100`
- [x] 分數元素宣告 `white-space: nowrap`、`flex-shrink: 0` 與 `font-variant-numeric: tabular-nums`
- [x] 將 `⚠️ 拉積盤警訊（賺指數賠價差）` 徽章移至第二行右側，與左軌建議上限對稱
- [x] 補充並通過單元測試，確保在小視窗寬度下維持單行不換行
