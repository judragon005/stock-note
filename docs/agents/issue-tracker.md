# 任務追蹤器：GitHub (Issue Tracker: GitHub)

本專案的所有需求、問題與規格均記錄於 GitHub Issues。所有相關操作均使用 `gh` CLI 進行。

## 常用操作規範 (Conventions)

- **建立 Issue**：`gh issue create --title "..." --body "..."`（多行內容請使用 heredoc）。
- **讀取 Issue**：`gh issue view <number> --comments`（透過 `jq` 解析並獲取標籤與評論）。
- **列出 Issue**：`gh issue list --state open --json number,title,body,labels,comments`（配合相應 `--label` 與 `--state` 過濾器）。
- **評論 Issue**：`gh issue comment <number> --body "..."`。
- **標籤操作**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`。
- **關閉 Issue**：`gh issue close <number> --comment "..."`。

專案儲存庫會自動從 `git remote -v` 判定（`gh` 在本地 clone 目錄中會自動解析）。

## Pull Requests 作為分流介面 (PRs as a triage surface)

**PRs as a request surface: no**（若專案未來將外部 PR 納入 Issue 分流隊列，可將此值設為 `yes`）。

## 當技能要求「發布至任務追蹤器 (publish to the issue tracker)」時

直接建立一個 GitHub Issue。

## 當技能要求「獲取相關票券 (fetch the relevant ticket)」時

執行 `gh issue view <number> --comments`。
