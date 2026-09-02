# Issue #33: XIRR 不定期現金流年化報酬率引擎與多維度績效分析體系

## 描述
解決傳統累積報酬率與簡化 CAGR 無法客觀衡量定期定額、加碼、股息再投資與不定期出入金之真實資金加權年化複利（MWRR）的盲點，建置專業混合數值求解引擎（Newton-Raphson + Bisection）、30 天智能自適應平滑防護、三層級（整戶、個股、時間區間）XIRR 績效計算與現金流透視診斷彈窗。

## 相關規格
- [docs/specs/0033-xirr-performance-engine.md](../../../docs/specs/0033-xirr-performance-engine.md)

## 分流標籤 (Triage Label)
- `ready-for-agent` (規格完備，已完成調研與邊界對齊，可直接由 Agent 獨立執行)

## 優先級與估計 (Priority & Estimate)
- **優先級**：`P1` (源自技術債 #0018)
- **複雜度**：中高 (涉及非線性數值演算法、三層級現金流聚合與多處 UI 整合)
- **測試策略**：TDD 100% 覆蓋 (紅-綠-重構)

## 子任務
- [x] 01-xirr-hybrid-solver-engine
- [x] 02-multi-level-cashflow-aggregation
- [x] 03-holdings-and-chart-xirr-integration
- [x] 04-xirr-diagnostic-modal-component
- [x] 05-adr-and-domain-docs-sync

