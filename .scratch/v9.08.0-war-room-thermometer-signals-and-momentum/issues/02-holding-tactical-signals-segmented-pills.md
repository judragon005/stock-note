# 02 — 持股戰術雷達分頁膠囊切換與正向安全反饋 (Holding Tactical Signals Segmented Pills & All-Clear Shield)

**What to build:**
重構 `HoldingTacticalSignalsCard.tsx`：廢除有漏洞的單一收合按鈕與 `normalSignals.slice(0, 5)` fallback；導入三段分頁膠囊切換：`[ 🚨 需行動 (X) ]` 與 `[ 📑 全部在倉 (Y) ]`。當「需行動」且數量為 0 時，明確渲染綠色正向安全卡片（`🛡️ 當前在倉全數安全續抱`），徹底消滅 1 檔股票時點擊按鈕無反應之假死現象。

**Blocked by:** None — can start immediately

**Status:** closed

- [x] 廢除 `showNormalHoldings` 布林值，改為 `activeFilter: 'ACTIONABLE' | 'ALL'` 狀態
- [x] 移除 `displayedSignals` 中違反狀態機的 `normalSignals.slice(0, 5)` fallback
- [x] 導入高亮分頁膠囊按鈕 `[ 🚨 需行動 (X) ]` 與 `[ 📑 全部在倉 (Y) ]`
- [x] 當 `activeFilter === 'ACTIONABLE'` 且 `actionableSignals.length === 0` 時，渲染綠色正向安全卡片
- [x] 補充並通過單元測試，驗證膠囊切換與空狀態反饋
