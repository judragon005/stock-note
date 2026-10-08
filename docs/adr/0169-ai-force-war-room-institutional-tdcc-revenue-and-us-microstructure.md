# ADR 0169: AI 主力戰情室法人籌碼與 TDCC 大戶端到端貫通、月營收與 ETF 自適應、美股微觀結構獨立化架構決策 (ADR 0169)

## 狀態 (Status)

**ACCEPTED (已通過)**

---

## 背景與問題脈絡 (Context)

在主力戰情室的實戰檢驗中，發現以下本質性架構瓶頸：
1. **數據庫閒置與前端斷層 (Debt #0042)**：本地 SQLite 湖倉早已入庫集保千張大戶 (`tw_tdcc_distribution`) 與月營收 (`tw_monthly_revenue`)，但前端 `AiForceDashboardView.tsx` 與 `aiForceDashboardEngine.ts` 忽略了這兩組數據，導致波段與存股族的核心指標無法呈現。
2. **美股捏造偽數據違反 Zero-Mock 原則**：在美股或無法人資料的情境下，代碼底層以粗暴算式捏造「外資、投信、自營商」張數，造成嚴重的專業破綻。
3. **0050 等 ETF 之月營收空白盲點**：戰情室預設標的為 0050，但 ETF 無營業收入，若強套月營收卡片將產生空白報錯。
4. **單一週期限制**：主 K 線僅提供日 K，缺乏波段客剛需之週 K 與月 K 大趨勢。
5. **搜尋體驗生硬**：未充分利用 SQLite 9,629 檔標的之模糊搜尋 API，缺乏即時下拉提示。

---

## 決策 (Decision)

經深入調研與第一性原理評估，決定實施全面對齊架構（方案 B）：

1. **端到端管線貫通 (Pipeline Wiring)**：
   - 在 `AiForceDashboardView` 中完整解構並傳遞 `lakehouseData.tdccRecords` 與 `lakehouseData.revenueRecords`。
   - `generateAiForceReportFromCandles` 支援注入 `tdccDistribution` 與 `monthlyRevenue` 結構。
2. **新增波段核心卡片 (Row 3 專區)**：
   - 實裝 `TdccDistributionCard`（Card 19）：左軸千張大戶持股比（%）折線圖 + 右軸總股東人數（人）柱狀圖。
   - 實裝 `MonthlyRevenueCard`（Card 20）：個股展示近 12 個月營收 YoY 柱狀圖；ETF 智慧切換為「資產規模與配息殖利率河流」。
   - 保留 Card 16（買賣力分布），維繫日內盤面張數力道監控。
3. **美股完全零假數據 (US Microstructure SSOT)**：
   - 切換美股時，Card 08/15 徹底剔除外資投信表格，切換為美股量價動能評分 (MFI/OBV Microstructure Score)。
   - 單位自適應切換為「股」，幣別切換為「USD」，誠實標籤「美股無三大法人日報」。
4. **搜尋 30ms 防抖下拉補全與快捷標籤**：
   - 串接 `/api/market/symbols`，支援代碼與中文名稱（如「台積電」）即時搜尋。
   - 頂部常駐核心標的切換膠囊 (`0050`, `2330`, `2454`, `NVDA`, `AAPL`)。
5. **多週期聚合與分項基準日透明化**：
   - 主 K 線前端毫秒級聚合日 K 為週 K / 月 K。
   - 各卡片微觀腳註標明資料發布基準日（As-of Date）。

---

## 後果與影響 (Consequences)

### 正面影響 (Positive Impact)
- **零偽數據閉環**：全面根除代碼中所有猜測外資投信張數的虛假算式，100% 貫徹 Zero-Mock Policy。
- **波段與存股決策力翻倍**：集保大戶持股集中度與近 12 個月營收 YoY 成為標配，實戰決策價值顯著提升。
- **美股體驗專業化**：美股標的不再出現荒謬的「外資買超 X 張」，改以專業機構量價評分呈現。
- **搜尋零門檻**：支援中文輸入與下拉補全，大幅改善日常操作流暢度。

### 潛在權衡 (Trade-offs)
- Bento-Grid 佈局由 18 卡增至 20 卡，Row 3 空間需精準調配，需嚴格防禦不同螢幕解析度下的溢出與抖動。
