# 06 — 拆分建立獨立之第二鏡頭市場寬度測試檔 (ZavyMarketBreadthCard.test.tsx)

**What to build:** 建立 `src/components/zavy/ZavyMarketBreadthCard.test.tsx` 獨立測試檔，專責驗證第二鏡頭市場寬度 20/60/200MA、融資去槓桿比率、落底四要件檢核表與 TermTooltip 掛載。

**Blocked by:** 03 — Zavy 工作區渲染層拔除 inline 計算改委託純函式

**Status:** ready-for-agent

- [x] 建立 `src/components/zavy/ZavyMarketBreadthCard.test.tsx`
- [x] 驗證多週期市場寬度 (20/60/200MA) 數值與 TermTooltip 屬性
- [x] 驗證融資減幅、大盤跌幅、去槓桿比率與充分性提示
- [x] 驗證落底檢核四要件、落底確認評分與解讀結論橫幅
- [x] 確保單元測試獨立執行綠燈
