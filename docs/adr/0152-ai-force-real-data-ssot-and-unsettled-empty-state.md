# 0152. AI 戰情室單一真實數據來源校準、淘汰衝突硬編碼假資料與優雅 Empty State (AI Force Real Data SSOT & Empty State)

Date: 2026-09-30

## Status

Accepted

## Context

使用者在查詢 `00403A`（主動統一升級50）或其他查無外部日 K / 新掛牌標的時，發現多處嚴重的數據失真與視覺衝突破圖現象：
1. **頂部行情顯示寫死之 150.00 元**：`createDefaultAiForceReport` 內寫死 `if (symbol !== '2360') price = 150.0`，並捏造出 +1.80、成交量 2,681 張、筆數 6,260 筆等假數據。
2. **K 線圖 2,100 元假數列與 138 元支撐線打架破圖**：`normalizeAndSortCandles` 硬編碼以 `basePrice = 2100` 生成 30 根 K 棒，與 Header 傳入之 138 元支撐線於同一 SVG 畫布衝突，Y 軸極端拉扯，標籤堆疊在右下角。
3. **盤中未結算與歷史定錨機制失效**：預設報告寫死 `isSettled: true` 與當日日期，繞過 `marketSettlementEngine`，未將標籤退回「前日收盤價」。
4. **資訊列文字脫鉤**：`HeaderExportBar` 永遠顯示寫死的「區間 2026-05-04 ~ 2026-09-18，共 98 個交易日」，與當前標的及最新交易日矛盾。

## Decision

1. **淘汰硬編碼價格造假**：
   - 移除 `createDefaultAiForceReport` 中寫死的 `price = 150.0` 與寫死成交量。
   - 移除 `KLineChartCard` 中寫死以 `basePrice = 2100` 生成虛構蠟燭數列的邏輯，空數列時誠實回傳 `[]`。
2. **單一真實數據來源與最後已知收盤價定錨 (SSOT)**：
   - 接入 `getMarketSettlementStatus`：未結算時（如台股 15:00 前）標記為 `isSettled: false`，頂部價格標示為「前日收盤價」，並定錨於上一交易日。
   - 若外部查有歷史日 K（>= 1 根）：以「最新一筆有效歷史日 K」填補收盤價與定錨日，絕不在無即時行情時捏造當日虛假跳動。
3. **高質感科技感 Empty State**：
   - 當標的完全無歷史日 K 時，K 線圖繪製「📊 尚無歷史交易日 K 數列·數據回補中」毛玻璃面板，不再繪製打架的 2100 元假 K 棒與 138 元支撐線。
   - 頂部行情列各數值安全顯示破折號 `-`，標註 `isDataPending: true`。
4. **修復中間資訊列數據連動**：
   - 在 `AiForceDashboardView.tsx` 傳入 `report.marketBar.dataSourceText` 與 `report.marketBar.dataRangeText` 至 `HeaderExportBar`，徹底終結寫死「2026-05-04 ~ 2026-09-18」。

## Consequences

- **正面效果**：
  - 徹底肅清系統內互相衝突的假資料（150 元 vs 2,100 元），消滅 Y 軸破圖。
  - 金融工具 100% 遵守「事實為本」原則，查無資料或回補中時誠實展示透明 Empty State，盤中嚴格定錨昨收，大幅提高使用者信賴度。
- **維護代價**：
  - 需確保 `MarketBarData` 數值可選性與組件渲染空值防禦，已納入全量 1,207 項自動化單元測試保護。
