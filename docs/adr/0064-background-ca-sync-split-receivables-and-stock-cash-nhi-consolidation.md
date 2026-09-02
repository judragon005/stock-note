# ADR 0064: 除息公告背景自動同步、雙看板獨立垂直拆分、配股配息合併健保扣除與現金帳本 SSOT 連動

## 狀態 (Status)
**ACCEPTED (已採納與實作)** - 2026-09-01

## 決策背景 (Context)
1. **除息公告同步體驗**：原系統限制進入「股利日誌」分頁且快取為空時才發起同步，導致使用者在其他分頁無法即時獲取最新除息日曆。
2. **看板資訊混合**：原「Corporate Actions & Receivables」看板將「⚡ 除息待入帳（已除息）」與「📢 即將除息（尚未除息）」混合排版，語義不清晰。且當無項目時直接隱藏，造成版面跳動。
3. **配股配息健保計算失準 (如 2890 永豐金)**：台股同次除權息同時分派現金股利與股票股利時，股票股利面額（每股 NT$10）依法應併入單次給付申報所得計算 2.11% 二代健保，且該保費自現金股利代扣。原明細表漏計配股面額，導致 2890 永豐金（31,000 股、現金 34,100 元、配股 620 股）扣繳稅款顯示 719 元（實領 33,381 元）。
4. **現金帳本連動金額落差**：現金帳本自動連動生成股息流水時，若交易紀錄無 `tax` 欄位，直接記錄毛額 34,100 元，未與二代健保實收 33,250 元對齊。

## 架構決策 (Decisions)
1. **背景靜默自動預載同步**：
   - 在 [`src/App.tsx`](file:///d:/APP/股票紀錄/src/App.tsx) 初始化時，當持股與交易資料就緒，即自動於背景發起 `handleSyncCorporateActions(false)`，利用 24H 快取與 150ms 節流保護外部 API，同時保留手動強制同步按鈕。
2. **雙看板垂直拆分與版面占位**：
   - 在 [`src/components/DividendLogView.tsx`](file:///d:/APP/股票紀錄/src/components/DividendLogView.tsx) 中將看板垂直拆分為兩組獨立 Glass Card：
     - ⚡ **除息待入帳行事曆** (`status !== 'UPCOMING_EX'`)
     - 📢 **即將除息公告看板** (`status === 'UPCOMING_EX'`)
   - 當任一看板無項目時，皆呈現專屬半透明空狀態占位提示卡片，確保版面結構穩定不塌縮。
3. **全域單一事實來源 (`resolveEffectiveDividendTaxAndNet`)**：
   - 在 [`src/engine/taxComplianceEngine.ts`](file:///d:/APP/股票紀錄/src/engine/taxComplianceEngine.ts) 中建立統一解析函式，支援優先級覆蓋（手動 `tax` / `cashAmount` $\to$ 美股 30% $\to$ 台股配股合併健保扣繳）。
   - 貫穿 [`src/components/DividendLogView.tsx`](file:///d:/APP/股票紀錄/src/components/DividendLogView.tsx)、[`src/engine/cashLedgerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts) 與 [`src/engine/dividendAggregator.ts`](file:///d:/APP/股票紀錄/src/engine/dividendAggregator.ts)。

## 驗證結果 (Consequences & Verification)
- **2890 永豐金真實案例驗證**：31,000 股，現金 34,100 元，配股 620 股（面額 6,200 元），申報所得 40,300 元，二代健保 850 元。
  - 股利明細扣繳稅款顯示 `-NT$ 850`，實領顯示 `33,250 TWD`。
  - 現金帳本自動連動流水金額精準寫入 `+NT$ 33,250`。
- **全量測試與建置**：`npm test` 38 個測試檔案、430 個測試 100% 綠燈，`npm run build` 0 錯誤。
