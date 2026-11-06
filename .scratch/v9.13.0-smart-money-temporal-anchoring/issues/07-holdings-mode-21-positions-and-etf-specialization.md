# 07 — 在庫持倉模式 21 檔持倉與 ETF 全量展示特化

**Parent:** #433 (Spec 0218)
**GitHub Issue:** #440 (CLOSED)

**What to build:**
1. 在庫持倉模式 100% 保留使用者所有 21 檔持倉部位（含 10 檔台股 ETF 與美股 VT）。
2. `isEtfSymbol` 擴充支援主動式、新制 6 碼與美股核心 ETF。
3. 美股明細表自適應呈現 CMF 資金流與成交規模，消除「+0張」。

**Acceptance Criteria:**
- [x] 持倉模式不隱藏 ETF。
- [x] 美股無「+0張」破圖。
- [x] 單元測試 100% 通過。
