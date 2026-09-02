# 技術債 #0005: 增強型 CSV 欄位對齊映射與逐行預覽匯入器 (Enhanced CSV Importer)

- **狀態**：`RESOLVED` (已於 v6.9.6 ADR #0063 完成)
- **優先級**：`P3`
- **發現來源**：PROMPT 對齊與需求分析 (Gap Analysis)
- **建立日期**：2026-08-25
- **解決日期**：2026-09-01
- **標籤**：`UX` · `Feature` · `Import`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統具備基礎的 JSON 與 CSV 匯出與匯入功能（`ImportModal.tsx`），可透過標準欄位格式匯入歷史交易。然而若使用者直接由台灣券商（如國泰、富邦、永豐）或海外券商（如 Firstrade、Schwab、Interactive Brokers）匯出 CSV，由於各家券商的 CSV 表頭欄位名稱與日期格式不一，目前無法直接自動識別或由使用者手動對齊映射。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

* **問題分析**：手動整理成系統預設 CSV 欄位耗時費力，缺乏可視化的欄位映射精靈與匯入前逐行錯誤校驗（Row-level validation preview）。
* **暫緩理由**：目前系統已有完整的手動記帳與公司行動自動補登功能，券商 CSV 匯入為輔助工具，先收錄技術債待命。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

1. **三步驟匯入嚮導精靈 (3-Step Import Wizard)**：
   - Step 1: 選擇/拖曳 CSV 檔案，自動偵測編碼 (UTF-8 / Big5) 與分隔符。
   - Step 2: 欄位映射選擇器（將來源檔案欄位對應至系統之 日期/代碼/類別/股數/價格/手續費/稅款 等）。內建常用券商範本庫（如：國泰證券、永豐大戶投、Firstrade 等一鍵套用）。
   - Step 3: 資料預覽與逐行校驗（標註錯誤列與修復建議），確認無誤後一鍵 Commit 入庫。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 使用者主動指示啟動「增強型 CSV 匯入精靈」。
2. 使用者有自第三方券商大量匯入歷史交易之需求。
