# 02 — KPI 股利總額卡片支援「券商對帳 (毛額)」與「存摺入帳 (淨額)」雙軌切換

**What to build:**
在當年度實領股息 KPI 卡片頂部提供「券商對帳 (應發毛額)」與「存摺入帳 (實領淨額)」切換 Toggle。切換至「券商對帳口徑」時，大字呈現該年度應發毛額（例如 NT$ 624,587），副標呈現實領淨額與稅費，完美對齊券商 APP「累積現金股利」；切換至「存摺入帳口徑」時，大字呈現實領淨額（例如 NT$ 614,984），消除使用者拿手機 APP 對帳時的認知障礙。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 在 `DividendLogView.tsx` 擴充 `dividendDisplayMode: 'GROSS' | 'NET'` 狀態
- [ ] 於卡片 1 提供微型切換按鈕 `[券商對帳(毛額)] / [存摺入帳(實領)]`
- [ ] 依模式動態切換大字呈現 `currentYearGrossTWD` 或 `currentYearDividendsTWD`
- [ ] 搭配 Tooltip 提供詳細會計定義說明
