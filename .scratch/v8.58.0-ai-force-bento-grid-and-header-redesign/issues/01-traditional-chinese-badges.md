# 01 — 系統狀態燈號全繁體中文規範化

**What to build:**
將 `HeaderMarketBar.tsx` 中的 4 大系統膠囊標籤英文全面替換為繁體中文：
- `AI SCAN ACTIVE` ➔ `AI 智慧掃描`（保留綠色動態呼吸點）
- `MAIN FORCE TRACKING` ➔ `主力行為追蹤`
- `MARKET STATUS` ➔ `市場即時狀態`
- `VOLATILITY ALERT` ➔ `波動異常預警`
並同步更新 `HeaderMarketBar.test.ts` 中的斷言。

**Blocked by:** None — can start immediately

**Status:** completed

- [x] `getSystemBadgeConfig('AI_SCAN')` 回傳 `label: 'AI 智慧掃描'`
- [x] `getSystemBadgeConfig('MAIN_FORCE')` 回傳 `label: '主力行為追蹤'`
- [x] `getSystemBadgeConfig('MARKET_STATUS')` 回傳 `label: '市場即時狀態'`
- [x] `getSystemBadgeConfig('VOLATILITY')` 回傳 `label: '波動異常預警'`
- [x] `HeaderMarketBar.test.ts` 單元測試全數綠燈通過
