# Spec 0125: 穿透式財報深度分析儀意義增強、三大報表聚合與操盤手決策系統規格 (Financial Forensic Clarity, Tri-Statement Pipeline & Action Directives Spec)

## Problem Statement

在 V8.42.1 修復財報穿透彈窗樣式與置中遮罩後，使用者實際操作【2327 國巨*】時發現整體分析在視覺與決策層面仍存在嚴重缺陷：「應該要有明確的訊息，視覺上使用者看不出來你現在這個分析有什麼意義。」

經深度審查代碼、API 響應與使用者操作截圖，識別出四大根本問題：

1. **台股外部資料管線殘缺（現金流為 0 的假陽性真兇）**：
   - `taiwanFinancialPipeline.ts` 僅請求了 FinMind 的 `TaiwanStockFinancialStatements`（**該資料集僅含綜合損益表**），未請求資產負債表（`TaiwanStockBalanceSheet`）與現金流量表（`TaiwanStockCashFlowsStatement`）。
   - 導致台股標的的營業活動現金流量 (CFO) 與資產負債全數為 0。
   - 系統將 CFO = 0 誤判為「🔴 重大風險」，且淨利 vs CFO 柱狀圖全黑無柱子，杜邦 ROE 拆解亦因缺少總資產與負債而失準。

2. **操盤結論語意嚴重矛盾（系統邏輯衝突）**：
   - 截圖中現金流為「🔴 重大風險」、獲利能力為「🟡 體質警戒」、綜合評分僅 55 分 (WARNING)，但「0 秒核心操盤結論」卻盲目輸出：「整體財務結構平穩，獲利與營運現金流處於健康區間。」
   - 盲目的 else 兜底邏輯導致結論與燈號互相衝突，使用者無法得知這家公司體質到底是有風險還是平穩。

3. **視覺數字真空（缺乏刻度與具體數值）**：
   - **獲利三率折線圖**：左側沒有任何 Y 軸百分比刻度（如 0%、15%、30%、45%），圖例右上角亦無最新季度的具體數值膠囊，折線高低全靠猜測。
   - **淨利 vs CFO 階梯圖**：缺乏每季金額標籤（如：稅後淨利 54.5 億 vs CFO 0 億），當 CFO 為 0 或負數時畫面呈現空矩形。
   - **四大體質燈號卡片**：僅有抽象的燈號與文字標題，未列出具體支撐指標（如：最新毛利率、最新負債比、最新營運現金流金額）。

4. **缺乏具體明確的「操盤手操作指引」**：
   - 使用者看到 55 分 (WARNING) 與現金流風險，缺乏如同 `holdingAdvisorEngine` 的具體操作定調（如：【防守觀望】、【逢高減碼】）與實質操作指引（如：切忌追高、嚴設停損）。

## Solution

依據 **KISS 原則**、**第一性原理** 與用戶確認之 **【風格 A：資深基本面操盤手風格】**，實施全方位補強：

### 1. 台股三大財務報表原子聚合管線 (`taiwanFinancialPipeline.ts`)
- 同步並行抓取三大資料集：
  1. `TaiwanStockFinancialStatements` (綜合損益表：Revenue, GrossProfit, OperatingIncome, PreTaxIncome, IncomeAfterTaxes, EPS)
  2. `TaiwanStockBalanceSheet` (資產負債表：TotalAssets, TotalLiabilities, TotalEquity, AccountsReceivable, Inventories, CashAndCashEquivalents, Short/LongTermDebt)
  3. `TaiwanStockCashFlowsStatement` (現金流量表：CashFlowsFromOperatingActivities/NetCashInflowFromOperatingActivities, PropertyAndPlantAndEquipment/CapitalExpenditures)
- 依據 `date` 進行跨表原子歸併，確保 16 項標準科目完整入庫與 IndexedDB 快取，徹底根除 CFO 為 0 之假陽性。

### 2. 資深操盤手風格定調與白話決策引擎 (`financialScoringEngine.ts`)
- 徹底移除衝突的無腦平穩兜底文字，導入三層結構化決策：
  - **【操盤定調】**：
    - 85~100 分：`【強勢造血·長線續抱】`
    - 65~84 分：`【體質穩健·逢回布局】`
    - 45~64 分：`【體質承壓·防守觀望】`
    - 0~44 分：`【重大風險·嚴格戒備】`
  - **【核心矛盾剖析】**：精準點出財務隱憂（如：「帳面淨利持續成長，但近季營業現金流 CFO 呈現負流出或嚴重脫鉤，警惕紙上富貴與應收帳款塞貨風險」）。
  - **【具體操盤方針】**：提供明確操作指引（如：「建議暫緩追高加碼，嚴設均線跌破停損點，靜待營運現金流改善或存貨去化」）。

### 3. 獲利三率折線圖數值化與刻度標籤 (`FinancialTrendsLayer.tsx`)
- SVG 增加左側 Y 軸刻度線與數值百分比標籤（動態計算 min/max 刻度，如 0%、10%、20%、30%、40%）。
- 頂部圖例直觀展示「最新一季三率數值膠囊」：
  - 🟢 毛利率：`XX.X%`
  - 🔵 營益率：`XX.X%`
  - 🟣 淨利率：`XX.X%`

### 4. 淨利 vs CFO 階梯柱狀圖金額與雙向正負柱 (`FinancialTrendsLayer.tsx`)
- 支援雙向正負柱狀排版（負 CFO 明確向下延伸並以紅色警示）。
- 柱子上方/下方直接標註金額標籤（如 `淨 54.5 億`、`CFO -12.3 億`）。
- 發生現金脫鉤時顯著呈現「⚠️紙上富貴」背離標籤。

### 5. 四大體質維度卡片數值資訊化 (`FinancialHeroLayer.tsx`)
- 每個體質維度卡片直接內嵌最新季度核心數值：
  - **獲利能力**：毛利率 `XX.X%` ｜ ROE `XX.X%` ｜ 趨勢狀態
  - **安全性與償債**：負債比 `XX.X%` ｜ 速動比 `XX.X%` ｜ 淨現金水位
  - **營運效率**：DSO `XX 天` ｜ CCC `XX 天`
  - **現金流健康**：最新季 CFO `+/-XX 億` ｜ FCF `+/-XX 億`

## Acceptance Criteria (驗收標準)

1. **三大報表完整聚合 (Data Ingestion)**：
   - 抓取台股標的（如 2327 國巨）時，營運現金流 (CFO)、資本支出、總資產、總負債與股東權益皆非全 0，且正確入庫與快取。
2. **操盤手結論語意一致無矛盾 (Decision Clarity)**：
   - 「0 秒核心操盤結論」必須包含明確的【操盤定調】、【核心矛盾】與【操盤方針】。
   - 燈號出現風險時，結論必須清楚說明風險來源，嚴禁出現「獲利現金流平穩健康」之矛盾文字。
3. **三率折線圖數值可讀性 (Trends Visualization)**：
   - 折線圖左側具備清晰之 Y 軸百分比刻度標籤與格線。
   - 頂部圖例清楚呈現最新一季之毛利率、營益率、淨利率百分比數字。
4. **淨利 vs CFO 階梯圖金額標籤 (Cash Flow Quality)**：
   - 每季長條柱明確顯示稅後淨利與 CFO 的金額標籤（百萬或億）。
   - CFO 為負時正確向下延伸並以醒目紅色標記。
5. **四大體質卡片數據化 (Metric Cards)**：
   - 四大卡片均內嵌最新核心數字，使用者一目了然判定依據。
6. **回歸測試與構建 (Regression & Build)**：
   - 全量單元測試 100% 通過。
   - `npm run build` TypeScript 0 錯誤。
