# ADR-0045: 淨槓桿零負債現貨保護機制與被動收入各項利息獨立膠囊展示

- **狀態**：`ACCEPTED`
- **日期**：2026-08-28
- **決策者**：AI Agent (Antigravity), 使用者
- **關聯 PRD**：[PRD #0045](../../docs/specs/0045-risk-leverage-zero-debt-fix-and-passive-income-badges.md)
- **關聯 Issue**：[Issue #0045](../../.scratch/v5.7.4-risk-leverage-zero-debt-fix-and-passive-income-badges/issues/issue-0045.md)

---

## 1. 背景與問題 (Context)

1. **美股現貨無槓桿卻誤判 99.99x 極度危險**：
   - 使用者在美股僅買入現貨（Spot trade，如 VT），且帳戶無任何借貸負債（`loans` 為空）。
   - 因尚未在現金帳本中手動補登入金（Deposit），導致現金餘額呈現負數；在舊版計算中，當淨資產 $\text{NAV} \le 0$ 時，系統將其無條件判定為資不抵債並硬編碼為 `99.99x` 與 `HIGH_RISK`（極度危險）。
   - 此外，全戶槓桿計算在切換至單一市場視圖時，未隔離該市場的持股與現金餘額。
2. **被動收入卡片缺乏各項利息之獨立膠囊**：
   - 右上角「累計股息收益」卡片僅統計股票之現金股利，未納入現金帳本中已交割的各項利息收入（如活存利息、借券收益、美債利息）。
   - 使用者需要：主數字顯示被動收益總額（股息 + 利息），且下方以獨立膠囊（像美股預扣稅那樣）個別分開呈現，不混在一起。

---

## 2. 架構決策 (Decision)

1. **零負債現貨保護機制 (Zero-Debt Spot Protection)**：
   - 在 `src/engine/riskExposureEngine.ts` 中新增零負債判定：
     - 若 $\text{totalDebtTWD} \le 0$：
       - 若現金餘額 $\le 0$（未補登入金），將淨資產視為現貨股票足額持有市值（$\text{NAV} = \text{totalStockValue}$），槓桿固定為 `1.00x`，風險等級為 `CONSERVATIVE`（穩健無槓桿）。
       - 若現金餘額 $> 0$，正常計算槓桿（$\le 1.00x$）。
     - 若 $\text{totalDebtTWD} > 0$ 且 $\text{NAV} \le 0$：維持 `99.99x` 與 `HIGH_RISK` 資不抵債警告。
2. **市場範圍隔離 (Market Scoping)**：
   - 在 `App.tsx` 中依照 `currentMarket` 隔離 `holdings`、`cashBalances`（美股僅取 USD、台股僅取 TWD、ALL 取折算 TWD）與 `loans`。
3. **各項利息聚合與獨立膠囊體系 (Multi-Interest Aggregator & Badges)**：
   - 在 `src/engine/cashLedgerEngine.ts` 中提供 `aggregateInterestIncomeDetails`，依備註/項目名稱與幣別分組統計。
   - `SummaryCards.tsx` 主數字顯示「被動收入總額 (股息 + 利息)」，下方以 Cyan 獨立膠囊（`💵 {name} +{symbol}{amount} {currency}`）個別展示，與減資退款、二代健保、美股預扣 30% 膠囊和諧共存。

---

## 3. 結果與影響 (Consequences)

### 正面效益
- **消弭誤判**：現貨投資者不再面臨驚悚的 99.99x 極度危險警告，系統風險評估更加可信。
- **被動收入視圖完整**：活存利息、借券收益等皆清晰分類獨立展示，滿足全方位被動現金流追蹤需求。
- **測試覆蓋**：全專案 14 個測試套件、202 個單元測試 100% 通過，打包 0 錯誤。

### 潛在權衡
- 若使用者後續新增真實借貸/質押（`loans` 有資料），系統會自動無縫切換為真實借貸曝險與維持率追蹤模型。
