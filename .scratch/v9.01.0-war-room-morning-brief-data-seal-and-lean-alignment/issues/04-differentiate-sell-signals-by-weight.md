# 04 — 破線警示依持股權重分級並撤回全數停損口號 (Differentiate Sell Signals by Weight)

**Parent:** Spec 0204 (Ticket 04)

**What to build:**
修改 `src/engine/macroAdvisorEngine.ts` 中破線賣出訊號的呈現文案與風控權重判斷。目前系統一旦有標的破線，就發出「全數立即停損減碼，切忌凹單」的自殘恐慌指令。重構為依據 `weightPercent`（持股佔比）與跌破嚴重度進行分級排序（P1 優先檢核 $\rightarrow$ P2 次要 $\rightarrow$ P3 核心觀望），小額試單破線不綁架整戶大盤水溫計，將文案修訂為理性風控檢核。

**Blocked by:** Ticket 03

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 在 `generateAiMorningBrief` 中，當 `sellSignals.length > 0` 時：
  - 依 `weightPercent`（佔比大者優先）及跌破幅度降冪排序。
  - 取前 3~4 檔重點點名其代號與防守線，若總數大於 4 檔，追加「等共 X 檔跌破個別箱底」。
  - 文案修訂為：`⚠️【破線觀察】持股 A (防守線 $X)、B (防守線 $Y)... 跌破個別箱底支撐，建議依 P1~P4 優先序檢核停損紀律，避免情緒化凹單。`
  - 撤回「全數立即停損、切忌凹單」之恐慌指令。
- [ ] 作戰方針判斷防禦升級門檻：只有當「破線標的合計權重佔總淨值超過 10%」或「單一權重大於 4% 的主力標的破線」時，才將 `tone` 切換為 `DEFENSIVE`；若是小額零股破線，維持總體宏觀中樞判定，避免尾巴搖狗。
- [ ] 單元測試 `src/engine/macroAdvisorEngine.test.ts` 驗證小權重破線不會錯誤切換總體姿態。
