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
