# 09 — 頂部台美專屬雙軌切換 (TW/US/Global) 與水溫計 UI

**Parent:** #283

**What to build:**
在宏觀戰情室頂部提供一秒切換「🇹🇼 台股」、「🇺🇸 美股」與「🌐 全球」專屬視角標籤，讓投資人聚焦各自核心指針（美股專注利率/信用/通膨，台股專注外資空單/維持率/匯率），並於頂部掛載 0~100 宏觀水溫計毛玻璃卡片，三秒看懂進攻或防禦姿態。

**Blocked by:** 01-macro-thermometer-engine, 02-us-credit-canary-indicators, 03-tw-chips-canary-indicators, 08-macro-pulse-cache-and-sanitizer

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 頂部提供 `MarketViewTab` 切換按鈕（台股 / 美股 / 全球），切換時無縫過濾專屬指標面板。
- [ ] 頂部水溫計卡片展示動態評分條（0~100）、姿態徽章（【進攻・積極擴張】/【平衡・區間操作】/【防禦・現金為王】）與建議持股上限。
- [ ] 介面維持 100% 原生 Vanilla CSS 毛玻璃金融終端美學，無 Tailwind 依賴。
- [ ] 具備健全的空值與離線保護，無網路狀態下正常呈現本地快照。
