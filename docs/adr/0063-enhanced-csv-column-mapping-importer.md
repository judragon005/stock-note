# ADR 0063: 增強型 CSV 欄位對齊映射與逐行預覽匯入器 (Enhanced CSV Importer)

- **狀態**：`ACCEPTED`
- **日期**：2026-09-01
- **對應技術債**：[技術債 #0005 (docs/debts/0005-enhanced-csv-column-mapping-importer.md)](../debts/0005-enhanced-csv-column-mapping-importer.md)
- **對應規格書**：[PRD #0063 (docs/specs/0063-enhanced-csv-column-mapping-importer-spec.md)](../specs/0063-enhanced-csv-column-mapping-importer-spec.md)

---

## 1. 背景與問題陳述 (Context & Problem Statement)

目前系統僅支援靜態固定欄位表頭的簡易 CSV 匯入，無法適配國泰、富邦、永豐、元大、Firstrade、Schwab、IB 等主流券商匯出之不同表頭結構、日期格式（民國年、美式日期）、貨幣符號、千分位與負數會計括號。此外，缺乏匯入前的逐行預覽校驗與重複交易指紋過濾，使用者容易遭遇解析失敗或部位重複計算的問題。

---

## 2. 決策內容 (Decision Drivers & Architecture)

1. **三步驟視覺化精靈架構 (3-Step Wizard Modal)**：
   - **Step 1 (Upload & Detect)**：拖曳上傳、Big5/UTF-8 切換、Header 指紋自動匹配券商。
   - **Step 2 (Mapping & Accounts)**：來源與目標欄位自訂映射、帳戶指定、支援自訂範本儲存至 LocalStorage。
   - **Step 3 (Preview & Deduplicate)**：逐行資料校驗、彩色狀態標籤 (New / Duplicate / Error)、支援智慧追加去重、全量快照覆蓋與強制全數追加。
2. **金融級清洗引擎 (`csvSanitizer.ts`)**：
   - 負責民國年/美式日期正規化、千分位與貨幣符號清洗、交易動作語意推斷、股票字典代碼名稱自動補全。
3. **交易指紋智慧去重模型 (`tradeDeduplicator.ts`)**：
   - 以 `date_market_symbol_type_shares_price` 生成特徵指紋，防範重複匯入。
4. **時光機快照保護機制**：
   - 執行全量覆蓋時自動調用 `createSystemSnapshot`，確保使用者資料安全可逆。

---

## 3. 預期成效 (Consequences)

- **正面效益**：大幅降低台灣與海外券商對帳單匯入門檻，自動過濾重複交易，提升系統容錯度與易用性。
- **維護性**：清洗、範本、去重與 UI 職責清晰分離，具備高擴展性。
