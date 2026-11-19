# 12 — Contract & Verify：全戰情室 AST 零微字守門員測試與實庫回歸驗收

**Parent:** #590 (Spec 0238)
**What to build:** 建立自動化守門員測試掃描 `src/components/aiForceDashboard/` 全部組件，強制斷言 `< 12px` 微字級為 `0` 處、`#64748b` 低對比文字為 `0` 處、含文字 SVG 無 `preserveAspectRatio="none"` 扭曲；同步執行 `0050` / `2330` 本地湖倉實測與全套 `npm test` + `npm run build` 綠燈收斂，並更新 `CONTEXT.md` 與 `docs/adr/0238-*.md`。
**Blocked by:** 02, 07, 08, 09, 10, 11
**Status:** ready-for-agent

- [ ] 自動化守門員測試掃描 `src/components/aiForceDashboard/` 通過（0 微字、0 低對比暗灰字、0 SVG 文字拉伸）。
- [ ] `npm test` 100% 通過、`npm run build` 0 錯誤。
- [ ] 同步補全 `CONTEXT.md` 三大領域術語與 `docs/adr/0238-*.md`。
