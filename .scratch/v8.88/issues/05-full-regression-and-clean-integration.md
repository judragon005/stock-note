# 05 — 全量回歸驗證、滿高容器防禦與文檔/ADR 同步

**Parent Issue:** #214

**What to build:**
完成 Card 18 終極整合驗收與防禦性校驗：
1. **滿高佈局防禦 (Layout Defense)**：
   - 驗證 Card 18 於第 7 層滿高容器（~480px）中，所有新舊區塊（頂部標題、光譜條、核心看板、語意解析、操盤指引、膠囊、AI結論）緊湊等高分佈。
   - 杜絕捲軸溢出、容器邊界踩踏或文字疊合。
2. **單元測試全量覆蓋 (TDD & Full Regression)**：
   - 執行 `npm test src/components/aiForceDashboard/cards/MainForceVerdictCard.test.ts`，達到 100% 通過。
   - 執行全專案 `npm test` 與 `npm run build`，確保 TypeScript 0 錯誤。
3. **文檔與知識庫同步 (Documentation Sync)**：
   - 建立 `docs/adr/0176-card18-verdict-playbook-and-color-spectrum.md`。
   - 同步更新 `CONTEXT.md` 領域詞彙（新增 5 態作戰光譜、三軌色彩認知、Invalidation Gate 等定義）。

**Blocked by:**
- 01 — 核心三軌色彩認知體系重構、燈號邏輯校正與指標膠囊正則修復
- 02 — 5 態主力作戰光譜圖例條 (Micro Spectrum Bar) 與懸停微交互 (方案 A)
- 03 — 中央留白荒漠重塑：語意微觀解析 (Market Context) 與四方實戰操盤指引 (Action Playbook)
- 04 — 量化研判深度彈窗指南升級 (Modal Deep-Dive) 與流動性合規門檻 (方案 B)

**Status:** ready-for-agent

- [x] `npm test src/components/aiForceDashboard/cards/MainForceVerdictCard.test.ts` 100% 通過。
- [x] `npm test` 與 `npm run build` 全綠燈通過。
- [x] Card 18 在滿高佈局中渲染完整、無破版。
- [x] ADR 0176 與 `CONTEXT.md` 完成同步。
