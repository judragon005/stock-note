# 08 — 戰情室漲跌色票 Helper 與曜石設計 Token 集中化

**What to build:** 建立統一的 `resolveDirectionalPalette` 色彩極性純函式與 `OBSIDIAN_CARD_CONTAINER` 曜石設計 Token，全面遷移主力戰情室卡片與任務面板的裸寫三元色票判斷與局部曜石邊框常數。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 匯出 `resolveDirectionalPalette(colorTheme)` 純函式並以單元測試驗證 `taiwan`／`international` 雙模式色碼
- [ ] 集中定義 `OBSIDIAN_CARD_CONTAINER` 等曜石主題常數
- [ ] 主力戰情室卡片與任務面板全面改用共用 Helper 與設計 Token，零裸寫漲跌三元色票
