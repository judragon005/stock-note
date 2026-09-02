# 技術債 #0032: CSV 公式注入防禦 (DDE Protection) 與備份匯出脫敏機制

- **狀態**：`OPEN`
- **優先級**：`P2`
- **發現來源**：資安架構深度審查
- **建立日期**：2026-09-02
- **標籤**：`Security` · `CSV` · `Injection` · `Export` · `Sanitization`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前專案在 `src/utils/storage.ts` 提供了交易明細 CSV 匯出功能 `exportTradesToCSV`，以及全庫 JSON 備份功能 `exportDatabaseBackupToJSON`。

現行 CSV 匯出邏輯如下：

```typescript
// src/utils/storage.ts
const rows = trades.map((t) => [
  t.date,
  t.symbol,
  t.name,
  // ...
  `"${(t.tags || []).join(';')}"`,
  `"${(t.note || '').replace(/"/g, '""')}"`,
]);
```

---

## 2. 問題分析與潛在風險 (Problem & Risk Analysis)

1. **CSV 公式注入 (CSV Formula Injection / DDE 漏洞)**：
   - 當使用者手動輸入或從外部 CSV 匯入惡意字串至「備註 (Note)」、「標籤 (Tags)」或「股票名稱 (Name)」時（例如 `=cmd|'/C calc'!A0` 或 `-2+3+cmd|' /C powershell ...'` 或 `@SUM(...)`），若匯出為 CSV，Excel / LibreOffice 等試算表軟體會將以 `=`, `+`, `-`, `@`, `\t`, `\r` 開頭的儲存格當作公式執行。
   - 這可能導致攻擊者藉由分享看似正常的「投資記錄 CSV」給其他使用者，受害者下載並用 Excel 打開時遭受遠端代碼執行 (RCE) 或憑證外洩攻擊。
2. **完整備份檔未脫敏洩漏 API Key 與財務隱私**：
   - 匯出完整 JSON 備份時，若無意間將包含真實 API Token、券商帳號甚至貸款人機敏資訊打包匯出，使用者分享檔案進行問題排查時容易造成憑證外流。

---

## 3. 建議重構方案 (Proposed Security Solution)

### A. CSV 儲存格消毒過濾器 (CSV Sanitizer)
實作嚴格的 CSV 數值轉義器：凡是字串型別欄位，若開頭包含危險字元，自動前置單引號 `'` 進行純文字鎖定：

```typescript
const DANGEROUS_CSV_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  
  // 若開頭為危險公式符號，加單引號進行字串化轉義，阻斷 DDE 執行
  if (DANGEROUS_CSV_PREFIXES.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`;
  }
  
  // 雙引號標準 CSV 逸出
  return `"${str.replace(/"/g, '""')}"`;
}
```

### B. 備份匯出脫敏開關 (Data Redaction Options)
在匯出備份對話框中加入脫敏選項：
- 預設勾選「安全脫敏匯出（自動剔除 API 金鑰與敏感 Token）」。
- 敏感設定欄位替換為空物件 `{}`，避免使用者誤將金鑰連同交易紀錄外流。

---

## 4. 驗收標準 (Acceptance Criteria)

- [ ] 匯出包含 `=cmd|' /C calc'!A0` 或 `@SUM` 開頭備註的交易記錄為 CSV 時，輸出內容自動轉化為 `"'=cmd|' /C calc'!A0"`，使用 Excel 開啟時僅顯示為純文字，絕不觸發公式計算。
- [ ] 匯出 JSON 備份時提供清晰的「排除 API 金鑰」選項，預設啟用。
- [ ] 單元測試以 Vitest 覆蓋所有危險字元開頭 (`=`, `+`, `-`, `@`, `\t`, `\r`) 的 Sanitizer 轉義驗證。

---

## 5. 觸發處理時機 (Trigger Conditions)

- 優化匯入匯出模組 (Debt #0028) 或升級報表匯出功能時。
