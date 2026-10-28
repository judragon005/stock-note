# 0206 ADR: 資產成長與單位淨值會計及量化風控引擎架構決策 (Portfolio NAV Unitized Accounting and Quantitative Risk Engine)

## 狀態 (Status)

* **狀態：** `APPROVED`
* **決策日期：** 2026-10-28
* **關聯 Issue：** #338
* **對應規格書：** [`docs/specs/0206-portfolio-nav-unitized-accounting-and-quant-risk-engine-spec.md`](file:///d:/APP/股票紀錄/docs/specs/0206-portfolio-nav-unitized-accounting-and-quant-risk-engine-spec.md)

---

## 脈絡與問題陳述 (Context & Problem Statement)

專案現有「資產成長 (NAV)」頁面存在金融會計與計量模型失真問題：
1. **出入金污染**：直接拿總資產金額計算每日收益率，將外部本金進出當作投資獲利/虧損，製造假性回撤與虛胖波動度。
2. **時間除數錯位 (Days/252)**：日曆天長度被誤除以 252 交易日，導致年化複合報酬率 (CAGR) 與夏普比率被閹割 30% 以上。
3. **基準假數據與斷頭**：SPY 2025/2026 年為手動捏造數字，0050 與加權指數斷頭於 9 月初，本地 SQLite 湖倉管線被架空。
4. **實戰工具缺失**：缺少水下回撤圖 (Underwater)、當前回撤深度、索提諾比率 (Sortino) 以及 AUM/Unit NAV 雙模切換。

---

## 決策結果 (Decision Outcome)

採納以下極簡與高防禦性解法（遵循 KISS 原則）：

1. **堅決不引入外部圖表庫**：維持 `package.json` 極簡零依賴，優化手寫原生向量 SVG，零額外套件負擔。
2. **引入華爾街 GIPS 單位淨值法 (Unit NAV)**：初始淨值定為 100.00，外部出入金僅增減份額，單位淨值維持不變，徹底隔離外部金流干擾。
3. **校準時間除數與除息平滑**：日曆天序列年數採用 `days / 365.25`，注入應收股利 (`receivableDividends`) 撫平除息空窗期假凹洞。
4. **直連本地 SQLite 湖倉**：大盤基準全面打通 `/api/market/history/`，清理人造假常數，動態注入美債/台幣市場無風險利率。
5. **雙模視圖與實戰水下圖**：提供 AUM 金額模式與 Unit NAV 淨值模式一鍵切換，整合原生向量 SVG 水下回撤圖與 Sortino 下行防禦指標。
