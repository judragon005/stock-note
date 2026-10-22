# 0202 Spec: 個股分析深度財報全域資料治理、湖倉對齊與極簡重構規格書

## 1. 概述與元數據 (Overview & Metadata)

* **規格編號：** Spec 0202
* **標題：** 個股深度財報假資料清零、資料湖倉打通、會計勾稽修復與極簡架構重構
* **關聯 Issue：** 待建立（對齊 Issue-First 工作流）
* **規格狀態：** `APPROVED_DRAFT` (待開工規格書)
* **版本：** V1.0
* **建立日期：** 2026-10-22
* **架構定位：** 核心財務鑑識引擎、全市場數據治理與 UX 減法收斂

---

## 2. 需求背景與問題剖析 (Background & Problem Statement)

在專案演進中，「個股分析（深度財報）」頁面累積了顯著的技術債、會計計算漏洞、假資料殘留與架構孤島現象，經由跨領域虛擬專案團隊（證券交易所法人代表、資深審計會計師、實戰操盤手、首席軟體架構師）穿透審查，確定以下核心缺陷：

### 2.1 嚴重的硬編碼假資料 (Hardcoded Zero-Mock Violations)
1. **本益比評價分母假資料**：[`AnalysisMetricView.tsx`](file:///d:/APP/股票紀錄/src/components/analysis/AnalysisMetricView.tsx#L1299) 在 EPS 虧損或無數據時寫死 `1.16`，導致虧損股誤算虛假便宜本益比。
2. **每股淨值與 P/B 河流圖假資料**：[`AnalysisMetricView.tsx`](file:///d:/APP/股票紀錄/src/components/analysis/AnalysisMetricView.tsx#L1404) 無淨值時直接寫死 `32.5` 元。
3. **殖利率與股利假資料**：[`AnalysisMetricView.tsx`](file:///d:/APP/股票紀錄/src/components/analysis/AnalysisMetricView.tsx#L1474-L1596) 寫死 `1.0` 元、`4.18%` 殖利率，甚至偽造假股利陣列 `[1.0, 1.0, 1.2, 1.5, 1.0]`。
4. **流動負債係數臆測**：[`AnalysisMetricView.tsx`](file:///d:/APP/股票紀錄/src/components/analysis/AnalysisMetricView.tsx#L1094) 寫死 `總負債 * 0.45`；[`keyMetricsEngine.ts`](file:///d:/APP/股票紀錄/src/engine/keyMetricsEngine.ts#L67) 寫死 `總負債 * 0.5`，違反會計審計客觀性。
5. **Piotroski F-Score 作假**：[`keyMetricsEngine.ts`](file:///d:/APP/股票紀錄/src/engine/keyMetricsEngine.ts#L131-L138) 第 5 項（未增資稀釋）永遠寫死 `passed: true`。
6. **美股股數推導除以 10 元面額**：[`keyMetricsEngine.ts`](file:///d:/APP/股票紀錄/src/engine/keyMetricsEngine.ts#L199-L208) 對美股套用台股面額 10 元，無股本時保底 `10 億股`，使每股現金流失真數千倍。
7. **全市場偽造會計師意見**：[`taiwanFinancialPipeline.ts`](file:///d:/APP/股票紀錄/src/engine/taiwanFinancialPipeline.ts#L216) 寫死「四大聯合會計師事務所」、「無保留意見 (UNQUALIFIED)」。

### 2.2 重大金融工程與會計計算缺陷
1. **估值河流圖巨型視覺 Bug**：[`AnalysisMetricView.tsx:L565-L574`](file:///d:/APP/股票紀錄/src/components/analysis/AnalysisMetricView.tsx#L565-L574) 拿「今日最新單一收盤價」畫一條穿透過去 5 年的水平橫線，而非真實歷史收盤價折線。
2. **增長率計算週期錯位**：[`ForensicWarningSection.tsx:L26`](file:///d:/APP/股票紀錄/src/components/analysis/ForensicWarningSection.tsx#L26) 應收帳款與存貨剪刀差拿上一季（QoQ）計算，文案卻標註 YoY，淡旺季切換引發大量假塞貨警報。
3. **母公司淨利被合併總淨利篡位**：[`taiwanFinancialPipeline.ts:L66-L74`](file:///d:/APP/股票紀錄/src/engine/taiwanFinancialPipeline.ts#L66-L74) 未將「歸屬於母公司業主淨利」設為最高優先級，控股集團獲利嚴重虛胖。
4. **美股會計週期被自然月硬切**：[`usFinancialPipeline.ts:L27-L33`](file:///d:/APP/股票紀錄/src/engine/usFinancialPipeline.ts#L27-L33) 破壞了蘋果、微軟、輝達等非標準會計年度。
5. **IFRS 16 租賃負債誤判**：超商、餐飲、航空公司將無息租賃負債誤判為破產償債地雷。

### 2.3 系統架構與 UX 缺陷
1. **與既有 SQLite Lakehouse 孤島脫節**：專案已建置 SQLite 數據湖倉，但深度財報依然硬戳外部 FinMind API（3 秒超時），觸發 429 限流便直接噴白畫面，無法離線使用。
2. **快取無過期 TTL 機制**：[`financialCacheValidator.ts`](file:///d:/APP/股票紀錄/src/engine/financialCacheValidator.ts) 只要有存過資料便永不刷新，財報淪為過期死水。
3. **二級標籤過度碎裂化**：拆為 46 個二級標籤，使用者需點擊 40 多次，單檔 `AnalysisMetricView.tsx` 膨脹至 1,897 行，且缺乏 8 季三表全貌表。
4. **空殼外跳標籤**：`news_feed`、`news_events`、`reports_pdf` 純屬外部超連結，佔用核心導航空間。
5. **死代碼未啟用**：`financialReportPipeline.ts` 已具備 Markdown 研報生成能力，但 UI 缺乏觸發入口。
6. **行動端 RWD 破版**：三欄固定寬度（`110px 170px minmax(0, 1fr)`）在窄螢幕徹底橫向溢出。

---

## 3. 核心設計原則 (Guiding Principles)

1. **真實性第一 (Zero-Mock Protocol)**：徹底清除所有 fallback 臆測值，查無數據誠實顯示 `-` 或 `未單獨揭露`。
2. **KISS 減法收斂**：將 46 個碎裂子項目收斂為 **5 大專業高凝聚視圖**，移除空殼外鏈與無效 DCF 滑桿。
3. **打通既有數據湖倉 (Lakehouse-First)**：深度財報優先讀取本地 SQLite 湖倉，消除 API 429 噴白畫面。
4. **會計真實勾稽**：以母公司業主淨利、真實 YoY、有息負債比、合約負債（領先指標）重塑分析深度。

---

## 4. 詳細功能與技術規格 (Engineering Specifications)

### 4.1 假資料徹底清零 (Data Cleansing)
1. **Piotroski F-Score**：
   - 修正第 5 項（未增資稀釋）：依據近 4 季流通股數或股本 YoY 增長率是否超過 5% 動態判定，嚴禁寫死 `passed: true`。
   - 流動比率計算：優先讀取 `currentAssets` 與 `currentLiabilities`，缺漏時標註無法計算，嚴禁乘以 0.5。
2. **美股股數推導**：
   - 區分台股（面額 10 元）與美股（依損益表 Diluted Shares 或 Net Income / EPS 反推）。嚴禁對美股除以 10，拔除 10 億股保底硬編碼。
3. **估值 Fallbacks 拔除**：
   - 清除本益比 `1.16`、每股淨值 `32.5`、殖利率 `1.0` 與 `4.18%`、股利陣列 `[1.0, 1.0, ...]`。無資料一律呈現 `N/A`。
4. **會計師查核意見**：
   - 移除寫死四大與無保留意見，改為客觀提示「依公開資訊觀測站最新簽證公告為準」。

### 4.2 核心會計與金融公式校準 (Financial Repairs)
1. **估值河流圖歷史收盤價折線修復**：
   - 提取每季結算時的真實歷史收盤價數列，於河流圖前景繪製「歷史收盤價折線」，取代單一水平線。
2. **應收與存貨剪刀差 YoY 修正**：
   - 演算法嚴格對齊「去年同期季度（`year - 1 && quarter === curr.quarter`）」，消除淡旺季假塞貨警報。
3. **母公司淨利最高優先級**：
   - 解析台股綜合損益表時，以 `歸屬於母公司業主之本期淨利`（`EquityAttributableToOwnersOfParent`）為絕對最高優先順序。
4. **IFRS 16 租賃負債過濾**：
   - 償債安全性改以「金融有息負債比率 = (短期借款 + 長期借款) / 總資產」判定，避免將零售與航空的無息租賃負債誤判為地雷。
5. **良性資本支出擴產辨識**：
   - FCF 為負但 CFO 強勁成長時，標籤自動轉為「資本擴張期：大額資本支出用於產能擴充」。

### 4.3 實戰法人指標補強 (Institutional Edge)
1. **合約負債 (Contract Liabilities) 走勢**：
   - 於資產負債表與營運面板中，提煉合約負債 8 季走勢與 YoY，作為訂單景氣領先指標。
2. **存股借錢配息排雷**：
   - 計算 `FCF 股息覆蓋率 = 自由現金流 / 現金股利總額`。若小於 100%，亮黃/紅燈警示借債配息風險。
3. **每股淨現金 (Net-Net Valuation)**：
   - 提供週期股落底指標：`每股淨現金 = (現金及約當現金 - 總有息負債) / 流通股數`。
4. **美股 30% 稅後實拿殖利率提示**：
   - 美股現金殖利率旁加註一行「扣除海外 30% 預扣稅後預估實拿比率」。
5. **整合集保董監質押風控**：
   - 接入本地 SQLite 已注水之董監設質月報，質押比率 > 40% 亮起質押斷頭風險燈。

### 4.4 架構極簡收斂與導航重組 (UX & Architecture KISS)
1. **收斂為 5 大專業高凝聚視圖**：
   - **【財務三表全貌 (Statements)】**：一頁橫向對照 8 季損益表、資產負債表（含合約負債）、現金流量表。
   - **【獲利純度與杜邦 (Profitability)】**：三率走勢同圖 + 核心經常性利益純度 + 杜邦三因子。
   - **【營運週轉與訂單 (Efficiency)】**：合約負債走勢 + 營運天數 (DSO/DIO/CCC)。
   - **【實戰估值與配息 (Valuation)】**：智慧推薦最適河流圖（PE / PB / 股息河流）+ 借錢配息排雷。
   - **【法務會計排雷燈 (Forensic Radar)】**：真 YoY 剪刀差 + 現金流失血檢驗 + 董監質押風控。
2. **空殼外鏈移出導航**：
   - 移除 `news_feed`、`news_events`、`reports_pdf`，改於 Header 放置輕量外部觀測站連結圖示。
3. **活化研報導出**：
   - 頂部控制列新增「📥 導出深度財報研報 (Markdown)」按鈕，調用 `generateFinancialForensicMarkdown`。
4. **最近瀏覽 5 檔標的膠囊**：
   - 搜尋列旁記憶最近瀏覽的 5 檔股票，支援 0.1 秒無縫對比切換。
5. **打通本地 SQLite Lakehouse 與快取 TTL (120 天)**：
   - 優先讀取本地湖倉資料庫；快取超過 120 天或偵測到新季報時自動背景增量更新。
6. **RWD 自適應排版**：
   - 螢幕寬度 < 768px 時，雙層側邊欄收斂為頂部切換膠囊，釋放 100% 寬度給圖表。

---

## 5. 模組影響矩陣 (Impact Matrix)

| 檔案路徑 | 異動性質 | 核心職責 |
| :--- | :--- | :--- |
| `src/components/analysis/StockAnalysisWorkspace.tsx` | 重構 | 導航收斂為 5 大視圖、接入最近瀏覽膠囊、頂部新增研報導出按鈕、修復 RWD 窄螢幕佈局。 |
| `src/components/analysis/AnalysisMetricView.tsx` | 重構/瘦身 | 清除所有假資料 fallback、修復河流圖歷史收盤價折線、提供 8 季三表全貌表。 |
| `src/components/analysis/ForensicWarningSection.tsx` | 修正 | 修正剪刀差為真實 YoY 去年同季對比、區分擴張型 Capex、接入董監質押風控。 |
| `src/engine/keyMetricsEngine.ts` | 修正 | 修正 Piotroski 第 5 項動態判定、移除總負債 0.5 係數、修復美股股數推導。 |
| `src/engine/taiwanFinancialPipeline.ts` | 修正 | 母公司業主淨利列為最高順位、移除偽造四大會計師查核標籤、防禦 MOPS 累計數。 |
| `src/engine/dividendService.ts` | 補強 | 實作美股現金流量表股利反推機制，消除美股股利斷層。 |
| `src/engine/financialCacheValidator.ts` | 補強 | 加入 120 天季度時效性 TTL 校驗，防止過期死水。 |
| `src/engine/financialReportService.ts` | 整合 | 打通本地 SQLite 數據湖倉優先檢索，消除 API 429 噴白畫面。 |

---

## 6. 驗證與驗收契約 (Verification & Test Contracts)

1. **Zero-Mock 自動化稽核**：
   - 針對缺漏數據之標的，驗證全域絕無 `1.16`、`32.5`、`0.45`、`[1.0, 1.0, ...]` 出現，一律顯示 `-` 或 `N/A`。
2. **Piotroski F-Score 演算法測試**：
   - 驗證增資稀釋項目會依據股本真實變動給分，不再恆為 1 分。
3. **河流圖折線視覺驗收**：
   - 驗證本益比/淨值比河流圖前景為「歷史季度收盤價折線」，不再是單一貫穿之水平線。
4. **剪刀差 YoY 測試**：
   - 驗證淡旺季標的之應收與存貨增長率以去年同季為分母，誤報率歸零。
5. **單元測試全綠與編譯 0 錯誤**：
   - `npm test` 100% 通過，`npm run build` TypeScript 0 錯誤。
