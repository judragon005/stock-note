# Ticket 03: 台股配股配息合併健保扣繳計算、歷史明細與現金帳本 SSOT 連動 (Consolidated Stock & Cash Dividend NHI Tax & Cash Ledger SSOT)

## 任務描述
依據台灣二代健保法規，同次除權息同時發放「現金股利」與「股票股利」時，股票股利面額（每股 NT$10）依法併入所得計算 2.11% 二代健保補充保費，且全額由現金股利代扣。在歷史明細表、待入帳計算、報表統計與現金帳本自動連動流水中全面落實此單一事實來源 (SSOT) 計算邏輯。

## 涉及檔案
- `src/components/DividendLogView.tsx`
- `src/engine/taxComplianceEngine.ts`
- `src/engine/cashLedgerEngine.ts`
- `src/engine/dividendAggregator.ts`
- `src/engine/receivableDividendEngine.ts`
- `src/engine/corporateActionScanner.ts`

## 驗收標準 (Acceptance Criteria)
1. 封裝全域單一事實來源 `resolveEffectiveDividendTaxAndNet`，支援台股配股合併健保、美股 30% 預扣稅與手動 `tax`/`cashAmount` 優先級。
2. 歷史現金股利明細表中，當 `t.tax === 0` 或未填時，自動關聯同標的、同除權息期別之配股股數（先自交易紀錄比對，若無則自除權息行事曆比對），計算合併健保。
3. 基準實例：2890 永豐金（持股 31,000 股、現金 34,100 元、配股 620 股面額 6,200 元）：
   - 申報所得總額：40,300 元
   - 二代健保扣繳：850 元（明細表「扣繳稅款/健保」欄位顯示 `-NT$ 850`）
   - 實領淨額：33,250 元（明細表「實領淨額」顯示 `33,250 TWD`，折合台幣顯示 `NT$ 33,250`）
   - 現金帳本自動連動入帳流水金額精準記錄為 `+NT$ 33,250`（非毛額 34,100 元）
4. 待入帳應收股利計算引擎若遇到同標的同日有配股，亦正確將股票股利面額併入二代健保預估扣繳計算。
5. 手動填寫或由券商匯入之 `t.tax > 0` 或 `t.cashAmount > 0` 維持第一優先權。
