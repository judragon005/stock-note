# Spec 0180: 個股分析深度財報引擎純粹化、ETF物理阻斷、假資料清除與視覺架構重構

## 1. 概述
本迭代徹底落實「個股分析（副標：【深度財報】）」的單一職責收斂，嚴格隔離 ETF 與籌碼元素，重構智策多維提示詞引擎面板至專案原生深色 Glassmorphism 設計系統，清除所有寫死假數據 Fallback，並修復重大會計邏輯與年化缺陷。

## 2. 細粒度工單清單 (Atomic 19 Tickets)

### 模組 A：視覺、邊界與標的收斂
- [ ] **Ticket 01**: [移除快捷標的膠囊列 (Stock Pills Removal)](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/01-remove-stock-pills.md)
- [ ] **Ticket 02**: [標的選單物理阻斷 ETF 與初始標的防呆](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/02-isolate-etf-from-symbol-selection.md)
- [ ] **Ticket 03**: [ETF 橫幅導引至【主力戰情室】](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/03-etf-banner-route-to-warroom.md)
- [ ] **Ticket 04**: [提示詞面板移除無效 Tailwind & 回歸原生變數](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/04-prompt-panel-native-tokens.md)
- [ ] **Ticket 05**: [提示詞面板頂部控制列重構](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/05-prompt-panel-header-bar.md)
- [ ] **Ticket 06**: [六頂思考帽 6 欄水平平行卡片網格](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/06-six-hats-grid-layout.md)
- [ ] **Ticket 07**: [抽屜式 XML 語意提示詞預覽器](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/07-xml-prompt-drawer.md)

### 模組 B：數據排毒 (Zero-Mock Data Cleansing)
- [ ] **Ticket 08**: [營運天數排毒與真實空狀態 (Turnover Days Zero-Mock)](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/08-turnover-days-zero-mock.md)
- [ ] **Ticket 09**: [長短期金融借款排毒與台泥假數值清除](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/09-debt-structure-zero-mock.md)
- [ ] **Ticket 10**: [現金轉換循環 CCC 排毒 (CCC Zero-Mock)](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/10-cash-conversion-zero-mock.md)

### 模組 C：會計公式與年化校正 (Accounting Logic Repairs)
- [ ] **Ticket 11**: [現金股利發放率公式校正與全年 EPS 聚合](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/11-dividend-payout-repair.md)
- [ ] **Ticket 12**: [杜邦分析總資產週轉率年化校正](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/12-dupont-annualization.md)
- [ ] **Ticket 13**: [經營週轉次數單季流量年化校正](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/13-turnover-rates-annualization.md)

### 模組 D：台美雙市場與進階防禦機制 (Dual-Market & Forensic Defense)
- [ ] **Ticket 14**: [美股季配息年化識別與真實殖利率計算](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/14-us-dividend-annualization.md)
- [ ] **Ticket 15**: [台美雙市場計價單位與幣別自適應 (USD/TWD)](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/15-currency-scale-adaptive.md)
- [ ] **Ticket 16**: [金融保險業指標合規豁免機制](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/16-financial-institution-exemption.md)
- [ ] **Ticket 17**: [景氣循環股 P/B 河流圖優先引導](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/17-cyclical-pb-valuation-guide.md)
- [ ] **Ticket 18**: [法務會計五大排雷排毒燈 (Forensic Warning Lights)](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/18-forensic-accounting-warning-lights.md)

### 模組 E：全量迴歸與最終驗收
- [ ] **Ticket 19**: [全量自動化迴歸、領域手冊同步與最終驗收](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/19-full-regression-and-doc-sync.md)

## 3. 關聯規格與架構文檔
* **Spec 0180:** [docs/specs/0180-stock-analysis-forensic-accounting-etf-isolation-and-ui-repair-spec.md](file:///d:/APP/股票紀錄/docs/specs/0180-stock-analysis-forensic-accounting-etf-isolation-and-ui-repair-spec.md)
* **ADR 0180:** [docs/adr/0180-stock-analysis-forensic-accounting-etf-isolation-and-ui-repair.md](file:///d:/APP/股票紀錄/docs/adr/0180-stock-analysis-forensic-accounting-etf-isolation-and-ui-repair.md)
