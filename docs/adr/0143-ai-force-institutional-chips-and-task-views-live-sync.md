# ADR 0143: AI 主力戰情室三大法人真實籌碼管線與全卡片/任務視圖全景動態驅動架構

- **狀態**：Accepted
- **日期**：2026-09-26
- **關聯規格**：[Spec 0143 (docs/specs/0143-ai-force-institutional-chips-and-task-views-live-sync-spec.md)](../specs/0143-ai-force-institutional-chips-and-task-views-live-sync-spec.md)
- **關聯 Issue**：[#103](https://github.com/judragon005/stock-note/issues/103), [#105](https://github.com/judragon005/stock-note/issues/105)

---

## 背景與脈絡 (Context)

在戰情室階段一完成了真實日 K 數列與 01 主 K 線專業互動後，整體看盤系統在價格走勢上已達實盤水準。然而在籌碼面、中間量化卡片群與任務報告層面仍存在顯著缺口：
1. **三大法人進出數據仍為靜態範例 (Card 08 & 15)**：08 法人行為計量卡與 15 籌碼異動摘要使用固定的模擬數值，無法反映當前個股真實的外資、投信、自營商盤後買賣超趨勢。
2. **多市場相容性與無資料降級考量**：在查詢美股（US）或查無法人進出的台股標的時，若直接阻斷會導致圖表空白或計算報錯，需有一套純量化的成交量多空代理模型 (Proxy Volume Model)。
3. **中間量化卡片群指標靜態假資料 (Card 10~17)**：多空能量比、5環健康綜合評估、主力動態信號、買賣力分佈與多空強度等指標未與真實日 K 和籌碼連動。
4. **視圖層無縫增強與防阻塞**：在切換標的時，日 K 必須秒開，法人歷史資料需以非同步或本地 IndexedDB settings 快取無縫注水 (Progressive Hydration)，杜絕畫面停頓。

---

## 決策內容 (Decisions)

1. **三大法人歷史籌碼純運算縫隙 (Pure Function Seam)**：
   - 在 `aiForceDashboardEngine.ts` 定義 `RawInstitutionalRecord` 資料介面與 `buildInstitutionalFlow` 純函式。
   - 擴充 `generateAiForceReportFromCandles` 支援接收可選的 `institutionalRecords`，依日期正序排序並滾動累計 `cumulativeTotalShares`。
   - 提取近 3 日明細表格（最新日在最上方，轉換為 `MM/DD` 顯示格式），並計算 20 日與 5 日累計量能總結字串。
2. **雙軸卡片連動與雙軌降級機制 (Card 08 & Card 15 Synergy)**：
   - **台股軌道**：傳入真實法人歷史記錄時，08 卡動態繪製外資（藍）、投信（黃）、自營商（綠）每日直方柱與三大法人累積折線；15 卡同步更新最新交易日張數、累積 10~20 日 Sparkline 走勢與合買/對作研判標籤。
   - **美股與無資料降級軌道**：針對美股或無法人資料，以日 K 成交量乘以實體紅黑 K 多空係數生成代理數值，確保 SVG 座標投影與數列運算 100% 穩定，永不除以零或拋錯。
3. **中間量化卡片群 (Card 10~17) 純函式量化加權與安全邊界防禦**：
   - **Card 10 (`bullBearEnergy`)**：`calculateBullBearEnergyFromCandles` 依近 20 日紅黑 K 成交量計算多空佔比與比值，黑 K 為 0 時安全封頂 `99.99`，全無量安全回退 `1.0`。
   - **Card 11 (`healthSummary`)**：`calculateHealthSummaryFromCandles` 整合籌碼健康、均線多頭排列度、資金動能、流動性風險與法人支撐力 5 維度動態評分，綜合計算整體評等標籤。
   - **Card 12 (`dynamicSignals`)**：`calculateDynamicSignalsFromCandles` 依收盤價相對 VWAP 主力成本乖離率、KD、RSI 與法人進出動態判定趨勢/籌碼/動能信號；破位警戒亮紅燈、多頭順風亮綠燈、其餘亮黃燈。
   - **Card 16 (`forceDistribution`)**：`calculateForceDistributionFromCandles` 依 20 日紅黑 K 量能比例動態推算大戶買盤、散戶買盤與散戶賣壓。
   - **Card 17 (`bullBearStrength`)**：`calculateBullBearStrengthFromCandles` 依 RSI、KD、月線與成交量能強度推算多空強度比與 1~5 級信號。
4. **視圖層非同步快取整合**：
   - 在 `AiForceDashboardView.tsx` 的 `loadDataForSymbol` 中，整合 `fetchRecentTwseReports(20)`，優先讀取本地 IndexedDB 快取日報並注入報告生成器。
5. **TDD 與防禦性測試守護**：
   - 於 `aiForceDashboardEngine.test.ts` 加入完整測試案例，覆蓋真實法人注入、成交量降級模型、全紅/黑 K 極端情境與 Card 10~17 動態加權校驗。

---

## 後果與影響 (Consequences)

- **正面效益**：
   - 徹底打通三大法人真實歷史籌碼資料管線與中間量化卡片群動態加權，所有卡片指標皆能忠實呈現當前市場即時與歷史結構。
   - 具備跨市場代理降級保護與防除零邊界防禦，台股與美股皆可流暢瀏覽，系統健壯性顯著提升。
   - 保持純函式與單一真實來源 (SSOT) 架構，測試覆蓋完整，易於後續擴展任務視圖。
- **後續迭代**：
   - 續行推進 Spec 0143 後續票券：Ticket 3 (Issue #106) 底部 5 大任務視圖（綜合報告、技術警示、KD+MA、MACD、原始資料）與真實日 K 和指標連動閉環。
