# Ticket 03: 大類資產再平衡、股息活水轉向與質押降槓桿瀑布流

**State:** CLOSED  
**Parent:** #472 (Spec 0221)  

## What to build
1. 於 `src/engine/rebalancingEngine.ts` 擴充 `calculateAssetClassRebalancePlan`：
   - 支援大類資產維度（`'ASSET_CLASS'`）注水再平衡與偏離度計算。
   - 實作「增量股息活水轉向（Dividend-Redirect）」模式，高股息 ETF 存量不動，將預估現金股息導流買進低配之純公債或黃金。
   - 支援股票質押借款（`LoanRecord`）償還試算與四階減碼瀑布流（衛星股優先 ➔ 主動 ETF ➔ 保護已設質與長線核心）。

## Acceptance criteria
- [x] 正確計算高股息存量不動下，以增量股息達成再平衡之目標配置金額。
- [x] 當使用者有質押借款且股票超配時，優先輸出還款降槓桿建議並保護 `lockedShares` 設質股數。
