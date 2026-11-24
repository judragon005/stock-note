# 07 — 主力戰情室 ZONE 01 雙向聯動整合（Card 18 → Card 01 → Card 01B）與 ADR 0244 防回歸

**Parent:** #605 (Spec 0245)

**What to build:** 在主力戰情室綜合視圖容器提升 `timeframe` 與 `subchartMode` 受控狀態，將 `Card 01B` 掛載於 `Card 01 主 K 線圖` 正下方以原地升級原本重複之單行摘要帶槽位，達成 `Card 01` 與 `Card 01B` 雙向時框／副圖即時聯動；切換標的時狀態自動對齊，且維持 Zero-Mock 待命閘門、`'21 模組'` 導覽契約與 ADR 0244 既有 Layer 4/6/7 佈局零回歸。

**Blocked by:** 05 — Card 01 主 K 線圖補齊 J 線／查價列與受控時框／副圖雙向同步介面, 06 — Card 01B 四維量價動能共鳴解碼卡元件（響應式四宮格 + 副圖點擊聯動 + 字級護欄）

**Status:** ready-for-agent

- [ ] ZONE 01 渲染次序嚴格為 `Card 18 主力司令台` → `Card 01 主 K 線圖` → `Card 01B 四維量價動能共鳴解碼卡`（位於 ZONE 02 之前）
- [ ] 切換主圖 `日K / 週K / 月K` 時 `Card 01B` 立即同步重算對應時框數據；點擊 `Card 01B` 任一診斷磚時主圖副圖即時切換
- [ ] `isDataPending` 或載入中嚴格隱藏 `Card 01B`，徹底落實 Zero-Mock 防護閘門
- [ ] 既有主力戰情室視圖測試套件（含 Spec 0237 `executive-verdict-strip`、`'21 模組'`、字級底線與 ADR 0244 Layer 6 / ZONE 04 不變量）100% 綠燈通過
