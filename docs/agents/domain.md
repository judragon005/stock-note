# 領域文件規範 (Domain Docs)

本文件規範工程技能在探索專案程式碼庫時，如何閱讀與遵循領域文件。

## 探索程式碼庫前應讀取之文件

1. 根目錄之 **`CONTEXT.md`**（若存在）。
2. **`docs/adr/`**：讀取與即將進行工作區域相關之架構決策紀錄 (ADR)。

若上述檔案尚未存在，請**靜默繼續 (proceed silently)**，勿主動阻斷。當後續執行 `/grill-with-docs` 或 `/domain-modeling` 時，將會按需 (lazily) 建立詞彙與決策。

## 專案結構配置 (File Structure)

本專案採用單一領域架構 (Single-context repo)：

```text
/
├── CONTEXT.md          # 專案領域術語與邊界概念
├── docs/
│   ├── adr/            # 系統架構決策紀錄 (Architectural Decision Records)
│   └── agents/         # Agent 運作與工作流配置
└── src/                # 原始程式碼
```

## 遵循領域術語 (Use the glossary's vocabulary)

當產出涉及領域概念（如 Issue 標題、重構提案、假說、測試名稱）時，務必使用 `CONTEXT.md` 中定義的標準術語，避免發明未定義的同義詞。

## 標註 ADR 衝突 (Flag ADR conflicts)

若產出或提議與既有 ADR 發生衝突，必須明確指出並說明原因，而非靜默覆寫：

> *注意：此提議與 ADR-xxxx 存在衝突，但建議重新審視，原因為……*
