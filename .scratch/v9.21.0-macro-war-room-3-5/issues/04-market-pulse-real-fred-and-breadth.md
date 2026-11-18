# 04 — 市場四柱汰假換真與多週期寬度/融資去槓桿串接

**Parent:** #584 (Spec 0235)

**What to build:** 將「市場四柱即時脈搏與金絲雀」抽離為獨立元件 `MarketPulseAndCanariesCard`；汰除無真實來源的寫死 `CDS 65` 與 `M2 2.8%`，替換為後端已真實抓取之 FRED **CCC 級垃圾債利差 (`cccSpreadOAS`) / 投等債利差 (`igSpreadOAS`)**、**美國製造業新訂單減存貨差額 (`usOrdersMinusInvSpread`) / CPI 年增 (`usCpiYoY`)** 與 **10Y 平衡通膨率 (`breakeven10y`)**；並連通 `/api/market/breadth` 展示 **台美 20MA / 60MA / 200MA 多週期市場寬度** 與 **大盤融資去槓桿比率 ($\ge 1.0$)**。

**Blocked by:** 01 — 統一宏觀數據海關正規化器

**Status:** ready-for-agent

- [ ] 頁面上不再出現寫死的 CDS 違約保險與 M2 年增率常數卡
- [ ] 真實呈現 `cccSpreadOAS`、`igSpreadOAS`、`usOrdersMinusInvSpread` 與 `usCpiYoY`
- [ ] 同步拉取並呈現 `/api/market/breadth` 之台美 20/60/200MA 寬度與融資去槓桿比率
- [ ] 新增元件測試驗證真實數據渲染與無資料時之優雅降級
