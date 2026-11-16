# 06 — 實作跨午夜自愈更新、60d/90d 視窗切換與響應式流動佈局

**What to build:** 支援一鍵切換「近 60 天（確定公告）」與「近 90 天（含週期推估）」；串接 useTaipeiDateStr，當使用者跨過午夜 00:00 或視窗重回焦點時，倒數天數（daysUntilEx）與事件自愈刷新；在手機與平板小螢幕下自適應調整為緊湊雙行卡片佈局，避免欄位被截斷破版。

**Blocked by:** 05 — 開發獨立 ExDividendRadarCard 緊湊時序清單卡片元件 (#570)

**Status:** ready-for-agent
**GitHub Issue:** #571

- [ ] 支援 60d / 90d 視窗範圍一鍵切換與動態篩選
- [ ] 串接 useTaipeiDateStr 實現跨午夜倒數天數自愈（T-1 自動變 T-0）
- [ ] 完成手機與平板響應式排版支援
- [ ] 撰寫單元測試覆蓋視窗切換與跨日自愈狀態
