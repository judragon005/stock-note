# 05 — Apple 風格分段視圖控制器與觀望池折疊收納

**What to build:**
1. 頂部保留 `ActionDirectivesHUD` 常駐，其下方導入 Apple 風格分段控制器 (Segmented Tabs)：
   `[ 🚦 操盤導航 ]` ⇄ `[ ⚡ 動能看板 ]` ⇄ `[ 📈 扣抵望遠鏡 ]`
2. 三重視圖按需渲染，徹底消滅同一標的在同一頁面重複出現 4 次的視覺過載。
3. 在 `TrafficLightMatrix` 中的「🟡 觀望不碰」卡片池加入折疊展開收納器，預設僅展示前 12 檔精華，避免 1,800 張卡片塞爆 DOM，總 DOM 節點從 130,000 降至 3,000 以下。

**Blocked by:** 04 — 零幻覺數據水合、IndexedDB 分塊查詢與增量掃描快取

**Status:** ready-for-agent

- [x] `MuscleBookerWorkspace.tsx` 實作 `viewLens` 分段視圖切換
- [x] 操盤導航、動能看板、扣抵望遠鏡按需條件渲染
- [x] 「觀望不碰」池預設折疊收納與展開按鈕
- [x] 測試驗證分段切換與 DOM 渲染正確性
