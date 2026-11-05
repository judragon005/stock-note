# 08 — 跨模組行動閉環 (App.tsx Action Callbacks)、全頁色彩主題與窄螢幕 RWD 停駐面板

**Parent:** #418 (Spec 0217: 籌碼與動態星圖湖倉直連、物理引擎校準、ETF 造市隔離與實戰閉環升級規格)

**What to build:**
打通專案全流程實戰閉環與修復色彩/RWD：
1. 在 `App.tsx` 將 `onOpenOmniInspector`、`onOpenAiForce`、`onOpenDeepDive`、`onQuickTrade` 傳入 `ChipsWorkspace`。
2. 於鎖定泡泡 Tooltip 底部與明細表明細列提供 `[🔍 技術透視]`、`[⚡ 主力戰情]`、`[📝 記一筆]` 快速動作按鈕。
3. 修復決策快報與 SVG 背景四象限底色硬編碼紅綠，100% 對齊全域 `colorTheme`（台股紅漲綠跌 / 國際綠漲紅跌）。
4. 窄螢幕 RWD 自適應：當畫布寬度 `< 640px` 時，Tooltip 自動由絕對定位浮窗轉為 SVG 下方靜態停駐面板，徹底解決遮蓋 80% 畫布的缺陷。

**Blocked by:** 07 — 頂部四象限互動篩選、決策快報聚光燈定位與星圖下方「實戰籌碼作戰明細表」

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 點擊泡泡上的「🔍 技術透視」，成功開啟 `OmniTechnicalInspectorModal` 並顯示該股真實 K 線與箱頂防守價。
- [ ] 點擊「⚡ 主力戰情」，成功跳轉至 `aiforce` 工作區並鎖定該股。
- [ ] 切換 `colorTheme === 'international'`，多頭顯示綠色、空頭顯示紅色，無任何殘留反向硬編碼。
- [ ] 在 375px 寬度螢幕下，點擊泡泡 Tooltip 不遮擋上方星圖，完整呈現在畫布下方。
- [ ] 全套單元測試 `npm test` 100% 綠燈，`npm run build` 0 TypeScript 錯誤。

