# 02 — Card 20 ETF 配息區塊貼頂緊湊化與上下死區回收

**Parent:** #603 (Spec 0244)

**What to build:** 將 Card 20「ETF 資產規模與收益分配」中段歷年配息區塊由垂直置中改為貼頂展開，並收斂 KPI 列與底部基準列之間距，消除上下無效空白，同時維持個股月營收、美股季營收與 ETF 空狀態零回歸。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] ETF 自適應視圖配息外層容器採貼頂對齊，消除 KPI 下方與頁尾上方之多餘留白
- [ ] 個股月營收、美股季度營收與 ETF 空狀態分支行為維持 100% 不變
- [ ] 既有 Card 20 測試縫隙驗證貼頂緊湊佈局與零回歸
