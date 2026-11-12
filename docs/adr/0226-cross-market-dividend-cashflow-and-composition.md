# 0226 ADR: 台美跨市場股利發放日精準時序、ETF 配息組成穿透與被動現金流全景重構 (Cross-Market Dividend Payment Date Precision, ETF Distribution Composition Look-Through & Modular Dashboard Architecture)

## 狀態 (Status)
`ACCEPTED` (2026-11-12)

## 關聯 Issue 與規格 (Associated Issue & Spec)
- Issue: [#507](https://github.com/judragon005/stock-note/issues/507)
- Spec: [docs/specs/0226-cross-market-dividend-cashflow-and-composition-spec.md](file:///d:/APP/股票紀錄/docs/specs/0226-cross-market-dividend-cashflow-and-composition-spec.md)

---

## 背景與問題脈絡 (Context)

在收到使用者回饋（照片 1、2、3、4）並進行機構級全量審查後，發現五大核心問題：
1. **月曆版面擠壓**：`DividendCalendarCard` 一列硬塞 12 個月，卡片寬度僅 70px，字體 11px，金額被截斷為縮寫。
2. **視覺動線斷裂**：`DividendMonthlyChart`（占滿全寬）與「股息貢獻排行」被隔開，後者被違背 SRP 封裝在 `DividendHistoryTable` 內。
3. **長條圖幾何公式失真**：`DividendMonthlyChart` 生活費虛線與長條柱計算公式不同（`+26px` vs `+30px` 底座、`135` vs `130` 係數），且 Gross 模式用 Net 最大值當分母，導致 4 月 82,959 元（覆蓋率 141.4%）柱狀條看起來被 60,000 元虛線壓在下方。
4. **0056 發放日時差與推估真相**：0056 於 2026-10-22 除息，實際 2026-11-11 入帳。因常態庫缺漏 2026 Q4，且 `corporateActionScanner.ts` 漏未映射 FinMind 原生之 `CashDividendPaymentDate`，系統觸發 23 天推估算出 2026-11-14。
5. **深水區盲點**：高股息 ETF 配息未穿透 54C 造成二代健保虛驚；質押借貸利息未傳參致使利差現金流失真；填息判定把買進成本當除息價造成假填息。

---

## 決策內容 (Decision)

1. **月曆重構為 3 列（3 rows × 4 cols）**：
   - 採用 `repeat(4, 1fr)`，卡片寬度擴增至 ~250px，字體升級至 13px/16px，完整呈現 `NT$ XX,XXX`。
2. **SRP 解耦與 2/3 + 1/3 並列佈局**：
   - 將「股息貢獻排行」自 `DividendHistoryTable` 抽離為高內聚元件 `DividendTopContributorsCard.tsx`。
   - 在 `DividendLogView` 建立 `gridTemplateColumns: '2fr 1fr'` 網格列，高度錨定在約 290px 自然等高。
3. **幾何坐標統一與生活費持久化**：
   - 統一柱高與虛線比例尺為 `120px`，坐標基準面鎖定為 `30px`，保證覆蓋率 100% 時 0 像素誤差重合。
   - 分母動態切換毛淨額最大值，虛線置於背景層（`zIndex: 0`）。
   - 生活費目標持久化至 `localStorage`。
4. **常態庫補齊與 FinMind 欄位貫通**：
   - 補入 `0056:2026-10-22: 2026-11-11` 至 `OFFICIAL_TW_PAY_DATE_MAP`。
   - 在 `corporateActionScanner.ts` 提取 `CashDividendPaymentDate`。
5. **100% 複用既有模組與修復填息傳參**：
   - 修復 `DividendHistoryTable` 填息基準價傳參 Bug。
   - 傳入質押利息至 `DividendKpiSummary`，連動 `zavySlowWealthEngine` 動態活水轉向。

---

## 效益與權衡 (Consequences)

### 正面效益
- 解決照片 1、2、3、4 所有前端反饋與資料問題。
- 數值與圖形達到像素級數學一致性，杜絕視覺與數值矛盾。
- 零新增付費套件或造輪子，完全複用既有算力。

### 潛在權衡
- 組件層級由原本的 4 個子元件增加至 5 個（抽離出 `DividendTopContributorsCard.tsx`），但符合 SRP，大幅提升各組件單元測試縫隙與可維護性。

