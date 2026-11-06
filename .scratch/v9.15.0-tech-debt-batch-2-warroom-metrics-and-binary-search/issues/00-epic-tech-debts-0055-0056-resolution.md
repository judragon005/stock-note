# #466 — Spec 0220: 技術債 0055 與 0056 架構重構與算法優化 (WarRoom 狀態抽取與估值河流二元搜尋)

**State:** OPEN
**Version:** v9.15.0
**Spec:** docs/specs/0220-technical-debts-0055-0056-resolution-spec.md
**ADR:** docs/adr/0220-technical-debts-0055-0056-resolution.md

## 概述
清理第二梯隊高投資報酬率之架構技術債：
1. **技術債 0056**：估值河流圖歷史收盤價匹配二元搜尋優化（消除陣列複製與 $O(M \times N)$ 線性瓶頸）。
2. **技術債 0055**：`WarRoomWorkspace.tsx` 龐大單體元件狀態抽取自訂 Hook `useWarRoomPortfolioMetrics`（消除發散式變化異味）。

## 子任務 (Sub-Tickets)
- [ ] Ticket 01: 實作二元搜尋純函式 `findLatestCloseBeforeDate` 與專屬單元測試 (TDD)
- [ ] Ticket 02: `AnalysisMetricView.tsx` 估值河流圖歷史收盤價改以二元搜尋並搭配 `useMemo`
- [ ] Ticket 03: 實作自訂 Hook `useWarRoomPortfolioMetrics` 與無 DOM 單元測試 (TDD)
- [ ] Ticket 04: `WarRoomWorkspace.tsx` 串接 Hook 並精簡 110+ 行計算程式碼
- [ ] Ticket 05: 全量測試與建置回歸驗證，並更新 `docs/debts/README.md`
