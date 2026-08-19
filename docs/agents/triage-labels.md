# 任務分流標籤 (Triage Labels)

技能組依據五大標準分流角色進行任務判定。本文件定義本專案 Issue 追蹤器中對應的實際標籤字串：

| 標準標籤 (Canonical Role) | 專案實際標籤 (Our Tracker) | 語義說明 (Meaning) |
| ------------------------- | -------------------------- | ------------------ |
| `needs-triage`            | `needs-triage`             | 維護者需要評估此 Issue |
| `needs-info`              | `needs-info`               | 等待提報者補充更多資訊 |
| `ready-for-agent`         | `ready-for-agent`          | 規格已完備，可由 AI Agent 獨立執行 |
| `ready-for-human`         | `ready-for-human`          | 需由人類工程師親自實作 |
| `wontfix`                 | `wontfix`                  | 經判定不予處理 |

當技能提及某個分流角色（例如「標註為 Agent 可執行」）時，一律套用本表對應的標籤。
