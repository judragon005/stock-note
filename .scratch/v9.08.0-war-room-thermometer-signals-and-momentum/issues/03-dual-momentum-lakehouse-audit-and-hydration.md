# 03 — 雙重動能本機湖倉真實日 K 審計標章與冷啟動降級 (Dual Momentum Lakehouse Data Audit & Graceful Hydration)

**What to build:**
升級 `WarRoomWorkspace.tsx` 與 `dualMomentumEngine.ts`：在卡片標題列加入「🟢 SQLite 湖倉真實日 K 驅動 · 基準日」審計標章，杜絕黑箱假資料疑慮；當本地 SQLite 缺少美股日 K（冷啟動）或日 K 不足 5 根時，UI 顯示「⏳ 水合中」骨架屏或狀態標籤，徹底根除 `-999.0%` 與幽靈數據破圖。

**Blocked by:** None — can start immediately

**Status:** closed

- [x] 在雙重動能卡片 Header 標示「🟢 SQLite 湖倉真實日 K 驅動 · 基準日: YYYY-MM-DD」
- [x] 當標的日 K 不足 5 根時，數值欄位渲染「⏳ 水合中」或骨架屏，杜絕 `-999.0%` 破圖
- [x] 補足單元測試，驗證冷啟動優雅降級與審計標籤渲染
