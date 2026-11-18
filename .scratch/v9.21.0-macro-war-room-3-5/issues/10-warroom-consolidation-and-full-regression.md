# 10 — 主戰情室容器瘦身收斂與全量端對端回歸驗收

**Parent:** #584 (Spec 0235)

**What to build:** 完成 `WarRoomWorkspace.tsx` 組合式重構，將行數由 2,266 行收斂至 $\le 600$ 行，清除所有未使用 import 與死代碼；同步更新 `CONTEXT.md` 領域詞彙與 `docs/adr/` 決策紀錄；執行全量單元/元件/E2E 測試 (`npm test`) 與 `npm run build` 驗證零錯誤綠燈。

**Blocked by:** 03, 04, 05, 06, 07, 08, 09

**Status:** ready-for-agent

- [ ] `WarRoomWorkspace.tsx` 行數 $\le 600$ 行，無任何重複渲染或死代碼
- [ ] `CONTEXT.md` 與 `docs/adr/` 同步反映宏觀戰情室 3.5 架構與統一數據總線決策
- [ ] `npm test` 100% 通過且 `npm run build` 零 TypeScript / Vite 錯誤
