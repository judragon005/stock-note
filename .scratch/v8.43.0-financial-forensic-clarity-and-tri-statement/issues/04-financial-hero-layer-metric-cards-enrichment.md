# 04 — Financial Hero Layer Metric Cards Enrichment

**What to build:**
升級 `src/components/financial/FinancialHeroLayer.tsx`。
消除四大體質卡片抽象空泛痛點，直接內嵌最新季度核心數值指標：

1. **獲利能力卡片**：內嵌最新季毛利率、ROE 與三率擴張/收縮趨勢。
2. **安全性卡片**：內嵌最新季負債比、速動比與真實淨現金水位。
3. **營運效率卡片**：內嵌最新季應收帳款週轉天數 DSO 與現金轉換週期 CCC。
4. **現金流卡片**：內嵌最新季營運現金流 CFO 與自由現金流 FCF 金額。
5. **0 秒操盤戰報橫幅**：結構化呈現【操盤定調】徽章、【核心矛盾】與【操盤方針】。
6. 單元測試 `FinancialHeroLayer.test.ts` 綠燈相容。

**Blocked by:** 03-financial-trends-layer-y-axis-and-values.md

**Status:** done

- [x] 四大體質卡片內嵌最新財務關鍵指標數值
- [x] 0 秒戰報橫幅結構化呈現操盤定調與具體方針
- [x] 單元測試 `FinancialHeroLayer.test.ts` 綠燈
