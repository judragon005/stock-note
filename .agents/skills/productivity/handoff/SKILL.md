---
name: handoff
description: 在長任務或長對話中產生精準的上下文交接點紀錄 (Handoff Artifact)。
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS - not the current workspace.

## 🔄 自動化交接收尾與清理閉環 (Automated Handoff & Cleanup Protocol)
在執行 `/handoff` 產出交接手冊與結案時，Agent **必須主動依序執行以下閉環步驟，無需等待人類提醒**：

1. **主幹合併閉環 (Mainline Squash & Merge)**：
   - 確認 GitHub PR 通過 CI 綠燈測試後，執行 `gh pr merge <id> --squash --delete-branch` 完成主幹合併，確保關聯 Issue 自動關閉。
2. **本地分支清理 (Local Branch Pruning)**：
   - 切換回 `main` 分支並執行 `git pull origin main` 同步最新狀態。
   - 執行 `git fetch -p` 清理遠端已刪除的追蹤分支。
   - 自動遍歷並強制刪除本地所有已合併之過期分支（如 `git branch -D`），確保本地僅保留單一且乾淨的 `main` 分支。
3. **工作區清理與驗證 (Workspace Sanitization)**：
   - 確保工作區一塵不染，執行 `git status` 驗證其顯示 `working tree clean`。
   - 嚴禁遺留任何未受控或未提交之暫存修改。
4. **專案內臨時檔案清理 (Temp File Cleanup)**：
   - 主動搜尋並清除開發中產生的臨時檔案（如 `*.tmp`, `*.temp`, `*.log`, `*.bak`, 臨時二進位備份檔 `.bundle`、暫存測試產物等）。
5. **ADR 查核與自動補建**：
   - 檢查 `docs/specs/` 中本次迭代的新 PRD 是否已在 `docs/adr/` 中建立對應的架構決策紀錄（ADR）。若缺失，Agent 必須立即依據對話決策自動生成 ADR 文件（記錄 Context, Decisions, Consequences）。
6. **領域詞彙與索引同步**：
   - 確認 `CONTEXT.md`、`README.md` 的功能特色與目錄樹狀圖是否已同步最新狀態與測試數據（如 Vitest 測試數量）。
7. **本地 Ticket 鏡像同步**：
   - 檢查 `.scratch/v1.X/issues/` 是否已建立本次迭代之 Ticket 鏡像。若缺失，自動導出 GitHub Issues 至 `.scratch/` 確保本地歷史存檔 100% 完整。
8. **專案交接手冊更新**：
   - 更新 `docs/handoff/handoff_stock_tracker_final.md` 包含最新 ADR、PRD 與 PR 合併紀錄。

## 📋 Handoff 文檔要求
Include a "suggested skills" section in the document, naming which skills the next agent should call the Skill tool for.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.

