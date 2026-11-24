# ADR 0244: 主力戰情室 Layer 6 雙界限 2×2 拓撲、Card 20 12 期配息無滑軌展開暨 ZONE 04 非對稱等高佈局

- **狀態 (Status)**: Accepted
- **日期 (Date)**: 2026-11-24
- **關聯規格與 Issue**: [Spec 0244](../specs/0244-war-room-layout-topology-and-etf-dividend-grid-spec.md) / GitHub Issue `#603`

## 背景 (Context)

在主力戰情室（Main Force War Room）中，三處容器在主流 1440px–1920px 桌面視窗出現資訊層級與空間浪費缺陷：
1. **Layer 6**：`repeat(auto-fit, minmax(440px, 1fr))` 在 $\ge 1344\text{px}$ 自動排為 3 欄，使 4 張卡片產生 3+1 孤兒列（第二列 66% 空洞），且核心決策卡 `12`/`21` 未置於第一排。
2. **Card 20**：ETF 配息區塊外層使用 `justifyContent: 'center'` 在 Layer 4 等高拉伸容器內產生上下死區，同時內層 `maxHeight: '190px'` 硬截斷 12 期（4 欄 × 3 列）配息強制出現滑軌。
3. **ZONE 04 (Layer 7)**：右欄 `16`/`17` 橫向並排壓縮圓環與文字空間；左欄 `15`/`09` 1:1 均分高度，若右欄拉高將導致緊湊卡片 `15` 產生空白帶。

## 決策 (Decision)

1. **Dual-Bound 2×2 Decision Matrix (Layer 6 雙界限 2×2 決策矩陣)**：
   - 以零 Media Query 單行 CSS 函數 `repeat(auto-fit, minmax(min(100%, max(440px, calc(50% - 12px))), 1fr))` 鎖定桌面最大 2 欄、窄螢幕（$< 900\text{px}$）自動降級 1 欄且於 `< 440px` 行動端零水平溢出。
   - 卡片 DOM 次序固定為 `12`（主力動態）→ `21`（估值矩陣）→ `10·13`（AI 多空 × 市場情緒）→ `14`（AI 信心維度）。
2. **Top-Anchored 12-Period Dividend Expansion & Overflow Guard (Card 20 貼頂 12 期免滑軌與溢位護欄)**：
   - 外層配息區塊改為 `justifyContent: 'flex-start'` 回收上下死區。
   - 以 12 期（4×3 網格）為分界：$\le 12$ 期完全解除 `maxHeight` 與 `overflowY` 無滑軌全展開；$> 12$ 期（如月配息 ETF）自動啟用 `maxHeight: '288px'` 與 `overflowY: 'auto'` 防止撐爆 Layer 4 整列。
3. **Asymmetric Flush-Bottom Dual-Column Matrix (ZONE 04 非對稱等高雙欄矩陣)**：
   - 右欄移除 `16`/`17` 雙欄並排子網格，改為 `11 → 16 → 17` 全寬單欄垂直堆疊。
   - 左欄 `15` 鎖定自然高度 (`flex: 0 0 auto`)，由內建 5 條均分進度條之 `09` 獨佔剩餘高度 (`flex: 1`) 上下拉高與右欄底緣切齊。

## 後果 (Consequences)

- **正向效益**：零新增依賴（0 KB bundle 增量），消除 33% 網格空槽與 12 期配息巢狀捲軸，並透過 `AiForceDashboardView.test.tsx` 與 `MonthlyRevenueCard.test.ts` 既有測試縫隙鎖定不變量。
- **權衡**：月配息 ETF（$> 12$ 期）仍維持 3 列可視區配捲動條，以保護 Layer 4 同列卡片（`08`、`19`）不被無限拉伸。
