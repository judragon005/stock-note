# 06 — 「長線總經配置 × 短線波段戰術」雙溫度計與全球/台股/美股三視角分流連動 (Dual Macro-Swing Thermometer & 3-Perspective Market Tabs Sync)

**What to build:**
將單一混淆分數拆解為頂部並列的「🧭 長線總經配置溫度計（決定總股票倉位上限 %）」×「⚡ 短中期波段戰術溫度計（綜合費半/台股 20MA 位階、ADR 溢折價、VIX 與市場廣度，決定拉回買點 vs 高乖離減碼）」；實作 `[🌐 全球總經與跨市] [🇹🇼 台股波段與籌碼] [🇺🇸 美股與費半動能]` 三分頁切換（僅顯示該視角核心指標卡，落實 30 秒盤前決策漏斗），並與頂部導覽列 `Header` 的 `ALL / TW / US` 市場切換器雙向同步。

**Blocked by:** 04 — 台美費城半導體 (^SOX)、台積電 ADR (TSM) 溢折價率與四大指數波段乖離傳導鏈, 05 — 本地 SQLite 湖倉台股大盤騰落廣度（識破拉積盤）與三大法人現貨籌碼聚合

**Status:** ready-for-agent

- [x] `evaluateMacroDualThermometer` 獨立輸出 `strategicRegime`（長線建議股票上限 %）與 `tacticalSwing`（短線波段戰術燈號與台美摘要）
- [x] 戰情室支援 `GLOBAL` / `TW` / `US` 三視角頁籤切換，過濾對應指標卡與催化劑事件
- [x] 戰情室視角頁籤與頂部 `Header` 的 `ALL / TW / US` 市場切換器雙向同步連動

