# 01 — 戰情室元件預重構與台美紅綠漲跌主題色全面對齊 (War Room Component Prefactoring & Color Theme Variable Unification)

**What to build:**
將近 2,000 行的單體 `WarRoomWorkspace` 預先拆解出高內聚的子元件插槽（雙溫度計與跨市傳導橫幅 `MacroDualThermometerBar`、部位防禦護欄與自由子彈卡 `PortfolioShieldAndAmmoCard`、外部 AI 宏觀戰略釘選列 `MacroStrategyPinBar`），並將戰情室所有寫死的 `#4ade80` / `#f87171` 漲跌色碼全面替換為全站 CSS 變數 `var(--gain-color)` 與 `var(--loss-color)`，使戰情室即時連動「台股紅漲綠跌 / 國際綠漲紅跌」色彩模式。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] 戰情室抽離高內聚子元件並保持既有外部行為與測試 100% 綠燈
- [x] 全頁多空燈號與漲跌幅色彩統一引用 `var(--gain-color)` 與 `var(--loss-color)`，切換 `taiwan` / `international` 主題時即時連動

