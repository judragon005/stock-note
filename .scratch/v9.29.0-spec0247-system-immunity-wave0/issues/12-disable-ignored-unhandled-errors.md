# 12 — 關閉測試執行器未處理例外靜默吞噬並清零隱藏非同步拒絕

**Parent:** #609 (Spec 0247)

**What to build:** 停用測試執行器 `dangerouslyIgnoreUnhandledErrors`，逐一排查並修復因此暴露的隱藏非同步未捕獲拒絕。

**Blocked by:** 11

**Status:** done

- [x] 測試設定檔移除 `dangerouslyIgnoreUnhandledErrors: true`
- [x] 全量前端測試 100% 綠燈且 0 未處理非同步拒絕
