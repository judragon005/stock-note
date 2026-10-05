# 12-receivable-dividend-future-projection-engine

## Description
升級前端 `receivableDividendEngine.ts`，結合 `corporate_action_calendar` 預告日曆與使用者的真實持倉份額（Holdings），在除息日前自動計算「未來預估應收股利」，並在除息當日自動處理參考價下修防護，避免誤判暴跌。

## Target Files
- `src/engine/receivableDividendEngine.ts`
- `src/engine/receivableDividendEngine.test.ts`

## Acceptance Criteria
- [x] 擴充 `computeReceivableDividends`：主動查詢使用者當前持倉標的是否存在未來 30 天內的除息預告記錄。
- [x] 依據持有股數計算「預估現金股利總額」與「預估發放日（Payment Date）」，產生前瞻待收條目。
- [x] 在除息當日，於戰情室提供「除息參考價」標記，防止技術指標引擎將除息跳空誤判為大跌異常。
- [x] 編寫測試驗證持有 10 張 0050、配息 2.5 元時，前瞻應收股利為 25,000 元之推算無誤。

## Status
- [x] done
