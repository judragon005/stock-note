# Ticket 03: 完整時光機快照防呆與回滾引擎 (Time-Machine Snapshots Engine)

## 需求說明
- 定義 `SystemSnapshot` 介面（含 `id`, `name`, `reason`, `createdAt`, `isLocked`, `metricsSummary`, `payload`）。
- 實作快照管理函式：
  - `createSystemSnapshot(name, reason, payload)`：建立全量快照並計算統計指標。
  - `getSystemSnapshots()`：取得所有快照列表（依時間降冪）。
  - `restoreSystemSnapshot(snapshotId)`：自快照全量覆寫資料庫。
  - `deleteSystemSnapshot(snapshotId)`：刪除快照（受鎖定保護）。
  - `toggleLockSystemSnapshot(snapshotId)`：鎖定/解鎖快照。
- 實作自動快照保留策略：超過 10 份自動淘汰最舊之未鎖定自動快照。

**Status:** completed

- [x] 實作 `SystemSnapshot` 類型與資料結構。
- [x] 實作建立、查詢、還原、刪除與鎖定函式。
- [x] 實作 10 份快照自動輪替淘汰演算法。
- [x] 撰寫單元測試覆蓋建立、還原、超額淘汰與鎖定保護。
