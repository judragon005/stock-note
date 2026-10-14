# 技術債 0050: AnalysisMetricView 單體元件子模組解耦重構 (AnalysisMetricView Subcomponent Decomposition)

* **建立日期**：2026-10-13
* **狀態**：`OPEN`
* **優先級**：`P3 (Low)`
* **來源**：Code Review (Spec 0180 / Issue #230)
* **標籤**：`Refactor` · `UI` · `CleanCode` · `StockAnalysis` · `ForensicAccounting`

---

## 1. 現狀診斷與背景 (Context & Problem)

在 Spec 0180 實作中，`src/components/analysis/AnalysisMetricView.tsx` 整合了個股深度財報的 46 項細項指標視覺化展示，包含：
1. **獲利能力模組** (Margins, OPEX, ROE/ROA, 杜邦年化分析, 營運週轉天數, 現金股利發放率等)
2. **償債與安全性模組** (財務結構、流速動比率、利息保障倍數、自由現金流對淨利比)
3. **成長力模組** (營收、毛利、營業利益、稅後淨利與 EPS 成長率)
4. **價值評估模組** (P/E 評價與河流圖、P/B 評價與河流圖、現金殖利率、平均股利估值、DCF 與 DDM 折現模型)
5. **法務會計五大排雷燈模組** (應收剪刀差、獲利純度、FCF 失血、存貨積壓與負債比率)

### 存在痛點
* 單一檔案行數已達 2,050 行，屬於典型的單體大元件 (Monolithic Component)。
* 儘管全量採用純原生 CSS 變數與條件渲染且執行效能優良，但所有子分頁之 JSX 結構與計算均聚集於單一元件內部，增加跨工程師維護與單元測試之認知負擔。

---

## 2. 建議解法與重構架構 (Proposed Solution)

將 `AnalysisMetricView.tsx` 拆分為外層調度控制器與領域專屬子元件：

```text
src/components/analysis/
├── AnalysisMetricView.tsx                 # 頂部狀態協調、共用走勢圖 helper 與路由分發
└── sections/
    ├── ProfitabilitySection.tsx           # 獲利能力與杜邦分析視圖
    ├── SolvencySection.tsx                # 償債能力與財務結構視圖
    ├── GrowthSection.tsx                  # 成長力比率走勢視圖
    ├── ValuationSection.tsx               # 本益比、P/B 河流圖、殖利率與 DCF/DDM 模型
    └── ForensicWarningSection.tsx         # 法務會計五大排雷排毒燈模組
```

---

## 3. 預期效益 (Benefits)

1. **職責分離 (SoC)**：各財務模組獨立維護，單一元件行數控制在 300~500 行以內。
2. **測試細粒度化**：各 Section 可擁有獨立之靜態渲染單元測試，提升 CI 執行效能與除錯精準度。
3. **無損回退**：介面屬性與公開 props 維持完全一致，外部呼叫方零破壞。
