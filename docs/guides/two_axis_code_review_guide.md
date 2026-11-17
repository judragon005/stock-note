# 雙軸程式碼審查實務指南 (Two-Axis Code Review Guide)

本指南規範本專案中所有 `/code-review` 執行的雙軸平行審查機制與輸出格式標準。

---

## 核心哲學：為什麼需要雙軸平行審查？

一項代碼變更可能符合其中一軸，但徹底破壞另一軸：
- **規格軸通過，標準軸失敗**：功能完全滿足需求，但代碼充滿了 Fowler Code Smells、侵入式抽象或破壞了既有架構原則。
- **標準軸通過，規格軸失敗**：代碼架構非常優雅、型別與排版完美，但實作了錯誤的業務行為或遺漏了關鍵邊界。

雙軸獨立平行審查能徹底杜絕單一視角的掩蓋與偏見。

---

## 報告輸出規範（金字塔原理與第一性原則）

每次執行 `/code-review` 產出之報告，一律嚴格遵循以下五大結構：

### 1. 審查結論 (Executive Verdict)
- **第一行直接給出裁定**：`【無需修繕 (PASS)】` 或 `【建議修繕 (REVISION NEEDED)】`。
- **第一性原則歸因**：從抽象層級、狀態機水密性、代碼行數預算（理論最小值比率）與系統不變量進行客觀說明。
- **行動指引**：若需修繕，指明精確步驟與預期最小 Diff；若無需修繕，說明零負擔驗收狀態。

### 2. 審查基準 (Review Baseline)
- **基準錨點 (Fixed Point)**：明確指出比較起點（Commit SHA 或 Release Tag）。
- **審查目標 (Head)**：指明當前 HEAD 提交點。
- **比對命令**：指明精確比對命令（如 `git diff <fixed-point>...HEAD`）。

### 3. 規格軸審查 (Spec Axis)
- **核心需求履約 (Core Requirements)**：逐條對齊 PRD / Issue 驗收條件。
- **資訊階層與時序流向 (Hierarchy & Temporal Alignment)**：檢驗 DOM 結構或時間序列是否倒置。
- **介面契約與狀態水密性 (Interface Invariants)**：檢驗 Props、型別與回呼函數是否完整傳遞。
- **範圍蔓延審查 (Scope Creep)**：檢驗是否包含未被要求的額外實作。
- **規格軸判定**：給出該軸向之獨立裁定（PASS / REVISION NEEDED）。

### 4. 標準與程式碼氣味軸審查 (Standards & Code Smells Axis)
- **極致奧坎剪刀 (Radical Occam / KISS)**：檢驗行數預算與是否有臆測性抽象。
- **TDD 與測試縫隙 (Test Seams)**：驗證是否使用單一最高測試縫隙，測試是否耐受內部重構。
- **Fowler Code Smells 掃描**：過濾 Shotgun Surgery, Divergent Change, Speculative Generality, Primitive Obsession, Feature Envy 等。
- **型別與編譯驗收**：驗證 `npm run build` 與 `npm test` 執行結果。
- **標準軸判定**：給出該軸向之獨立裁定（PASS / REVISION NEEDED）。

### 5. 雙軸總結 (Executive Summary)
- 輸出結構化量化表格：

| 審查維度 | 發現事項數量 | 最嚴重議題等級 | 仲裁結論 |
| :--- | :---: | :---: | :---: |
| **規格軸 (Spec Axis)** | [數字] | [無 / 低 / 中 / 高 / 阻斷] | **[PASS / REVISE]** |
| **標準軸 (Standards Axis)** | [數字] | [無 / 低 / 中 / 高 / 阻斷] | **[PASS / REVISE]** |

- 給出最終裁定總結。
