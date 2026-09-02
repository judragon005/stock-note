# 技術債 #0034: 匯入解析防護、原型污染防禦與數值邊界熔斷

- **狀態**：`OPEN`
- **優先級**：`P2`
- **發現來源**：資安架構深度審查
- **建立日期**：2026-09-02
- **標籤**：`Security` · `PrototypePollution` · `Validation` · `Sanitization` · `Schema`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前專案支援多種資料匯入管道：
1. JSON 備份檔全庫還原 (`importDatabaseBackupFromJSON` in `src/utils/storage.ts`)。
2. 增強型 CSV/JSON 逐行映射匯入器 (`src/components/EnhancedImportModal.tsx`)。

在還原與解析過程中，直接使用 `JSON.parse` 並透過 `Object.assign` 或解構賦值進行狀態合併。

---

## 2. 問題分析與潛在風險 (Problem & Risk Analysis)

1. **原型污染攻擊 (Prototype Pollution)**：
   - 若使用者載入攻擊者精心構造的惡意 JSON 備份檔，物件屬性中含有 `__proto__`、`constructor`、`prototype`（如 `{"__proto__": {"polluted": true}}`），直接遞迴合併可能篡改全域 `Object.prototype`，導致邏輯旁路 (Bypass)、型別判斷失效或安全漏洞。
2. **數值邊界異常與記憶體耗盡 (DoS / NaN Injection)**：
   - 匯入異常數值如 `NaN`、`Infinity`、負數股數、負數手續費、或長達 10 萬字元的惡意 Note 字串時，若無前置攔截，會污染整個會計計算引擎（如 XIRR 陷入死迴圈、損益計算顯示 NaN、IndexedDB 儲存空間被記憶體炸彈撐爆）。
3. **無效外鍵與關聯破壞 (Orphaned Relations)**：
   - 交易紀錄關聯至不存在的 `accountId` 或非法幣別代碼（非 `TWD` 或 `USD`），造成圖表渲染崩潰。

---

## 3. 建議防護方案 (Proposed Security Shield)

### A. 原型污染安全反序列化器 (Safe JSON & Object Cloner)
過濾所有保留的原型關鍵字：

```typescript
export function safeSanitizeObject<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(safeSanitizeObject) as unknown as T;

  const cleanObj: any = Object.create(null);
  for (const [key, value] of Object.entries(obj)) {
    // 嚴格攔截原型污染金鑰
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    cleanObj[key] = safeSanitizeObject(value);
  }
  return cleanObj as T;
}
```

### B. 嚴格欄位邊界與長度熔斷 (Schema & Boundary Guard)
在每一筆匯入記錄落地前執行硬性邊界檢查：
- `symbol`: 必須為 1~12 字元之英數字與特定符號 (`.`, `-`)。
- `shares`: 必須為有限正數 (`Number.isFinite(s) && s > 0`)。
- `price`: 必須為有限非負數 (`Number.isFinite(p) && p >= 0`)。
- `note`: 字串長度強制截斷至 2,000 字元以內。
- `tags`: 單筆交易標籤最多 20 個，每個標籤最多 50 字元。

---

## 4. 驗收標準 (Acceptance Criteria)

- [ ] 匯入含有 `{"__proto__": {"isAdmin": true}}` 之 JSON 備份檔時，全域 `Object.prototype.isAdmin` 保持 `undefined`，成功阻斷原型污染。
- [ ] 匯入包含 `shares: Infinity`、`shares: -500` 或極長垃圾字串的無效列時，匯入解析器正確標記為驗證失敗並安全略過，不影響其餘正常記錄匯入。
- [ ] 單元測試包含針對各種異常邊界輸入、原型污染攻擊向量與格式畸形檔案的驗證覆蓋。

---

## 5. 觸發處理時機 (Trigger Conditions)

- 升級多券商匯入衝突消解器 (Debt #0028) 或重構儲存快照校驗時。
