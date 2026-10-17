# 11 — 三段時序雷達展示與繁中晨會簡報一鍵複製 UI

**Parent:** #283

**What to build:**
於宏觀戰情室展示「彭博式三段時序雷達（今日/7日/30日）」，整合月營收截止倒數與除息扣點，並在 AI 智慧晨報提供一鍵複製格式化「繁體中文晨會簡報」，方便隨時貼入筆記或通訊軟體。

**Blocked by:** 06-zero-mock-dual-momentum-engine, 07-timeline-catalyst-radar, 09-war-room-market-tabs-and-thermometer-ui, 10-war-room-shield-var-and-stress-ui

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 關鍵催化劑重構為「今日登場」、「7 日焦點」、「30 日遠端」分組展示，支援市場與個股標記。
- [ ] 晨報區塊提供「📋 一鍵複製晨會戰情報告」按鈕，產出結構完整、高可讀性之繁體中文 Markdown 簡報（含水溫分數、VaR、台美焦點、操作要點）。
- [ ] 點擊複製後提供短暫「✔ 已複製到剪貼簿」Toast 提示。
- [ ] 測試驗證全功能在斷網離線環境下操作流暢、無白屏無報錯。
