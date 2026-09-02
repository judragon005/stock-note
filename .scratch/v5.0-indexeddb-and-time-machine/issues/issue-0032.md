# Issue #32: 底層儲存遷移至 IndexedDB、ACID 事務與時光機快照體系

## 描述
解除 5MB localStorage 限制與同步主執行緒阻塞，建置原生 0 依賴 IndexedDB 儲存引擎、無損自動遷移演算法與完整時光機快照防呆回滾體系。

## 相關規格
- [docs/specs/0032-indexeddb-storage-and-time-machine-snapshots.md](../../../docs/specs/0032-indexeddb-storage-and-time-machine-snapshots.md)

## 子任務
- [x] 01-db-engine-core
- [x] 02-non-destructive-migration
- [x] 03-time-machine-snapshots-engine
- [x] 04-storage-adapter-and-async-lifecycle
- [x] 05-time-machine-ui-component
- [x] 06-adr-and-domain-docs-sync
