# 專案 Agent 協作與規範指引 (AGENTS.md)

本文件定義 AI Agent 在本專案中的行為準則、工作流協作方式與環境配置。

## 核心原則 (Core Principles)

- **繁體中文與 KISS 原則**：所有對話、Commit 訊息、PR 描述與技術文檔一律使用繁體中文。保持設計精簡，避免過度工程化。
- **測試驅動開發 (TDD)**：所有功能實作必須遵循紅-綠-重構 (Red-Green-Refactor) 循環，只在公開介面縫隙 (Test Seams) 編寫測試。
- **防禦性開發**：在修改任何既有架構前，必須進行影響評估，杜絕修復 A 破壞 B。

---

## Agent skills

### Issue tracker

本專案使用 GitHub Issues 進行任務與規格追蹤，使用 `gh` CLI 操作。詳細規範請見 [docs/agents/issue-tracker.md](file:///d:/APP/股票紀錄/docs/agents/issue-tracker.md)。

### Triage labels

採用標準五大分流標籤 (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`)。詳細對照請見 [docs/agents/triage-labels.md](file:///d:/APP/股票紀錄/docs/agents/triage-labels.md)。

### Domain docs

採用單一領域架構 (Single-context)，以根目錄 `CONTEXT.md` 與 [docs/adr/](file:///d:/APP/股票紀錄/docs/adr/) 進行領域術語與決策紀錄。詳細消費規則請見 [docs/agents/domain.md](file:///d:/APP/股票紀錄/docs/agents/domain.md)。

### 分支管理與 PR 工作流 (Branch & PR Workflow)

所有功能開發與問題修復必須嚴格遵循以下流程：
1. **嚴禁直接 Push 至 `main` 分支**：主幹分支受保護，所有變更一律走 PR 流程。
2. **本地優先原則 (Local-First Task Tracking)**：
   - 凡有新需求或修復，**優先於本地 `.scratch/` 目錄建立任務鏡像與規格**。
   - **嚴禁使用腳本或 CLI 高頻、批量建立遠端 GitHub Issues**，避免觸發 GitHub 濫用偵測機制。
3. **測試驅動開發 (TDD)**：遵循紅-綠-重構循環完成開發，本地確保 `npm test` (100% 通過) 與 `npm run build` (TypeScript 0 錯誤)。
4. **領域文檔同步 (Doc Sync)**：若涉及新術語、架構決策或新元件，必須於同一 PR 中同步更新 `CONTEXT.md`、`docs/adr/` 與交接手冊，杜絕文檔脫鉤。
5. **聚合推送 (Consolidated Push)**：開發過程中所有 Commit 留存於本地分支，完成完整測試與驗收後才單次 Push 至遠端，避免連續頻繁 Push 造成 GitHub Actions CI 伺服器負擔。
6. **合併與分支清理**：經 GitHub Actions CI 綠燈驗證後，執行 Squash and Merge 合併回 `main`，並同步清理遠端與本地已合併分支。
7. **交接自動補全 (Handoff & Auto-Sync)**：每次執行 `/handoff` 收尾時，Agent 必須主動維護 `docs/specs/`、`docs/adr/`、`CHANGELOG.md` 與 `docs/handoff/handoff_stock_tracker_final.md`。

---

## GitHub 社群服務規範與防濫用合規守則 (GitHub Compliance & Anti-Abuse)

為嚴格遵守 [GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies) 與 API 使用限制，所有 Agent 與自動化流程必須遵守：
- **🚫 嚴禁高頻 API 轟炸**：禁止在短時間內連續呼叫 `gh` CLI 建立多個 Issue/PR。
- **⏱️ 請求節流 (Throttling)**：若必須呼叫 GitHub API，單次請求間隔不得低於 2 秒，杜絕並行請求。
- **🛡️ 本地隔離保護**：專案一切演進歷史以本地 `.scratch/` 與 Git 歷程為主，不依賴遠端高頻同步。
- **👤 人類審查控制**：任何遠端發布、PR 發起或 Push 操作，均由使用者親自確認控制。



