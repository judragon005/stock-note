# 產品需求規格書 (PRD)：技術債與架構改善意見追蹤管理系統

- **文件編號**：`SPEC-0010`
- **版本**：`V1.9`
- **狀態**：`APPROVED`
- **作者**：Antigravity Agent
- **日期**：2026-08-21
- **追蹤 ADR**：[ADR-0010: 技術債與改善建議分級歸檔架構](../adr/0010-technical-debt-management-architecture.md)

---

## 1. 背景與核心目標 (Context & Objectives)

在快速迭代與重構的過程中，程式碼審查 (Code Review) 常會識別出非阻擋性但具備長期維護價值的改善意見（例如：DRY 重構、共用模組抽取、邊緣案例防禦加強）。
若直接在當前 PR 處理，可能導致範圍蔓延 (Scope Creep) 與過度工程化；但若未建立正式記錄，改善建議容易遺失。

本規格旨在於專案文檔體系中建立一套標準化、具可追溯性的**技術債管理系統 (`docs/debts/`)**，將未即時處理的架構建議收錄為編號文檔，並與 Agent 協作工作流完全打通。

---

## 2. 核心規範與目錄結構 (Core Specifications)

### 2.1 目錄佈局與命名
- **目錄路徑**：`docs/debts/`
- **總覽索引檔**：`docs/debts/README.md`
- **單一技術債命名**：`0001-<short-name>.md`（4 位數字連續編號 + 簡短英數連字號命名）

### 2.2 技術債標準四段式模板
每份技術債文檔必須包含以下標準欄位：
1. **元數據 (Metadata)**：
   - `狀態`：`OPEN` (待處理) / `RESOLVED` (已解決) / `WONTFIX` (不予處理)
   - `優先級`：`P1` (高/近期需處理) / `P2` (中/下次架構演進處理) / `P3` (低/優化備忘)
   - `發現來源`：關聯之 PR、Issue 或 Code Review
   - `標籤`：`Refactor` / `Performance` / `Testing` / `Architecture`
2. **第一節：背景與現狀代碼 (Context & Current Code)**：包含精確檔案路徑、行號區間與現行程式碼段落。
3. **第二節：問題分析與暫緩理由 (Problem & Deferral Rationale)**：說明技術債成因及當期暫緩實作之權衡考量。
4. **第三節：建議重構方案 (Proposed Refactoring Solution)**：提供具體的設計思路、介面草案或重構代碼示例。
5. **第四節：觸發處理時機 (Trigger Conditions)**：具體定義在何種業務或技術演進情境下必須啟動修復。

### 2.3 納入 Agent 協作規範 (AGENTS.md)
在 [AGENTS.md](file:///d:/APP/股票紀錄/AGENTS.md) 中正式加入規則：
- 在執行 `/code-review` 或 `/handoff` 時，若存在審查提出但「未在當前 PR 即時修改」之架構改善建議，Agent 必須主動將其建檔至 `docs/debts/` 並更新 `docs/debts/README.md` 索引。
- 若當期已直接完成改善，則不應建立技術債。

---

## 3. 初始技術債建檔內容 (Initial Records)

建立第一筆技術債檔案：
- **檔案**：`docs/debts/0001-holdings-sort-dry-refactor.md`
- **標題**：持倉雙階自然排序 DRY 集中化重構
- **來源**：PR #83 程式碼審查意見
- **觸發時機**：未來新增第三個交易市場（如港股 HK、日股 JP）或自訂排序規則擴展時。

---

## 4. 受影響檔案清單 (Impacted Files)

| 檔案路徑 | 變更性質 | 變更說明 |
| :--- | :---: | :--- |
| `docs/debts/README.md` | 新建檔案 | 技術債索引看板與建檔生命週期維護指引。 |
| `docs/debts/0001-holdings-sort-dry-refactor.md` | 新建檔案 | 第一筆技術債實例（持倉排序 DRY 抽取）。 |
| `docs/adr/0010-technical-debt-management-architecture.md` | 新建檔案 | 技術債管理機制之架構決策紀錄。 |
| `AGENTS.md` | 修改檔案 | 於 Agent 工作流中增補技術債自動歸檔準則。 |
| `CONTEXT.md` | 修改檔案 | 同步 ADR-0010 與技術債術語。 |
| `README.md` | 修改檔案 | 更新專案文檔導覽索引。 |

---

## 5. 驗收標準 (Acceptance Criteria)

- [x] **AC-1 (目錄與索引建置)**：`docs/debts/README.md` 建立完成，包含清晰的看板表格與建檔標準指引。
- [x] **AC-2 (首筆技術債規範化)**：`docs/debts/0001-holdings-sort-dry-refactor.md` 採用標準四段式結構完整建檔。
- [x] **AC-3 (Agent 協作規範同步)**：`AGENTS.md` 明確載明「未即時改善之 Code Review 建議自動歸檔至 `docs/debts/`」之規則。
- [x] **AC-4 (架構文檔齊全)**：`ADR-0010` 建立，`CONTEXT.md` 與 `README.md` 同步更新。
