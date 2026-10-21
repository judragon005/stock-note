# 07 — 券商與法人級高衝擊事件聯動 AI 晨報風控 (src/engine/macroAdvisorEngine.ts)

**Parent:** #281

**What to build:**
升級 `generateAiMorningBrief()`，實現「高衝擊催化劑 × 個人質押槓桿」之多維度風控聯動：
1. 識別緊迫高衝擊事件：
   - 篩選 `upcoming.some(c => c.daysLeft <= 3 && c.impact === 'HIGH')`。
2. 風控規則觸發：
   - 當即將迎來高衝擊事件（如 FOMC 利率決議、台指期結算或美股四巫日），且使用者個人防護盾之質押維持率處於警戒水位（`marginStatus === 'WARNING'` 或維持率 `< 180%`）時：
     - 今日定調升級為 `【重大事件逼近・嚴控質押槓桿】`（或相應警示 tone）。
     - 行動要點 (Action Points) 強制插入避險紀律：「3 日內即將迎來重大高波動事件，且質押槓桿處於警戒防區，強烈建議暫停追價加碼，優先提高現金水位或提撥擔保品以防範流動性黑天鵝。」

**Blocked by:** Ticket 01

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 當有 2 天後到期的 FOMC（HIGH）且使用者質押維持率 155%（WARNING）時，晨報定調與要點精確輸出風控警戒。
- [ ] 當無高衝擊事件或個人槓桿極度安全時，維持既有判斷邏輯，不破壞舊有 8 個單元測試。
- [ ] 於 `src/engine/macroAdvisorEngine.test.ts` 新增測試案例驗證該風控分支。
