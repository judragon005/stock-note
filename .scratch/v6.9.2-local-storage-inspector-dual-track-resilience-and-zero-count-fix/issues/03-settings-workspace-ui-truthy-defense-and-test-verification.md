# Issue 03: SettingsWorkspace 數值取值顯式防禦與雙軌單元測試覆蓋

- **狀態**：`CLOSED`
- **關聯規格**：[PRD 0059 §2.2, §3](file:///d:/APP/股票紀錄/docs/specs/0059-local-storage-inspector-dual-track-resilience-and-zero-count-fix-spec.md)
- **影響範圍**：`src/components/SettingsWorkspace.tsx`, `src/utils/db.test.ts`

---

## 1. 任務背景與問題 (Problem Statement)
- `SettingsWorkspace.tsx` 中的數值渲染使用了空值合併運算子 `??`，當統計值為 `0` 時產出非 Nullish 的字串 `"0"`，導致傳入之 Props 真實長度永遠無法生效兜底。
- 上方時光機快照卡片與下方歷史還原點列表數據源脫鉤，出現「卡片寫 0 份、列表列出 2 筆」之矛盾。

---

## 2. 實作變更 (Implementation Changes)
- 修正 `SettingsWorkspace.tsx` 核心資產數據卡片取值邏輯為 `(stats?.coreAssets ? (stats.coreAssets.totalTrades || trades.length) : trades.length)`。
- 修正時光機快照卡片取值邏輯為 `stats?.systemConfig ? (stats.systemConfig.totalSnapshots || snapshots.length) : snapshots.length`。
- 在 `db.test.ts` 中新增「IndexedDB 為空但 LocalStorage 有資料時自動回退讀取正確筆數」之單元測試。

---

## 3. 驗收標準 (Acceptance Criteria)
- [x] UI 核心資產數據卡片正確顯示當前傳入之 602 筆交易、2 個帳戶、611 筆現金流水。
- [x] 時光機快照卡片與下方還原點列表數量 100% 一致。
- [x] 全量單元測試 382 項通過，TypeScript 建置 0 錯誤。
