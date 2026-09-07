# ADR 0070: 歷史交易帳本欄位佈局權重優化與輕量級分頁架構決策 (Trade History Table Layout & Pagination Architecture)

## 狀態 (Status)
**ACCEPTED (已通過)**

## 背景 (Context)
在歷史交易帳本中，由於原生 HTML Table 在不同螢幕寬度下自動均分欄位寬度，導致固定字數之日期（如 `2026-10-01`）、短徽章（如 `現金股利`）以及精簡表頭（如 `手續費`）遭遇非預期的水平擠壓而折行。同時，數值欄位過寬、標的名稱與策略備註欄位空間不足，且缺乏分頁控制，影響使用者瀏覽體驗。

## 決策 (Decision)
1. **零折行防護 (`Zero-Wrap Protection`)**：
   - 關鍵時間軸與徽章欄位全面宣告 `whiteSpace: 'nowrap'`，並指派專屬標準寬度。
2. **語義與數值欄位權重重構**：
   - 緊湊化右對齊數值欄位（股數、單價、手續費、稅費、金額）。
   - 釋放剩餘寬度給標的名稱與策略備註，支援長備註與多標籤橫向展開。
3. **純前端非侵入式分頁架構 (`Client-Side Non-Intrusive Pagination`)**：
   - 在 `TradeHistoryTable.tsx` 內部封裝 `currentPage` 與 `pageSize` 狀態。
   - 依據 `filteredTrades` 進行切片 (`slice((page-1)*size, page*size)`)，保留全量導出與全域統計能力。

## 後果與影響 (Consequences)
- **正面效益**：徹底消除折行雜亂感，顯著改善視覺工整度與大資料量滾動流暢度。
- **維護性**：純前端元件層重構，不更動底層資料模型，零破壞風險。
