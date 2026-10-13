# 0180 Spec: 個股分析深度財報引擎純粹化、ETF物理阻斷與視覺架構重構規格書

## 1. 概述與元數據 (Overview & Metadata)

* **規格編號：** Spec 0180
* **標題：** 個股分析深度財報引擎純粹化、ETF物理阻斷、假資料清除與視覺架構重構
* **關聯 Issue：** [Issue #230](https://github.com/judragon005/stock-note/issues/230)
* **關聯架構決策：** [ADR 0180: 個股深度財報職責收斂與台美普通股純粹化架構](file:///d:/APP/股票紀錄/docs/adr/0180-stock-analysis-forensic-accounting-etf-isolation-and-ui-repair.md)
* **規格狀態：** `IN_DEVELOPMENT` (開工規格書)
* **版本：** V1.0
* **建立日期：** 2026-10-13

---

## 2. 背景與問題剖析 (Background & Problem Statement)

在專案演進至個股深度分析（副標：【深度財報】）的過程中，出現了嚴重的功能蔓延（Feature Creep）、邊界模糊、會計計算缺陷與視覺崩壞：

1. **樣式跑版與設計系統脫鉤**：
   `StrategicPromptPanel`（智策多維提示詞引擎）使用了專案未安裝的 Tailwind CSS Utility Classes，導致在純 Vanilla CSS 環境中類別失效，六頂思考帽按鈕垂直堆疊崩壞，失去深色科技 Glassmorphism 質感。
2. **職責邊界混亂與冗餘元素**：
   個股深度財報頁面誤植了屬於主力戰情室的「🔥 快捷標的膠囊列 (Stock Pills)」，且標的列表中混雜了大量 ETF（如 0050、0056、00679B），與「深度財報」的核心職責嚴重衝突。
3. **硬編碼假資料違背零幻覺原則 (Zero-Mock Defect)**：
   在 `AnalysisMetricView.tsx` 中，多個模組在缺漏數據時直接 fallback 寫死假數據：
   - 營運週轉天數寫死 `42 天` (DSO)、`56 天` (DIO)、`68 天` (CCC)。
   - 現金轉換循環寫死 `68 天`。
   - 長短期借款結構直接 hardcode 寫死台泥的數字（`227.6 億` 與 `1,454.2 億`），即便切換到台積電或聯發科亦同。
4. **重大會計邏輯與年化計算缺陷**：
   - **現金股利發放率 (`dividend_payout`)**：以全年每股現金股息除以「單一季度 EPS」，導致發放率暴增 4 倍，且無數據時寫死 `65%`。
   - **流量與存量未年化**：計算杜邦分析之「總資產週轉率」與「經營週轉次數」時，直接以單季營收除以總資產，導致週轉率縮水 4 倍。
   - **美股季配息未年化**：美股季配息（Quarterly Dividend）被視為年配息計算，導致美股殖利率縮水 4 倍。
5. **空殼跳轉與進階功能缺失**：
   即時重大訊息 (`news_feed`)、重大事件日曆 (`news_events`) 與電子書 (`reports_pdf`) 僅為外部超連結跳轉，缺乏實質數據；且缺乏金融業指標豁免、景氣循環股 P/B 估值警示與法務會計排雷燈。

---

## 3. 核心設計原則與四大護欄 (Core Principles & Guardrails)

### 3.1 職責單一與純粹基本面原則 (Single Responsibility: Forensic Fundamental Only)
* **個股分析（深度財報）**：100% 聚焦於企業資產負債表、損益表、現金流量表真實勾稽、盈餘品質檢驗與內在價值估算。
* **主力戰情室**：全權負責外資、投信、主力、籌碼資金流向與 ETF 折溢價分析。兩者嚴禁功能互串混淆。

### 3.2 標的過濾海關與 ETF 物理阻斷 (Target Asset Gatekeeper)
* **全域排除 ETF**：深度財報之標的選單、持倉切換清單只允許「普通股 (Common Stocks)」，台美股普通股兼備。
* **ETF 導引規範**：若使用者搜尋或輸入 ETF 代碼，系統明確提示：
  > **「此標的為 ETF，不具備個股財務報表，建議前往【主力戰情室】檢視」**，並提供一鍵跳轉按鈕。

### 3.3 零偽造與防幻覺原則 (Zero-Mock Protocol)
* **禁止任何 Hardcode 數據 Fallback**：若公司無該科目或計算無效，統一顯示 `-` 或 `N/A (無申報資料)`，絕不填入非真實數字。

### 3.4 原生設計系統對齊 (Vanilla CSS & Glassmorphism Alignment)
* 嚴格使用專案全域 CSS 變數（`--bg-card`, `--border-color`, `--bg-secondary`, `--radius-md`），拋棄任何無效的 Tailwind classes。

---

## 4. 詳細工程與功能規格 (Detailed Engineering Specifications)

### 4.1 介面重構與版面清理 (UI / UX Refactoring)
1. **移除快捷標的列**：
   - 徹底移除 `StockAnalysisWorkspace.tsx` 中的 `Stock Pills` 膠囊列（Flame 快捷標的）。
   - 頂部直接乾淨展開為標的 Header（名稱、代碼、即時價、追蹤按鈕、下拉搜尋選單）。
2. **重構「智策多維提示詞引擎 (`StrategicPromptPanel`)」**：
   - 改為原生深色毛玻璃卡片（`--bg-card`, border: `var(--border-color)`）。
   - 頂部控制列：整合 BrainCircuit 圖標、標題、個股大師 V12.0 徽章、部位脫敏切換膠囊、Token 計數膠囊、一鍵複製 Master Prompt 按鈕。
   - 六頂思考帽平行認知矩陣：採用 6 欄水平自適應卡片網格，各思考帽卡片具備專屬色系微漸層、帽徽、焦點說明、獨立單頂思考帽複製按鈕與選取反饋。
   - 底部 XML 語意預覽器：可折疊抽屜式設計，支援 JetBrains Mono 高對比終端風格。

### 4.2 標的選單過濾與 ETF 阻斷轉發
1. **持倉選單過濾**：
   - `initialSymbol` 與切換候選標的，過濾排除 `isEtfSymbol(symbol)`。
2. **ETF 警示條款修改**：
   - 橫幅文字更新為：「*此標的為 ETF，不具備個股財務報表，建議前往【主力戰情室】檢視*」。
   - 提供按鈕直接導流至【主力戰情室】。

### 4.3 數據排毒與假資料清除 (Data Cleansing)
1. **`turnover_days` (營運週轉天數)**：
   - 移除 `'42 天'`, `'56 天'`, `'68 天'` 寫死邏輯。若缺少科目，輸出 `'- 天'` 或 `'無資料'`。
2. **`debt_structure` (長短期金融借款)**：
   - 移除 `'227.6 億'`, `'1,454.2 億'` 寫死台泥數值。若財報未拆分長短期借款，顯示 `'未單獨揭露'`。
3. **`cash_conversion` (現金轉換循環)**：
   - 移除寫死 `68 天`，若無法計算顯示 `'-'`。

### 4.4 關鍵會計公式修正 (Accounting Logic Repairs)
1. **現金股利發放率 (`dividend_payout`)**：
   - 修正分母為：該年度 4 季累計 EPS（$\sum_{q=1}^{4} \text{EPS}_q$）。
   - 公式：$\text{Payout Ratio} = \frac{\text{Cash Dividend}}{\sum \text{EPS}} \times 100\%$。
   - 移除 `65%` 假資料 fallback。
2. **流量指標年化處理 (Annualization)**：
   - 杜邦分析資產週轉率：採用近 4 季 TTM 營收（或單季營收 $\times 4$）除以期末總資產。
   - 營運週轉率：單季銷貨成本與營收進行年化（$\times 4$）計算次數，杜絕週轉天數縮水 4 倍。
3. **美股季配息年化與雙幣別自適應**：
   - 支援美股頻率辨識，美股季度股利年化後計算現金殖利率。
   - 標記計價幣別：台股以 `NT$`、`億元` 為主；美股以 `US$`、`百萬(M)/十億(B)` 為主。

### 4.5 進階財務防禦與屬性機制 (Forensic Defense & Attributes)
1. **金融業指標豁免 (Financial Institution Exemption)**：
   - 辨識金融股（銀行、金控、證券、保險），自動豁免毛利率、存貨週轉天數、負債比率，不觸發異常地雷假警報。
2. **景氣循環股 P/B 河流圖優先引導**：
   - 針對原物料、水泥、鋼鐵、面板、航運等週期股，於估值分頁提示「景氣循環股優先看股價淨值比 (P/B) 河流圖，謹防低本益比陷阱」。
3. **法務會計五大排雷排毒燈 (Forensic Warning Lights)**：
   - 營收 vs 應收帳款成長率剪刀差（應收增長遠高於營收增長）。
   - 獲利純度警訊（營業現金流 CFO / 稅後淨利 NI < 80%）。
   - 自由現金流持續為負。
   - 存貨週轉天數暴增。
   - 股本快速膨脹稀釋。

---

## 5. 模組影響矩陣與檔案異動清單 (Impact Matrix)

| 檔案路徑 | 異動性質 | 核心職責 |
| :--- | :--- | :--- |
| `src/components/analysis/StrategicPromptPanel.tsx` | 重構 | 移除無效 Tailwind classes，全面改為原生 CSS 變數與 Glassmorphism 樣式，精緻 6 頂思考帽網格。 |
| `src/components/analysis/StockAnalysisWorkspace.tsx` | 修改 | 移除快捷標的列，持倉物理排除 ETF，修改 ETF 橫幅文字為「建議前往【主力戰情室】檢視」並導引。 |
| `src/components/analysis/AnalysisMetricView.tsx` | 修正 | 清除所有寫死假資料（42/56/68天、台泥借款數值），修正股利發放率全年 EPS 分母與杜邦年化計算。 |
| `src/components/analysis/StrategicPromptPanel.test.tsx` | 更新 | 同步單元測試案例，確保新樣式與原生結構通過測試。 |
| `src/components/analysis/AnalysisMetricView.test.tsx` | 新增/更新 | 覆蓋真實資料計算、無資料防禦、公式修正測試。 |

---

## 6. 驗證與測試契約 (Verification & Test Contracts)

1. **單元測試全綠 (100% Pass)**：
   - `npm test` 必須 100% 綠燈，包含 `StrategicPromptPanel.test.tsx` 與 `StockAnalysisWorkspace.test.tsx`。
2. **TypeScript 編譯 0 錯誤**：
   - `npm run build` 通過，無任何型別報錯或遺漏。
3. **無假資料驗證 (Zero-Mock Audit)**：
   - 針對缺漏科目標的測試，確認畫面呈現 `-` 或 `N/A`，絕無 `42 天` 或 `227.6 億` 出現。
4. **視覺還原度驗證**：
   - 智策多維提示詞引擎在瀏覽器中具備正確的水平 6 欄思考帽卡片佈局與高對比暗黑深色質感。
