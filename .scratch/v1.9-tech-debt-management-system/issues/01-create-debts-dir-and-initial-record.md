# Ticket #1: [Docs/Arch] 建立 docs/debts/ 目錄、README.md 索引看板與首筆技術債文檔

- **狀態**: Completed
- **GitHub Issue**: [#84](https://github.com/judragon003/-/issues/84)
- **規格書**: [SPEC-0010](../../docs/specs/0010-technical-debt-tracking-system.md)
- **架構決策**: [ADR-0010](../../docs/adr/0010-technical-debt-management-architecture.md)

## 任務清單
- [x] 建立 `docs/debts/README.md`，包含：
  1. 技術債總覽表格看板（編號、標題、優先級、狀態、發現來源、觸發時機）。
  2. 技術債生命週期與建檔標準四段式模板說明。
- [x] 建立首筆技術債文檔 `docs/debts/0001-holdings-sort-dry-refactor.md`：
  - 狀態: `OPEN`
  - 優先級: `P3`
  - 來源: PR #83 Code Review
  - 內容: 持倉雙階自然排序 DRY 集中化重構備忘。
