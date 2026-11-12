# 04 — 第一鏡頭羅盤卡片測試瘦身與獨立收斂

**What to build:** 將 `src/components/zavy/ZavyMacroCompassCard.test.tsx` 中跨元件之多餘測試移出，僅保留專門針對第一鏡頭總經三級週期羅盤之單元測試，達成單一測試職責。

**Blocked by:** 02 — 信用雷達風險標籤繁中化適配器與 Markdown 導出整合

**Status:** ready-for-agent

- [x] 從 `ZavyMacroCompassCard.test.tsx` 移出工作區導覽、第二鏡頭與第三鏡頭卡片之測試
- [x] 僅保留驗證羅盤無資料時誠實呈現 `--`、有資料時如實呈現真實百分比與小車三態之測試
- [x] 確保 `ZavyMacroCompassCard.test.tsx` 單獨執行 100% 通過
