# 03 — 08 法人行為計量圖表防碰撞重構 (Card 08 Anti-Overlap)

**What to build:**
修改 `InstitutionalFlowCard.tsx`，建立左右雙分欄獨立邊界：
- 左側三大法人買賣超柱狀圖給予安全繪圖寬度。
- 右側 3 日進出明細表格獨立靠右對齊，並加入縱向防碰撞邊界，徹底解決文字覆蓋在長條圖上的問題。

**Blocked by:** None — can start immediately

**Status:** completed

- [x] 柱狀圖與 3 日進出明細表格左右獨立分流，互不覆蓋
- [x] 柱狀圖在不同容器寬度下自適應調整 scale
- [x] 相關單元測試 `InstitutionalFlowCard.test.ts` 100% 綠燈
