# 技術債 #0002: 交易計畫與紀律檢討模組 (Trade Journal & Discipline Review)

- **狀態**：`RESOLVED` (已於 v5.7.0 ADR #0041 完整解決)
- **優先級**：`P2`
- **發現來源**：PROMPT 對齊與需求分析 (Gap Analysis)
- **建立日期**：2026-08-25
- **標籤**：`Architecture` · `Feature` · `Journal`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統之 `TradeRecord` 實體僅具備基本的 `note?: string`（備註）與 `tags?: string[]`（標籤）欄位。在持倉已平倉檢視（`ClosedPositionsSummary` 與 `HoldingsTable.tsx`）中，雖然已能統計勝率 %、代表贏家/輸家與已實現損益，但無法追蹤每一筆交易在進場前的「交易計畫（停損價、停利價、預期風報比）」以及出場後的「紀律執行回顧（是否遵守計畫、犯錯檢討、紀律評分）」。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

* **問題分析**：對於專業自用投資者而言，單純記錄「買賣結果」不足以提升交易品質。若無結構化之交易計畫與事後紀律評分，無法有效覆盤是「運氣好」還是「紀律好」，亦無法統計嚴守停損與凹單的績效差異。
* **暫緩理由**：目前 V3.7 核心計算引擎、稅務與公司行動掃描器運作穩定。此功能屬於交易日誌 (Journal) 維度的深化體驗，先建檔技術債，待使用者通知後再行排程開發。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

1. **擴充 `TradeRecord` 與 `HoldingPosition` 資料模型**：
   ```typescript
   export interface TradePlan {
     entryReason?: string;             // 進場理由 / 交易假說
     stopLossPrice?: number;           // 預設停損價
     takeProfitPrice?: number;         // 預設停利價
     plannedRiskRewardRatio?: number;  // 預計風報酬比
   }

   export interface TradeReview {
     isPlanFollowed?: boolean;         // 是否嚴格遵守交易計畫
     mistakesMade?: string[];          // 犯錯類型 (如：追高、凹單、過早停利、情緒化加碼)
     lessonsLearned?: string;          // 覆盤得失與學習心得
     disciplineScore?: number;         // 紀律執行評分 (1 ~ 5 顆星)
     reviewedAt?: number;
   }
   ```
2. **在 `TradeModal.tsx` 新增「交易計畫」摺疊選單**：建倉買進時允許選填進場理由與預計停損停利點。
3. **在已平倉標的展開面板增設「賽後檢討」回顧卡**：平倉後可直接在表格內快速評分與紀錄覆盤心得。
4. **已平倉儀表板新增「紀律執行率」指標**：統計遵守計畫比例與獲利期望值之關聯。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 使用者主動指示啟動「交易計畫與紀律檢討系統」。
2. 使用者需要更深度的交易心理與策略覆盤工具。
