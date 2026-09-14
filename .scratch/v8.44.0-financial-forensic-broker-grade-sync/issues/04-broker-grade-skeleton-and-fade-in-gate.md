# 04 — Broker-Grade Skeleton & Delayed Fade-In Display Gate

**What to build:**
升級 `FinancialForensicModal.tsx` 視覺載入體驗。在資料從遠端同步或自癒檢驗期間，維持版面結構固定的「深色毛玻璃骨架屏 (Skeleton Placeholder)」，不渲染任何未完成數值；待三大報表 100% 聚合驗證完成後，以 0.2 秒平滑淡入 (Fade-In) 點亮呈現，達成券商級沈浸體驗。

**Blocked by:** 03-complete-audited-quarter-sentry.md

**Status:** done

- [x] 實作四大卡片與圖表區塊之深色毛玻璃骨架屏
- [x] 資料未完備前嚴禁渲染半殘過渡畫面
- [x] 資料完備後平滑淡入切換
- [x] 支援手動強制重新整理時之平滑過渡
