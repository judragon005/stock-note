# 規格 0145：AI 主力戰情室響應式 Bento-Grid 重構與雙層繁中行情列 (Spec 0145)

## Problem Statement

目前的「AI 主力行為判讀與全功能量化決策儀表板」（AI Force Dashboard，規格 0140）在實際使用與不同螢幕解析度下存在顯著的使用者體驗瓶頸：

1. **頂部行情列過載緊縮與語言不一致**：
   - 頂部第一列將 4 大系統狀態膠囊燈號、股票代號輸入框、股票名稱、分析按鈕以及 10 大即時行情指標（收盤價、漲跌額、漲幅、成交量、成交筆數等）強行水平擠在同一行內，導致版面擁擠甚至產生橫向捲軸。
   - 狀態燈號全為英文標籤（`AI SCAN ACTIVE`、`MAIN FORCE TRACKING`、`MARKET STATUS`、`VOLATILITY ALERT`），未對齊系統繁體中文語言規範，降低了在地投資人的識別直覺性。

2. **01 主 K 線缺乏獨立焦點視野**：
   - `01 主 K 線` 目前與 `02 AI 決策核心`、`03 多維度判讀`、`04 AI 籌碼熱區圖`、`05 風險雷達圖` 擠在 Row 1（一排硬塞 5 張卡片），使核心的 K 線與量價結構被橫向擠壓，難以獲得專業交易終端級別的看盤體驗。

3. **死板 4 行網格導致嚴重視覺擠壓與圖表重疊**：
   - 原 Row 3 塞入 6 張等寬卡片（10~15），單卡寬度僅 ~150-180px，導致 `11 健康度綜合評估表` 的 5 個進度圓環縮小變形、數值難以辨識，`12 AI 主力動態信號` 文字擠壓。
   - `08 法人行為計量` 在狹窄欄寬下，左側柱狀圖與右側 3 日進出明細表格發生嚴重的版面覆蓋重疊。
   - 卡片未依內容本質配置寬度，缺乏「內容導向（Content-Driven）」的彈性佈局。

## Solution

建立響應式「專業交易員戰情室（Triple-Tier Content-Driven Bento Grid）」架構：

1. **雙層全功能行情列 (Two-Tier Market Bar)**：
   - **第一層（操作與系統狀態列）**：左側展示加大、高對比的股票代號輸入框、股票名稱與「分析」按鈕；右側呈現 4 大全繁體中文科技感狀態膠囊燈號（`AI 智慧掃描`、`主力行為追蹤`、`市場即時狀態`、`波動異常預警`）。
   - **第二層（寬幅即時行情大面板）**：大字體高對比橫向展示今日收盤價、今日漲跌、今日漲幅（雙色動態發光）、成交量(張)、成交筆數、開盤價、最高價、最低價、最新交易日、資料筆數。

2. **01 主 K 線獨立全寬滿版**：
   - 將 `01 主 K 線圖` 設為獨立第 1 排（100% 寬度滿版），賦予完整橫向呼吸視野與專業看盤深度，週期與副圖指標自由切換不受側邊卡片擠壓。

3. **內容導向自然流 Bento-Grid（依序 01 ➔ 18 由左至右、由上而下）**：
   - 突破 4 行限制，依據每張卡片的圖表形態與資訊密度量身配置專屬寬度權重：
     - **第 1 排 (100% 滿版)**：`01 主 K 線圖`
     - **第 2 排 (4 卡均勻分佈)**：`02 AI 決策核心` (1.1fr) + `03 多維度判讀` (1fr) + `04 AI 籌碼熱區圖` (1fr) + `05 風險雷達圖` (1fr)
     - **第 3 排 (3 卡，08 享有 1.8fr 寬幅)**：`06 累積型 AI 預測` (1.1fr) + `07 主力成本結構分布` (1.1fr) + `08 法人行為計量` (1.8fr，徹底解決柱狀圖與 3 日表格重疊)
     - **第 4 排 (3 卡，11 享有 1.6fr 寬幅)**：`09 隔日沖風險分析` (1fr) + `10 AI 多空能量棒` (1fr) + `11 健康度綜合評估` (1.6fr，5 個圓環大幅放大，數值標籤清晰)
     - **第 5 排 (4 卡緊湊監控)**：`12 AI 主力動態信號` (1fr) + `13 台股市場情緒` (1.1fr) + `14 AI 信心維度` (0.9fr) + `15 籌碼異動摘要` (1fr)
     - **第 6 排 (3 卡，18 享有 1.8fr 決策大面板)**：`16 買賣力分布` (1.1fr) + `17 多空強度分布` (1.1fr) + `18 主力追蹤總評判` (1.8fr，醒目大字語意標籤與 AI 結論文案)

4. **視覺層級強化與圖表細節修復**：
   - 強化關鍵警示標籤（如 AI WARNING、主力方向、評判語意）的高對比發光徽章。
   - 微調 `04 AI 籌碼熱區圖` 價格刻度與文字溢出邊界。

## User Stories

1. As a trader, I want the stock search box and system status badges to occupy a clean dedicated top tier, so that I can switch tickers effortlessly and verify scanning status without visual clutter.
2. As a Taiwan stock investor, I want all system status badges to display clear Traditional Chinese text (`AI 智慧掃描`, `主力行為追蹤`, `市場即時狀態`, `波動異常預警`), so that I can instantly comprehend system health without mental translation.
3. As a market observer, I want the real-time quote metrics (close price, change, percent, volume, tick count) to be displayed on an uncompressed second tier with enlarged typography, so that key prices stand out at first glance.
4. As a technical analyst, I want the primary candlestick chart (`01 主 K 線`) to span the entire screen width (100% full width) in its own dedicated row, so that I can analyze 30D/60D/120D/250D trends, moving average crossovers, and volume bars with maximum clarity.
5. As a quant user, I want the 18 cards to strictly follow the sequential order from 01 to 18 (left-to-right, top-to-bottom), so that my visual scanning path matches the canonical card taxonomy.
6. As a chip analyst, I want the institutional flow card (`08 法人行為計量`) to have an expanded width (1.8fr) with distinct margins, so that the dual-axis net buy/sell bar chart and the 3-day detail table never overlap or collide.
7. As a fundamental and technical investor, I want the health evaluation card (`11 健康度綜合評估表`) to have an expanded width (1.6fr), so that the 5 radial progress gauges are enlarged by at least 40% and labels/percentages are crisp and easily legible.
8. As a swing trader, I want the vertical volume profile card (`04 AI 籌碼熱區圖`) to have proper padding and vertical height, so that price steps and accumulation percentages do not wrap awkwardly or clip.
9. As an executive decision-maker, I want the final AI verdict card (`18 主力追蹤總評判`) to be rendered as an expansive bottom billboard (1.8fr), so that the primary semantic directive and AI analysis prose are prominently displayed as the synthesis anchor of the dashboard.
10. As a user on various desktop display sizes (from 1366px laptops to 4K monitors), I want the Bento Grid to fluidly adapt with minmax constraints and stretch gracefully, so that no card collapses below readable thresholds.

## Implementation Decisions

### 1. HeaderMarketBar 雙層與繁體中文架構
- 將 `HeaderMarketBar` 的最外層容器由單列水平 Flex 改為直向 Flex，內含兩個子 Bar：
  - **Upper Bar (Control & Status)**：左側輸入表單（Input + 股票名稱 + 分析按鈕），右側 4 大膠囊標籤。
  - **Lower Bar (Realtime Quotes)**：橫向分佈 10 大即時行情數據，加大字體與雙色對比。
- 系統燈號 Label 全面改為繁體中文：
  - `AI_SCAN`: `AI 智慧掃描` (帶有綠色動態呼吸點)
  - `MAIN_FORCE`: `主力行為追蹤`
  - `MARKET_STATUS`: `市場即時狀態`
  - `VOLATILITY`: `波動異常預警`
- 更新相應單元測試 `HeaderMarketBar.test.ts` 對應之斷言。

### 2. Bento-Grid 容器佈局結構 (`AiForceDashboardView.tsx`)
- 採用 6 排自然流 Bento Grid 佈局：
  - **Row 1**: `1fr` 全寬獨立容器，直接放置 `KLineChartCard`。
  - **Row 2**: `gridTemplateColumns: 'minmax(240px, 1.1fr) minmax(200px, 1fr) minmax(200px, 1fr) minmax(200px, 1fr)'`，容納 `02`, `03`, `04`, `05`。
  - **Row 3**: `gridTemplateColumns: 'minmax(240px, 1.1fr) minmax(240px, 1.1fr) minmax(380px, 1.8fr)'`，容納 `06`, `07`, `08`。
  - **Row 4**: `gridTemplateColumns: 'minmax(240px, 1fr) minmax(240px, 1fr) minmax(360px, 1.6fr)'`，容納 `09`, `10`, `11`。
  - **Row 5**: `gridTemplateColumns: 'minmax(200px, 1fr) minmax(220px, 1.1fr) minmax(180px, 0.9fr) minmax(200px, 1fr)'`，容納 `12`, `13`, `14`, `15`。
  - **Row 6**: `gridTemplateColumns: 'minmax(240px, 1.1fr) minmax(240px, 1.1fr) minmax(400px, 1.8fr)'`，容納 `16`, `17`, `18`。

### 3. 子組件抗重疊與視覺修復
- **`InstitutionalFlowCard.tsx`**：將內部圖表與表格的 Grid 或 Flex 排版改為明確的左右防碰撞佈局，保證在各種解析度下 3 日表格緊貼右側且不遮蓋左側圖表 SVG 繪圖區。
- **`HealthSummaryCard.tsx`**：調整 5 環的 SVG 直徑與字體尺寸，當外層容器寬度增加時自動利用可用空間等比縮放，確保文字、百分比與環狀進度條不相互重疊。
- **`VolumeProfileCard.tsx`**：優化價格階梯文字與百分比標籤的 padding 與字體大小，杜絕邊界裁切。

## Testing Decisions

### 1. 良好的測試準則 (Good Test Principles)
- 測試應專注於公開行為與 DOM 可見輸出，不綁死內部 CSS 樣式字串。
- 驗證標籤繁體中文轉換正確性、雙層容器掛載正確性、18 張卡片渲染完整性。

### 2. 目標測試縫隙 (Target Test Seams)
- **`HeaderMarketBar.test.ts`**：
  - 驗證 4 大狀態指示燈之中文 label 正確性 (`AI 智慧掃描`, `主力行為追蹤`, `市場即時狀態`, `波動異常預警`)。
  - 驗證漲跌色彩與千分位格式化輸出維持正確。
- **`AiForceDashboardView.test.tsx`**：
  - 驗證包含 01~18 全部卡片之 DOM 結構完整掛載且未引發崩潰。
- **`HealthSummaryCard.test.ts` / `InstitutionalFlowCard.test.ts`**：
  - 驗證相關數值與子視圖計算契約維持綠燈。

## Out of Scope

- 不修改後端 TWSE / FinMind API 抓取邏輯與快取協議。
- 不修改底層各指標計算公式（如 VWAP 計算、波動率錐體公式、MLP 評判權重）。
- 不更換既有深色科技玻璃擬態整體主題配色盤。

## Further Notes

- 本規格完成後，將透過 `/to-tickets` 拆解為獨立的原子級執行票券，並遵循紅-綠-重構 (TDD) 循環落實開發。
