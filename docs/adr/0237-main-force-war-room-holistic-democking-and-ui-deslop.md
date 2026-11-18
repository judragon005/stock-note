# ADR 0237: 主力戰情室 4.0 全鏈路去假、量綱同態校驗、湖倉深度接線與曜石精密 UI 重構

- **狀態**：已採用 (Accepted)
- **日期**：2026-11-18
- **關聯規格與票券**：Spec 0237 / GitHub Issue #588

## 背景與問題

「主力戰情室 (`AiForceDashboardView`)」作為系統的核心籌碼與決策分析儀表板，經過跨模組全量審計揭露 4 大結構性缺陷：
1. **前後端殘留 7 處合成假數據與靜態硬編碼 (違背 Zero-Mock Policy)**：後端 TDCC 集保入庫 (`ingest-tw-tdcc.cjs`) 與月營收入庫 (`ingest-tw-monthly-revenue.cjs`) 採用 `seed` 搭配 `Math.sin/cos` 捏造 12.5 萬筆假集保與 10.9 萬筆假月營收；前端回補層 `historicalOhlcvBackfill.ts` 查無日 K 時偷偷合成 100 根假 K 線繞過 `isDataPending` 空狀態；Card 20 在 ETF 模式下寫死 420 億規模與 4.2% 假配息模板；Card 18 寫死假法人數據與假停損停利乘數。
2. **台股「股 vs 張」1000 倍量綱混淆與正負極性算術顛倒**：台股日 K 成交量為「股 (Shares)」，但健康度、五維風險蛛網、AI 信心度、六維雷達與市場情緒 `institutionalNetRatio` 卻直接與法人「張數」門檻運算，導致量綱放大 1,000 倍，殭屍股被誤判為滿分流動性；Card 11 計算健康度總分時，將負向風險指標 `liquidityRisk` 直接混加除以 5，造成流動性越安全的標的健康度反遭倒扣 15~20 分。
3. **8 大湖倉真實資產與個人持倉斷鏈未接線**：借券賣出餘額 (`sblBalance`)、董監質押 (`pledge`)、融資日增減 (`marginBalanceChange`)、台指期未平倉/大盤維持率 (`twMacroData`)、ETF 每日官方淨值折溢價 (`etfNav`)、除權息日曆 (`corporateActions`)、MLP 主力語意引擎 (`synthesizeMainForceVerdict`)、美股微觀量價 4 指標與個人持倉均價/庫存對比皆斷鏈或遺漏傳遞。
4. **廉價 AI 模板味 (AI Slop) 與決策動線倒置**：彩虹邊框、15 處無作用三點按鈕、大量系統 Emoji 氾濫，且關鍵結論 Card 18 沉底超過 2,000px。

## 決策

1. **全鏈路去假與官方開放資料直連 (Zero-Synthetic Policy & OpenData Ingestion)**：
   - 後端拔除 `Math.sin/cos` 造假邏輯，全面接通 TDCC 集保結算所開放資料 CSV (`1-5`) 與 TWSE/TPEx 月營收 OpenAPI (`t187ap05_L`)，並提供 `purgeSyntheticRecords` 一鍵清洗被污染之假紀錄。
   - 前端回補層拔除 `generateSyntheticCandles`，查無日 K 誠實呈現 `isDataPending` 空狀態；Card 20 拔除寫死 420 億假模板，改連真實 `tw_valuation_daily` 與 `corporate_action_calendar`。
2. **量綱同態校驗閘門 (Dimensional Homomorphism Gate)**：
   - 台股日 K `volume` 在參與法人買賣超張數與流動性評估前，統一除以 `1000` 換算為張數。
   - Card 11 健康度總分正負向極性校正：`liquidityRisk` 改為正向安全度 `100 - liquidityRisk` 參與加權平均。
   - Card 07 VWAP 成本帶正負乖離標籤顛倒修正；Card 08 法人明細擴展為完整近 5 日；引入 `requestGuardRef` 徹底阻斷快速切換標的時之過期非同步競態覆蓋。
3. **湖倉真實資產全量貫通與個人持倉感知 HUD (Lakehouse Full Wiring & Portfolio HUD)**：
   - 擴充 `/api/market/history/:symbol` 與 `loadSymbolFullLakehouseData` 回傳並接通 `sblBalance`、`marginBalanceChange`、`pledge`、`etfNav`、`corporateActions`。
   - 接通 `synthesizeMainForceVerdict` (MLP 主力語意)、外資/投信連買連賣天數、美股微觀量價 4 指標 (`usMicroMetrics`: RVOL, VWAP Bias, MFI, ATR) 與 10 日 OBV Sparkline。
   - 頂部指揮艙整合個人持倉 HUD（均價 vs 主力成本 VWAP 乖離對比、庫存張數），並補齊開啟 7 步深度投研彈窗時之全量參數。
4. **曜石精密 (Obsidian Precision) 反 AI Slop 視覺重構**：
   - 物理移除 15 張卡片無作用 `<MoreVertical />` 裝飾按鈕；100% 根除系統 Emoji，全數替換為 `lucide-react` 向量圖示。
   - 統一曜石深邃底色 (`#0B0F19`) + `1px solid rgba(255,255,255,0.07)` 極細邊框 + 等寬微標籤 (`01`~`21`)。
   - 首屏重構「戰術摘要帶」與 Zone 01~04 戰術章節，消滅底部遮擋，實現「0 滾動直達結論」。

## 結果與驗證

- 全量單元與端到端測試套件（`npm test`）100% 通過（297 檔案全部 PASS，2,342 測試綠燈）。
- 生產環境建置（`npm run build`）0 TypeScript 型別錯誤，Vite build 正常完成。
- 後端資料庫回補具備真實開放資料來源驗證，介面完全消除 AI 模板浮誇感，達成機構級交易員戰鬥儀表板標準。
