# 03 — 超大池快取優先與模擬種子日 K 防 429 屏障

**Parent:** #395

**What to build:**
在 `useMuscleBookerSync.ts` 中優化超大池 (>150 檔) 的載入策略，未命中本地快取時由 `generateSyntheticCandles` 毫秒級瞬間排定四大象限，保障 0 延遲零白屏；背景啟動受控並發（3 並發、60ms 節流）增量水合，杜絕 429 限流與瀏覽器卡死。

**Blocked by:** 01 — 美股四大指數與台股全量成分庫實體化及選池擴展, 02 — 蘋果系統美學三層式卡片排版重構 (MuscleStockCard)

**Status:** ready-for-agent

## Acceptance Criteria
- [x] 切換至台股全量 (~2,285 檔) 時瞬間渲染四象限，無白屏與無卡頓。
- [x] 背景水合進度條平順遞增，切換觀察池時能即時中斷舊任務。
- [x] 全案 271 個測試套件、2,018 項單元測試 100% 通過。
- [x] 本地生產打包構建成功 (0 TypeScript 錯誤)。

