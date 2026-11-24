# 12 — 本機湖倉實機缺口自癒驗收、全量回歸測試與 ADR 0246／領域文件同步

**Parent:** #607 (Spec 0246)

**What to build:** 對本機 SQLite 湖倉執行受控追趕自癒實機驗證，確認近 30 日遺漏之台股交易日（含 11/20、11/23 及週五／週一斷層缺口）全數自動補齊歸零；執行全專案測試與型別建置驗證；並同步落盤 Spec 0246 規格書、ADR 0246 架構決策紀錄、領域詞彙表（新增三項術語）與專案交接文件。

**Blocked by:** 05 — NAS 24/7 自治排程器分軌獨立水位線狀態機與 /healthz 遙測擴充、09 — 靜態 JSON 市場快取正式退場與架構適應度靜態守門強化 (Contract)、11 — 主力戰情室 Card 01 盤中真實量價縫合與 Spec 0245 零量防禦相容驗證

**Status:** done

- [x] 本機湖倉執行單一調諧中樞近 30 日追趕自癒後，台股日線與籌碼近 30 日缺口歸零（11/20、11/23 及既有週五／週一斷層全數補齊）
- [x] 全專案 `npm test` 100% 通過且 `npm run build` TypeScript 0 錯誤
- [x] 同步建檔 Spec 0246 規格文件與 ADR 0246 架構決策文件
- [x] 領域脈絡文件同步新增 `Gap-Set Lakehouse Reconciliation`、`Per-Lane Watermark Convergence`、`SQLite-Only Sync Telemetry SSOT` 三項術語並更新交接文檔
