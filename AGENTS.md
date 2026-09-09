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
2. **Issue 優先原則 (Issue-First)**：
   - 凡有新需求或修復，**必須先確認或建立對應的 GitHub Issue**（使用 `gh issue create`）。
   - 嚴禁無 Issue 直接開發。分支名稱一律命名為 `feature/<issue-id>-<name>`、`fix/<issue-id>-<name>` 或 `docs/<name>`。
3. **測試驅動開發 (TDD)**：遵循紅-綠-重構循環完成開發，本地確保 `npm test` (100% 通過) 與 `npm run build` (TypeScript 0 錯誤)。
4. **領域文檔同步 (Doc Sync)**：若涉及新術語、架構決策或新元件，必須於同一 PR 中同步更新 `CONTEXT.md`、`docs/adr/` 與交接手冊，杜絕文檔脫鉤。
5. **發起 PR 與自動關聯 (Issue Link)**：
   - 推送分支後使用 `gh pr create` 發起 Pull Request。
   - **PR 描述內必須包含 `Closes #<issue-id>`**，確保 Squash and Merge 時 GitHub 自動關閉對應 Issue。
6. **合併與分支清理**：經 GitHub Actions CI 綠燈驗證後，執行 Squash and Merge 合併回 `main`，並同步清理遠端與本地已合併分支。
7. **交接自動補全 (Handoff & Auto-Sync)**：每次執行 `/handoff` 收尾時，Agent **必須主動檢查 `docs/specs/`、`docs/adr/` 與 `.scratch/`**。若本次迭代有新 PRD 但尚未建立 ADR 或 `.scratch/` 鏡像，Agent 必須主動自動生成對應 ADR、導出 `.scratch/v1.X/issues/` 本地票券鏡像，並同步更新 `README.md`、`CONTEXT.md` 與交接手冊，嚴禁等待人類提醒。
8. **技術債與改善建議管理 (Technical Debt Tracking)**：
   - 在程式碼審查 (`/code-review`) 或交接時，若存在識別出但「未在當期 PR 即時修改」之架構改善建議，Agent 必須主動建檔至 `docs/debts/` 並更新 `docs/debts/README.md` 索引。
   - 僅收錄未即時修改之建議；當期已修復完成者不建檔；已解決之技術債標記為 `RESOLVED`。
9. **GitHub 服務條款與防濫用合規守則 (GitHub ToS & Anti-Abuse Compliance)**：
   - **嚴禁濫用 Actions CI 與算力**：嚴禁短時間內高頻連續 Push 觸發過量 GitHub Actions Runner 分鐘數；嚴禁將 Actions 用於非 CI/CD 計算（如爬蟲、自動化交易）；本地必須先完成 `npm test` 與 `npm run build` 綠燈後才可發起推送。
   - **Git Push 節流與批量原則 (Anti-Abuse Throttling)**：嚴禁零星檔案修改微小推送（Micro-Pushing），推播前應於本地集中整合 Commit；**嚴格限制每小時推送遠端不超過 5 次**，避免觸發 GitHub 機器人行為檢測。
   - **CLI 與 API 呼叫安全限額**：使用 `gh issue create` 或 `gh pr create` 時必須嚴格受控，嚴禁 while 迴圈無間隔輪詢，單日批量操作受控，避免觸發 GitHub Abuse-Detection 風控。
   - **金鑰與隱私零外洩 (Zero Secrets)**：嚴禁將個人財務資料、API Token（如 FinMind、FMP、GitHub PAT 等）推播至 GitHub 遠端，所有敏感數據必須隔離於本地 LocalStorage 與 `.gitignore`。
   - **儲存庫容量與大檔案管制**：嚴禁提交超過 50MB 的二進位大檔或備份包（如 `.bundle`、`.tar.gz` 等），嚴禁將 GitHub 當作免費雲端硬碟。
10. **詳細操作指引與合規手冊**：
    - 分支與 PR 工作流：[docs/guides/branch_protection_and_pr_workflow.md](docs/guides/branch_protection_and_pr_workflow.md)
    - GitHub ToS、防封號與新帳號隔離指南：[docs/guides/github_tos_and_anti_ban_guidelines.md](docs/guides/github_tos_and_anti_ban_guidelines.md)



