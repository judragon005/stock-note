# 13 — 升級遠端 CI 流水線與本地推送守門為全端免疫閘門 (Full-Stack CI Immunity Gate)

**Parent:** #609 (Spec 0247)

**What to build:** 將後端統一測試、正式編譯建置與全量文檔完整性守門接入遠端 CI 流水線與本地推送守門。

**Blocked by:** 11, 12

**Status:** done

- [x] 遠端 CI 強制執行 `tsc --noEmit`、`npm test`、`npm run test:backend`、`npm run build` 與 `npm run lint:docs`
- [x] 本地推送守門同步納入 `npm run test:backend`
