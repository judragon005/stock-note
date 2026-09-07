# 產品需求規格說明書 (PRD): 樹狀圖納入借款與負債槓桿視覺化 (#0072)

## Problem Statement

目前系統在「資產配置與持倉分佈」工作台中，樹狀圖 (Treemap) 與權重清單僅能呈現「股票持股」與「現金儲備」，無法呈現投資人的「借款與負債 (Loans & Liabilities)」部位。
對於使用股票質押借款、信用貸款或融資槓桿的投資人，樹狀圖呈現的是一個「無負債假象」的純資產視圖：
1. 投資人無法第一時間感知當前持倉中有多少資金來自借貸槓桿，難以直觀評估資產面臨回檔時的財務脆弱性；
2. 借款與槓桿資訊深埋於次級卡片或彈窗中，在最具視覺衝擊力的樹狀圖第一屏缺席；
3. 權重清單與頂部比例條缺乏負債比 (LTV) 指標，割裂了資產與負債的資本結構全貌。

## Solution

在「資產配置與持倉分佈」模組中全面整合借款與負債維度：
1. **動態借款節點注入**：當帳戶存在有效借款（總負債金額 $> 0$）時，自動將借款負債以專屬節點注入 Squarified Treemap 面積計算，以正數幾何面積直觀呈現負債相對於總資產的份量；
2. **視覺語意分離與警示配色**：借款節點採用專屬琥珀金/負債警示風格，與持股盈虧色（紅/綠）及現金中性灰藍清晰區隔，並標註負債金額與借款成本；
3. **Tooltip 借款細項展開**：懸浮於借款節點時，動態展示整戶借款總額、加權平均借款利率與各筆借款合約明細；
4. **權重清單與 LTV 膠囊連動**：切換至「權重清單」視圖時同步展現借款項目，並於頂部市場配置條右側動態呈現「負債比 LTV」警示膠囊，當無借款時自動隱藏。

## User Stories

1. As an active investor utilizing stock pledge loans, I want to see a dedicated debt block in the Treemap, so that I can instantly grasp how much of my portfolio is funded by leverage.
2. As a leveraged investor, I want the debt block in the Treemap to show my total debt principal and accrued interest, so that I have complete visibility into my total repayment obligations.
3. As a user viewing the Treemap, I want the debt tile to have a distinctive amber/warning appearance with clear negative/borrowing semantics, so that I do not mistake it for an equity holding or a cash asset.
4. As a cash-and-carry or conservative investor with zero loans, I want the Treemap to omit the debt block completely, so that my screen remains uncluttered and 100% focused on pure stock and cash assets.
5. As an investor with multiple loans (e.g. pledge loan + credit loan), I want hovering on the debt tile to display an informative tooltip breaking down each contract's principal, interest rate, and pledge status, so that I can understand my debt composition without navigating away.
6. As a user switching to the "Weight Bars (權重清單)" view, I want to see the loan debt item listed alongside stocks and cash, so that I can compare its relative percentage in tabular form.
7. As an investor monitoring risk, I want to see a real-time "LTV / 負債比" capsule badge next to the 3-way market allocation bar, so that I immediately know my debt-to-asset ratio.
8. As a user switching between Taiwan and International color themes, I want the debt tile's styling to remain consistently legible and distinct from both profit and loss hues, so that visual clarity is maintained across themes.
9. As an investor filtering by market (TW vs US), I want the debt tile and LTV capsule to respect the active market filter, so that US margin debt or TW pledge debt is correctly isolated according to the selected view.
10. As a mobile and small-screen user, I want the debt tile text layout to adjust gracefully, showing concise labels (e.g. `🏦 借貸` and amount) without visual clipping or overlapping.

## Implementation Decisions

### 1. Modules and Interfaces
- **Visualization Container**: The main asset allocation workspace will accept loan data (either loan records array or aggregated debt metrics) alongside existing holdings, exchange rate, and cash balance props.
- **Treemap Rendering Engine**:
  - The Treemap item definition will support an additional item type/market identifier for debt (e.g. `DEBT` / `id: 'DEBT_TWD'`).
  - The calculation pipeline will compute the debt node's area using the aggregated debt amount, normalized against total portfolio assets.
  - The color mapper will map debt nodes to an amber/golden warning hue (`rgba(245, 158, 11, 0.85)` / `#f59e0b`) with contrasting border (`#d97706`).
  - Text formatting within the SVG tile will present the debt icon, title, total debt amount in base currency, and an indicator of borrowing cost.
- **Top HUD & Progress Bar**:
  - The 3-way market allocation bar (Taiwan / US / Cash) will remain strictly based on asset categories to ensure mathematical normalization to 100%.
  - An auxiliary badge (`🏦 負債比 LTV: XX.X%`) will be injected into the summary HUD when total debt $> 0$, styled with amber accents to highlight leverage levels.
- **Weight Bars List**:
  - The sorted list items will include the debt entry when total debt $> 0$, sorted by absolute monetary value alongside individual holdings and cash.

### 2. Architectural & Accounting Model
- **Capital Employed Model**: The Treemap tile represents the capital structure composition. Since a Treemap requires positive bounding areas ($\text{area} > 0$), debt magnitude $|\text{Debt}|$ is represented as a proportional tile.
- **Zero & Negative Protection**: If total debt is zero or negative (e.g. fully paid off), the node is completely omitted from both the Treemap layout array and the weight list.

## Testing Decisions

- **Test Seam**:
  - The primary test seam is the component and layout level interface: verifying that passing active holdings, cash balance, and loan records/debt amounts into the allocation and treemap modules results in:
    1. Correct injection of the `DEBT_TWD` node with exact mathematical weight.
    2. Proper omission of the debt node when debt is 0 or absent.
    3. Correct tooltip content and amber color palette assignment.
    4. Accurate LTV badge display in the HUD.
- **External Behavior Focus**: Tests will assert DOM and SVG element existence, text values, computed percentages, and color classes/styles rather than internal intermediate variable states.
- **Prior Art**: Follow the patterns established in `src/utils/treemap.test.ts` (unit tests for cash node injection and squarified layout) and `src/engine/riskExposureEngine.test.ts` (test cases for zero-debt vs active pledge loans).

## Out of Scope

- Inline repayment or borrowing actions inside the Treemap tooltip (repayments remain managed via the Cash Ledger & Debt Workspace).
- Changing the underlying Squarified Treemap partition algorithm to support negative numbers (mathematically impossible in 2D Euclidean geometry).
- Automatic rebalancing simulations involving mandatory debt deleveraging (handled separately in the Rebalancing workspace).

## Further Notes

- Cross-references:
  - [ADR-0072: 樹狀圖納入借款與負債槓桿視覺化架構](file:///d:/APP/股票紀錄/docs/adr/0072-treemap-debt-and-leverage-visualization.md)
  - [ADR-0066: 樹狀圖納入現金部位與總資產權重統一架構](file:///d:/APP/股票紀錄/docs/adr/0066-treemap-cash-position-and-portfolio-weight-unification.md)
  - [ADR-0037: 整戶總曝險與淨槓桿率風控體系](file:///d:/APP/股票紀錄/docs/adr/0037-portfolio-leverage-exposure-and-margin-stress-testing.md)
