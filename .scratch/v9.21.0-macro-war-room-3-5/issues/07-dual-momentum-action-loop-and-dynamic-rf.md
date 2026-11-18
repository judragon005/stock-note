# 07 — 雙重動能排行榜互動閉環與動態無風險利率

**Parent:** #584 (Spec 0235)

**What to build:** 抽離 `DualMomentumRotationCard` 子元件；依當前 `marketView` (`TW` / `US` / `GLOBAL`) 自動推薦切換對應動能資產池；動態讀取 `macroSnapshot.us3m` 作為美股/全球池無風險利率基準（台股池維持 `0.02`）；在排行榜每一列標記使用者「在庫權重 %」徽章，並提供一鍵 `📈 技術面` 與 `⚡ 下單換倉` 按鈕。

**Blocked by:** 01 — 統一宏觀數據海關正規化器, 05 — 頂部操作列去重與全頁 GLOBAL / TW / US 視角貫通

**Status:** ready-for-agent

- [ ] 切換至 `TW` / `US` 視角時自動推薦切換對應動能資產池（支援手動覆寫）
- [ ] 無風險利率依市場池與 `macroSnapshot.us3m` 動態帶入而非寫死 `0.04`
- [ ] 排行榜每列顯示在庫持倉權重並支援一鍵跳轉技術面或開啟下單 Modal
- [ ] 元件與引擎測試通過
