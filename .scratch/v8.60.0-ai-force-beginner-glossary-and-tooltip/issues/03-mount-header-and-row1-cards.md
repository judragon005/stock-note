# 03 — 掛載頂部 Header 行情列與 Row 1 卡片 (01 ~ 05)

**What to build:**
將 `TermTooltip` 掛載至頂部 Header 行情列與 Row 1 卡片：
1. **頂部行情列 (`HeaderMarketBar.tsx`)**：
   - 價格標籤：開盤、最高、最低、收盤、成交量、成交筆數。
   - 狀態燈號：AI SCAN ACTIVE、MAIN FORCE TRACKING、MARKET STATUS、VOLATILITY ALERT。
2. **01 主 K 線 (`KLineChartCard.tsx`)**：
   - 卡片標題 `ⓘ` 圖示。
   - 均線標籤：MA5、MA10、MA20、MA60。
   - 關鍵價位水線：高檔壓力區、主力成本、支撐區（帶入現價與成本之動態偏離度診斷）。
   - 副圖技術指標：KD、MACD、RSI。
3. **02 AI 決策核心 (`AiDecisionCoreCard.tsx`)**：
   - 決策項目：趨勢判斷、短線狀態、主力行為、籌碼結構、隔日沖風險、籌碼健康度、支撐區間、壓力區間、基準等級。
4. **03 多維度判讀 (`MultiDimensionRadarCard.tsx`)**：
   - 卡片標題 `ⓘ` 圖示。
   - 6 軸雷達維度：法人、動態/趨勢、籌碼、流動性、波動、動能。
   - 評級等級 (A/B/C/D) 與綜合評分。
5. **04 AI 籌碼熱區圖 (`VolumeProfileCard.tsx`)**：
   - 卡片標題 `ⓘ` 圖示。
   - 5 大累積量能區：壓力區、大量成交區、密集成交區、價平區、去撐區。
6. **05 風險雷達圖 (`RiskSpiderCard.tsx`)**：
   - 卡片標題 `ⓘ` 圖示。
   - 5 軸風險維度：流動性風險、主動風險、隔日沖風險、法人風險、籌碼風險與底部主力風險指數。

**Blocked by:** 02-term-tooltip-component-and-boundary-guard-tdd

**Status:** completed

- [x] Header 行情列與狀態燈號掛載 Tooltip
- [x] Card 01 主 K 線均線、水線與指標掛載 Tooltip 與動態診斷
- [x] Card 02 決策核心 9 大項目掛載 Tooltip
- [x] Card 03 六軸多維度判讀掛載 Tooltip
- [x] Card 04 籌碼熱區 5 大量能區掛載 Tooltip
- [x] Card 05 風險雷達 5 軸掛載 Tooltip
- [x] 既有單元測試綠燈驗證
