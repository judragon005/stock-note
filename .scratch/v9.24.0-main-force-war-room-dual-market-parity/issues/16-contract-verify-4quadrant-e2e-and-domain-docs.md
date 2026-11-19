# 16 — [Contract & Verify] 四象限 E2E 回歸門禁、相容清理與領域文件 (CONTEXT.md / ADR-0239) 同步

**Parent:** #592 (Spec 0239)
**What to build:** 作為 Spec 0239 終極收尾與 **Contract** 階段，清理跨卡過渡期冗餘別名與死碼，建立覆蓋 **4 象限（TW 個股 `2330`/OTC `8299`、TW ETF `0050`/`00403A`、金融股防誤判 `2881`、US 個股 `NVDA`/`BRK.B`、US ETF `VT`）+ 邊界夾具（`0D`、`3D`、`$4.50` 虧損美股）** 的全量自動化回歸門禁，確保全專案 `npm test` 100% 與 `npm run build` 0 錯誤，並同步更新 `CONTEXT.md` 與產出 `ADR-0239`。
**Blocked by:** 11 — Header 導覽列全量美股搜尋、中文股名防呆與非同步 PNG/HTML 匯出修復, 12 — Zone 01–02 卡片精修 (Card 01 K 線 / Card 02 決策 / Card 03 雷達 / Card 04 熱區 / Card 05 風險蛛網), 13 — Zone 03 卡片精修 (Card 06 預測錐 / Card 07 VWAP / Card 08 法人 / Card 19 集保·13F / Card 20 營收·ETF), 14 — Layer 6 卡片精修與孤兒元件收斂 (Card 10·13 能量情緒 / Card 12 動態信號 / Card 14 AI 信心 / Card 21 估值矩陣), 15 — Zone 04 卡片與 TASK 2–5 分頁精修 (Card 09 / 11 / 15 / 16 / 17 / 18 + TaskPanels)
**Status:** ready-for-agent

- [ ] 新增雙市場四象限黃金夾具 E2E 回歸測試並 100% 通過（驗證 21 卡 × 4 象限零 `NaN`、零跨市場劫持、零台股用語洩漏至美股、美股可亮綠燈與 `AI BULLISH`、Zero-Mock 零洩漏、`TASK_1~5` 點擊切換暢通）。
- [ ] 全站 `ergonomicTypographyGuardrail` 與 `aiForceGlossary` 詞條覆蓋率門禁 100% 通過（0 處 `< 0.75rem`、0 處缺失 `termId`）。
- [ ] `npm test` 100% 全綠且 `npm run build` 0 TypeScript / 打包錯誤。
- [ ] `CONTEXT.md` 新增 Spec 0239 四大領域術語並正式建立 `docs/adr/0239-...md` 記錄雙市場對等架構與關鍵權衡決策。
