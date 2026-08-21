# 技術債與架構改善索引看板 (Technical Debt Tracker)

本目錄 (`docs/debts/`) 為專案之**架構技術債與非阻擋性改善建議**的集中存放區。

---

## 📋 技術債清單看板 (Debt Registry)

| 編號 | 標題 | 優先級 | 狀態 | 發現來源 | 標籤 | 預計觸發時機 |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| [**0001**](0001-holdings-sort-dry-refactor.md) | 持倉雙階自然排序 DRY 集中化重構 | `P3` | `OPEN` | PR #83 審查 | `Refactor` | 新增第三交易市場或擴充自訂排序時 |

---

## 🏛️ 收錄原則與生命週期管理 (Governance & Lifecycle)

### 1. 收錄門檻
- **僅收錄「未在當期 PR 即時修改」之架構改善建議**。
- 若審查提出的問題已在當期 PR 直接修復完成，則**不予建檔**，保持看板純淨。

### 2. 狀態定義 (Status)
- `OPEN`：待處理之架構改善或重構建議。
- `RESOLVED`：已在後續 PR 中完成重構並關閉。
- `WONTFIX`：經架構評估後確認不予實施。

### 3. 優先級劃分 (Priority)
- `P1 (High)`：對未來功能擴充具直接阻礙，需於近期排程修復。
- `P2 (Medium)`：具顯著維護價值，待下次相關模組重大變更時一併重構。
- `P3 (Low)`：純代碼整潔度 (DRY/Clean Code) 備忘，待特定觸發條件成立時再行抽取。

---

## 📝 新增技術債模板 (Template)

新建技術債時，請於 `docs/debts/` 建立 `XXXX-<short-name>.md` 並遵循四段式標準結構：

```markdown
# 技術債 #XXXX: <簡短標題>

- **狀態**：`OPEN`
- **優先級**：`P1` | `P2` | `P3`
- **發現來源**：PR #<id> / Code Review
- **建立日期**：YYYY-MM-DD
- **標籤**：`Refactor` | `Performance` | `Testing` | `Architecture`

---

## 1. 背景與現狀代碼 (Context & Current Code)
<說明現行代碼位置與實作方式>

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)
<說明技術債本質與為何當期不立即修改>

## 3. 建議重構方案 (Proposed Refactoring Solution)
<提供建議接口、虛擬代碼或架構草案>

## 4. 觸發處理時機 (Trigger Conditions)
<明確指出在何種條件下應啟動此重構>
```
