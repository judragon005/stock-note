---
name: handoff
description: 在長任務或長對話中產生精準的上下文交接點紀錄 (Handoff Artifact)。
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS - not the current workspace.

## 🔄 自動化領域文件補全檢查 (Automated ADR & Doc Sync Check)
在執行 `/handoff` 產出交接手冊前，Agent **必須主動執行以下自動補全檢查，無需等待人類提醒**：
1. **ADR 查核與自動補建**：檢查 `docs/specs/` 中本次迭代的新 PRD 是否已在 `docs/adr/` 中建立對應的架構決策紀錄（ADR）。若缺失，Agent 必須立即依據對話決策自動生成 ADR 文件（記錄 Context, Decisions, Consequences）。
2. **領域詞彙與索引同步**：確認 `CONTEXT.md`、`README.md` 的功能特色與目錄樹狀圖是否已同步最新狀態與測試數據（如 Vitest 測試數量）。
3. **專案交接手冊更新**：更新 `docs/handoff/handoff_stock_tracker_final.md` 包含最新 ADR、PRD 與 PR 合併紀錄。

## 📋 Handoff 文檔要求
Include a "suggested skills" section in the document, naming which skills the next agent should call the Skill tool for.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.

