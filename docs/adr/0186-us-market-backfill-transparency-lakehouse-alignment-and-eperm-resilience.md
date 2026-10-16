# ADR 0186：美股歷史回補透明度透視、斷點庫存對齊與 Windows EPERM 韌性強化架構決策 (ADR 0186)

## 狀態
已批准 (Approved) / 待實作 (Pending Implementation)

## 關聯規格
- [Spec 0186](file:///d:/APP/股票紀錄/docs/specs/0186-us-market-backfill-transparency-lakehouse-alignment-and-eperm-resilience-spec.md)
- [Spec 0168](file:///d:/APP/股票紀錄/docs/specs/0168-zero-csv-dual-market-backfill-and-unified-api-key-console-spec.md)
- [ADR 0185](file:///d:/APP/股票紀錄/docs/adr/0185-etf-cache-verification-and-transparency.md)

---

## 背景與問題陳述 (Context)

在執行台美雙軌歷史全回補時，面板卡片呈現：
- **台股日 K 筆數**：`137,559 筆`
- **三大法人籌碼**：`132,917 筆`
- **美股採集標的**：`0 檔`

這導致使用者對美股回補是否成功產生疑慮。
經第一性原理調研確認：
1. **語意盲區**：美股回補統計僅記錄「當次執行新增成功的檔數」，當今日稍早已完成 1,448 檔同步並存於 SQLite 湖倉時，斷點續傳判定全部略過，當次增量為 0，導致面板顯示 `0 檔`。
2. **Windows 檔案鎖定**：`saveJsonAtomic` 使用 `fs.renameSync` 時，容易遭遇 Windows 檔案讀取中鎖定拋出 `EPERM` 錯誤，進而中斷管線資料回傳。

---

## 決策內容 (Decisions)

1. **斷點續傳與在庫標的數透視 (Lakehouse & Checkpoint Alignment)**：
   - 透過 `sync_checkpoints` 查詢美股已成功同步之在庫標的數（`< 5ms`），將 `totalInLakehouse` 注入回補狀態物件。
   - 前端面板美股卡片調整為展示「在庫總有效標的數（如 `1,448 檔`）」，並附帶當次增量註記與「⚡ 快取/斷點在庫」徽章。
2. **Windows EPERM 退避重試與安全覆寫 (Atomic Write Resilience)**：
   - 在 `saveJsonAtomic` 增加 5 次指數/自旋退避重試。
   - 若重命名持續失敗，安全回退為 `copyFileSync` + `unlinkSync` 或直接覆寫，杜絕崩潰。

---

## 後果評估 (Consequences)

### 正向效益 (Positive)
- 徹底消除使用者對於美股歷史回補為 0 的誤解，台美雙軌統計語意完全對齊。
- 根絕 Windows 系統環境下暫存檔 rename 拋出 `EPERM` 警告之問題。
- 查詢僅耗時 4ms，無任何效能負擔。

### 潛在風險與防禦 (Risks & Mitigations)
- 確保在全新乾淨資料庫或未曾同步的情況下，`totalInLakehouse` 為 0 能正確顯示回退邏輯。
