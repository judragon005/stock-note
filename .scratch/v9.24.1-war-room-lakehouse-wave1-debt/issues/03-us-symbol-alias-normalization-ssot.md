# 03 — 美股點號／連字號代碼別名正規化 SSOT 收斂

**What to build:** 於市場同步共用核心集中實作美股點號與連字號代碼正規化及候選別名產生純函式，統一替換市場同步中介層、Yahoo 基本面攝取與 SEC EDGAR 代理三處重複實作。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 共用核心匯出美股代碼正規化與別名產生純函式（支援 `BRK.B` / `BRK-B`、大小寫與空白清洗）
- [ ] 中介層、美股基本面攝取與 SEC EDGAR 代理全面改用共用函式
- [ ] 新增單元測試鎖定點號、連字號與邊界輸入之解析一致性
