# Ticket #01: 歷史交易帳本欄位寬度重構與單行防折行防禦 (Table Column Widths & Zero-Wrap)

## 🎯 目標 (Objective)
解決交易日期、類別徽章、表頭以及數值金額非預期折行問題，重新分配欄位寬度權重。

## 📋 任務清單 (Tasks)
- [x] 交易日期欄位：設定 `width: 105px`, `minWidth: 105px`, `whiteSpace: 'nowrap'`，確保 `YYYY-MM-DD` 100% 單行。
- [x] 類別欄位：設定 `width: 85px`, `minWidth: 85px`, `whiteSpace: 'nowrap'`，確保徽章（`現金股利`、`特別股贖回` 等）單行不擠壓。
- [x] 標的代碼/名稱欄位：設定 `minWidth: 140px`，釋放空間容納完整中文名稱。
- [x] 異動/成交股數、單價/比例、手續費、稅費、結算金額欄位：緊湊右對齊，設定 `whiteSpace: 'nowrap'` 與最適寬度。
- [x] 策略標籤/備註欄位：設定 `minWidth: 160px` 彈性伸展，支援橫向標籤列與多行備註。
- [x] 表頭文字全面設定 `whiteSpace: 'nowrap'`，杜絕「手續/費」折行。
- [x] 優化表頭與單元格 Padding 間距為 `8px 8px` / `8px 10px`。

## 🛡️ 驗收標準 (Acceptance Criteria)
- [x] 任何解析度下，日期、類別與表頭 0 折行。
- [x] 數值與金額排版緊湊工整。
