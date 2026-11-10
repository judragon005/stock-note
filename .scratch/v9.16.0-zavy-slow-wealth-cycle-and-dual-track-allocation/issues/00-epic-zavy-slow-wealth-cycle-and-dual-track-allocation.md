# Epic: Zavy「散戶慢富之路」三級週期定位、台美市場寬度與 A/B 雙軌配置系統 (Spec 0221)

**State:** CLOSED  
**Spec:** [docs/specs/0221-zavy-slow-wealth-cycle-and-dual-track-allocation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0221-zavy-slow-wealth-cycle-and-dual-track-allocation-spec.md)  
**ADR:** [docs/adr/0221-zavy-slow-wealth-cycle-and-dual-track-allocation.md](file:///d:/APP/股票紀錄/docs/adr/0221-zavy-slow-wealth-cycle-and-dual-track-allocation.md)  
**Target Version:** v9.16.0  
**Issue:** #472  

## 核心目標
將 `D:\APP\諮詢\私人\慢富之路`（涵蓋 2022–2026/10 共 64 部逐字稿與 V1–V26 實證稽核證據鏈）之 Zavy 台美股分析框架轉化為本專案原生專屬頁面（`🐢 慢富週期與配置`），100% 複用既有模組與 SQLite 湖倉，拒絕過度工程化，並穿透個人真實 21 檔持倉、高股息 ETF 與質押借貸帳本。

## 子任務拆解清單
- [x] Ticket 01: SQLite 湖倉叢集索引多週期還原寬度與宏觀持久化修復
- [x] Ticket 02: 大類資產分類器與 `etf_daily_nav` 折溢價守門員
- [x] Ticket 03: 大類資產再平衡、股息活水轉向與質押降槓桿瀑布流
- [x] Ticket 04: 慢富 30 倍年支出、Coast-FIRE 與蒙地卡羅順序風險
- [x] Ticket 05: Zavy 三級總經週期羅盤引擎實作
- [x] Ticket 06: 週期情境耦合之寬度/布林診斷、融資去槓桿與空頭失效閘門
- [x] Ticket 07: 「見自己」A/B 雙軌決策引擎與 Markdown/CSV 報告導出
- [x] Ticket 08: 專屬頁面 UI、分段鏡頭與全域技能升級
