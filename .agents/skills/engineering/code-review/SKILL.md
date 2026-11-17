---
name: code-review
description: 自指定基準點以「標準 (Standards)」與「規格 (Spec)」雙軸平行審查 Diff。
---

Two-axis review of the diff between `HEAD` and a fixed point the user supplies:

- **Standards** — does the code conform to this repo's documented coding standards?
- **Spec** — does the code faithfully implement the originating issue / spec?

Both axes run as **parallel sub-agents** so they don't pollute each other's context, then this skill aggregates their findings.

The issue tracker should have been provided to you. If `docs/agents/issue-tracker.md` is missing, tell the user to run `/setup-matt-pocock-skills`.

## Process

### 1. Pin the fixed point

Whatever the user said is the fixed point — a commit SHA, branch name, tag, `main`, `HEAD~5`, etc. If they didn't specify one, ask for it.

Capture the diff command once: `git diff <fixed-point>...HEAD` (three-dot, so the comparison is against the merge-base). Also note the list of commits via `git log <fixed-point>..HEAD --oneline`.

Before going further, confirm the fixed point resolves (`git rev-parse <fixed-point>`) and the diff is non-empty. A bad ref or empty diff should fail here — not inside two parallel sub-agents.

### 2. Identify the spec source

Look for the originating spec, in this order:

1. Issue references in the commit messages (`#123`, `Closes #45`, GitLab `!67`, etc.) — fetch via the workflow in `docs/agents/issue-tracker.md`.
2. A path the user passed as an argument.
3. A spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
4. If nothing is found, ask the user where the spec is. If they say there isn't one, the **Spec** sub-agent will skip and report "no spec available".

### 3. Identify the standards sources

Anything in the repo that documents how code should be written, such as `CODING_STANDARDS.md` or `CONTRIBUTING.md`.

On top of whatever the repo documents, the Standards axis always carries the **smell baseline** below — a fixed set of Fowler code smells (_Refactoring_, ch.3) that applies even when a repo documents nothing. Two rules bind it:

- **The repo overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation — and, like any standard here, skip anything tooling already enforces.

Each smell reads *what it is* → *how to fix*; match it against the diff:

- **Mysterious Name** — a function, variable, or type whose name doesn't reveal what it does or holds. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code** — the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy** — a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps** — the same few fields or params keep travelling together (a type wanting to be born). → bundle them into one type, pass that.
- **Primitive Obsession** — a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches** — the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism, or one map both sites share.
- **Shotgun Surgery** — one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change** — one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality** — abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains** — long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man** — a class or function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest** — a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.

### 4. Spawn both sub-agents in parallel

**Standards sub-agent prompt** — include:

- The full diff command and commit list.
- The list of standards-source files you found in step 3, **plus the smell baseline from step 3** pasted in full — the sub-agent has no other access to it.
- The brief: "Report — per file/hunk where relevant — (a) every place the diff violates a documented standard: cite the standard (file + the rule); and (b) any baseline smell you spot: name it and quote the hunk. Distinguish hard violations from judgement calls — documented-standard breaches can be hard, but baseline smells are always judgement calls, and a documented repo standard overrides the baseline. Skip anything tooling enforces. Under 400 words."

**Spec sub-agent prompt** — include:

- The diff command and commit list.
- The path or fetched contents of the spec.
- The brief: "Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look implemented but where the implementation looks wrong. Quote the spec line for each finding. Under 400 words."

If the spec is missing, skip the Spec sub-agent and note this in the final report.

### 5. Aggregate & Presentation Template

依據金字塔原理（Pyramid Principle）與第一性原則（First-Principles Grounding），雙軸審查報告必須嚴格遵循以下結構分區輸出，嚴禁將結論後置或以寒暄開頭：

```markdown
## 審查結論 (Executive Verdict)

> **第一性原則仲裁結果：【無需修繕 (PASS)】 或 【建議修繕 (REVISION NEEDED)】**
> 
> [依第一性原則，從底層抽象、狀態機水密性、代碼行數預算與不變量守恆，以 <= 3 句話直接說明「為什麼」]
> [若需修繕，指明具體修繕步驟與最小 Diff 目標；若無需修繕，說明零負擔驗收狀態]

---

## 審查基準 (Review Baseline)
- **基準錨點 (Fixed Point)**：`<fixed-point-commit-or-ref>`
- **審查目標 (Head)**：`HEAD` (`<head-commit-hash>`)
- **比對命令**：`git diff <fixed-point>...HEAD`

---

## 一、 規格軸審查 (Spec Axis)

審查程式碼是否忠實履約 originating issue / spec 之需求合約：
1. **核心需求與行為履約 (Core Requirements Fulfillment)**：逐條檢驗 spec 要求之功能與邊界。
2. **資訊架構與時序流向 (Architecture & Flow Alignment)**：檢驗 DOM、狀態或時序是否符合規格層次。
3. **介面契約與狀態水密性 (Interface & State Invariants)**：檢驗 Props、型別與回調是否零漏接、零篡改。
4. **範圍蔓延 (Scope Creep) 審查**：確認是否有未被要求的過度實作。

- **規格軸判定**：**PASS** 或 **REVISION NEEDED**。

---

## 二、 標準與程式碼氣味軸審查 (Standards & Code Smells Axis)

審查是否符合 DARS v2.0、`AGENTS.md` 協作準則與 Fowler 代碼氣味基準：
1. **極致奧坎剪刀 (Radical Occam / KISS)**：新增代碼行數比是否在理論極限內？有無過度設計與臆測性抽象？
2. **測試驅動開發 (TDD) 與測試縫隙 (Test Seams)**：測試是否依附於單一最高縫隙？是否耐受內部重構？
3. **Fowler Code Smells 掃描**：逐一過濾 Shotgun Surgery, Divergent Change, Speculative Generality, Primitive Obsession, Feature Envy 等。
4. **型別安全與測試覆蓋驗收**：`npm run build` TypeScript 0 錯誤、全量測試 100% 綠燈。

- **標準軸判定**：**PASS** 或 **REVISION NEEDED**。

---

## 三、 雙軸總結 (Executive Summary)

| 審查維度 | 發現事項數量 | 最嚴重議題等級 | 仲裁結論 |
| :--- | :---: | :---: | :---: |
| **規格軸 (Spec Axis)** | [數字] | [無 / 低 / 中 / 高 / 阻斷] | **[PASS / REVISE]** |
| **標準軸 (Standards Axis)** | [數字] | [無 / 低 / 中 / 高 / 阻斷] | **[PASS / REVISE]** |

**最終裁定**：[一句話裁定當前狀態，例如：維持主幹合併發布狀態 / 阻斷並發起最小 Patch 修正]。
```

Do **not** merge or rerank findings — the two axes are deliberately separate (see _Why two axes_).

## Why two axes

A change can pass one axis and fail the other:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**

Reporting them separately stops one axis from masking the other.
