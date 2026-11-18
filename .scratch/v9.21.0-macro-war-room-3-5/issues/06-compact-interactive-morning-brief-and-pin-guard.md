# 06 — AI 戰略釘選超配護欄與緊湊型互動晨報

**Parent:** #584 (Spec 0235)

**What to build:** 抽離 `WarRoomMorningBriefCard` 子元件，移除與頂部重複的 3 顆複製按鈕，並將長篇宏觀/防護盾文字診斷收合於可展開詳情區；在 `MacroStrategyPinBar` 與防護盾中計算並顯示「當前實際股票倉位 % vs 建議/AI 釘選上限」之超配減碼金額警示；為晨報紀律執行清單中點名之持股掛載一鍵 `📈 技術面` 與 `⚡ 下單` 按鈕。

**Blocked by:** 02 — 風控計量精度修復與單一權益上限基準, 03 — 個人防護盾 3.5 整併與隱私防漏修枝

**Status:** ready-for-agent

- [ ] 頁面僅保留單一組晨報複製/脫敏複製/LLM Payload 按鈕
- [ ] 晨報診斷文字預設收合，點名個股之執行膠囊可一鍵觸發 `onInspectTechnical` / `onOpenTradeModal`
- [ ] `MacroStrategyPinBar` 顯示實際持股佔比與釘選上限對比，超配時醒目提示應減碼金額
- [ ] 元件測試驗證互動跳轉與超配警示邏輯
