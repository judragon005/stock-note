# 01 — AiForceDashboardView 階層結構重組與 Layer 7/8 容器分拆

**What to build:**
重構 `src/components/aiForceDashboard/AiForceDashboardView.tsx` 中的綜合任務視圖排版：
1. 將原 `data-layer="7-verdict-command"` 三欄並列結構拆解為兩大獨立層級：
   - `data-layer="7-chips-health-matrix"`：改為雙欄自適應對稱網格（左側為 15 籌碼摘要 + 09 隔日沖風險；右側為 11 健康度綜合評估 + 16 買賣力分布與 17 多空強度分布）。
   - `data-layer="8-main-force-verdict-deck"`：100% 滿版獨立展開 Card 18（主力追蹤總評判），如同頂部 Card 01 享有大視野。
2. 同步更新 `src/components/aiForceDashboard/AiForceDashboardView.test.tsx` 斷言：
   - 驗證 `data-layer="7-chips-health-matrix"` 與 `data-layer="8-main-force-verdict-deck"` 順序正確。
   - 驗證 Card 18 獨立於滿版 Deck 中。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `AiForceDashboardView.tsx` 建立 `data-layer="7-chips-health-matrix"` 雙欄排版（左欄 15+09，右欄 11+16+17）。
- [ ] `AiForceDashboardView.tsx` 建立 `data-layer="8-main-force-verdict-deck"` 100% 滿版獨立列容納 Card 18。
- [ ] `AiForceDashboardView.test.tsx` 更新層級階層斷言並確保 100% 測試綠燈。

