# 需求規格說明書 #0035：多批次沖銷會計與稅務最佳化沖銷系統 (Lot-based Accounting & Tax-Loss Harvesting System)

- **版本**：v5.3
- **狀態**：`READY_FOR_DEV`
- **建立日期**：2026-08-27
- **關聯技術債**：[docs/debts/0008-lot-based-accounting-and-tax-loss-harvesting.md](../debts/0008-lot-based-accounting-and-tax-loss-harvesting.md)

---

## 1. 執行摘要 (Executive Summary)

本模組旨在為股票資產管理系統建立標準金融級的**多批次沖銷會計引擎 (Lot-based Accounting Engine)** 與 **稅務最佳化沖銷工具 (Tax-Loss Harvesting Tools)**。

支援五大會計沖銷法則（移動加權平均、先進先出、後進先出、最高成本先出、指定批次沖銷），並具備全生命週期的公司行動（股票分割、除權配股、現金減資）等比分攤與成本稀釋演算法。

在使用者體驗 (UI/UX) 上，**所有專業金融術語均附帶繁體中文名稱，並全面配置「懸停即時說明浮窗 (Hover Tooltips)」**，讓使用者在操作任何沖銷模式、批次明細或節稅試算時，滑鼠移上去即可立即獲得通俗清晰的定義與稅務意義。

---

## 2. 專業名詞雙語與懸停說明對照表 (Terminology & Tooltips Dictionary)

本系統所有介面元素必須嚴格遵循以下中英雙語及懸停說明文案規範：

| 英文術語 | 繁體中文名稱 | 介面顯示格式 | 懸停即時說明浮窗內容 (Tooltip Text) |
| :--- | :--- | :--- | :--- |
| **Tax Lot / Lot** | 獨立買進批次 | `買進批次 (Lot)` | 每一次獨立買進股票所產生的批次記錄，包含買入日期、股數、單價與手續費成本基準。 |
| **Accounting Method** | 沖銷會計方法 | `沖銷會計方法` | 決定當您部分賣出股票時，系統優先扣除哪一筆買進批次以計算已實現損益與稅負的演算法規則。 |
| **Moving Average** | 移動加權平均法 | `移動加權平均 (Moving Avg)` | 將所有在庫買進批次的成本合併池化，以總成本除以總股數計算出單一平均每股成本。為台灣券商最常見之預設模式。 |
| **FIFO** | 先進先出法 | `先進先出 (FIFO)` | 優先賣出「買進日期最早」的批次。為美國國稅局 (IRS) 與多國官方稅務申報之預設標準，有助於讓早期部位先達到長期持有低稅率門檻。 |
| **LIFO** | 後進先出法 | `後進先出 (LIFO)` | 優先賣出「買進日期最新」的批次。在股價持續上漲的通膨環境下，可先沖銷近期高價買進部位，延後舊有低成本部位的資本利得稅。 |
| **HIFO** | 最高成本先出法 | `最高成本先出 (HIFO)` | 優先賣出「每股買進成本最高」的批次。能最大化當期已實現虧損（或最小化獲利），為節稅沖銷 (Tax-Loss Harvesting) 的核心首選策略。 |
| **Specific Lot** | 指定批次沖銷 | `指定批次 (Specific Lot)` | 允許投資人於賣出時自行手動勾選欲出脫的特定買進批次與股數，精準掌控單筆波段策略之盈虧與稅務歸因。 |
| **Tax-Loss Harvesting**| 稅務虧損收割 / 節稅沖銷 | `節稅沖銷 (Tax-Loss Harvesting)` | 藉由主動賣出處於帳面虧損（或高成本）的批次來實現資本損失，用以抵扣同年度其他投資獲利，達到合法減少應繳資本利得稅的最佳化策略。 |
| **Disposal Match** | 沖銷配對歸因 | `沖銷配對歸因` | 紀錄每一次賣出交易具體消耗了哪一個買進批次、扣除股數、各別成本、變現淨額與該批次獨立損益的完整追蹤軌跡。 |
| **Short-Term Capital Gain** | 短期資本利得 | `短期資本利得 (< 1年)` | 買進至賣出持有時間未滿 365 天之投資收益。在美股稅制下通常適用較高的普通所得稅率。 |
| **Long-Term Capital Gain** | 長期資本利得 | `長期資本利得 (≥ 1年)` | 買進至賣出持有時間達到或超過 365 天之投資收益。在美股稅制下通常享有 0%、15% 或 20% 之優惠資本利得稅率。 |
| **Holding Days** | 部位持有天數 | `持有天數 (Days)` | 自買進成交日 (Buy Date) 計算至賣出成交日 (Sell Date) 或當前基準日之實際自然日天數。 |
| **Cost Basis** | 成本基準 | `成本基準 (Cost Basis)` | 該批次原始買進總金額加上分攤手續費，並經除權息、股票分割或減資調整後之真實稅務出資成本。 |

---

## 3. 功能架構與演算法規格 (Functional & Algorithm Specs)

### 3.1 五大沖銷會計法則引擎 (`src/engine/lotEngine.ts`)

系統在時序歷程中依序處理交易流 (`TradeRecord[]`)：

1. **建立 Lot (`BUY` / `CAPITAL_INCREASE`)**：
   - 產生唯一 `TaxLot`，初始化 `remainingShares = trade.shares`，`totalCostBasis = trade.shares * trade.price + trade.fee`，`unitCost = totalCostBasis / remainingShares`。
2. **公司行動等比調整**：
   - **股票分割 (`STOCK_SPLIT`)**：
     - 若分割比例為 $R$，所有在基準日前已存在且 `remainingShares > 0` 的 Lot：
       $$\text{remainingShares}' = \text{remainingShares} \times R$$
       $$\text{unitCost}' = \frac{\text{unitCost}}{R}$$
       總成本基準 $\text{totalCostBasis}$ 嚴格保持不變。
   - **除權配股 (`STOCK_DIVIDEND`)**：
     - 若配股率為 $r$，各 Lot 股數依比例增加 $\text{remainingShares} \times r$，單股成本調降為 $\frac{\text{unitCost}}{1 + r}$。
   - **現金減資 (`CAPITAL_REDUCTION`)**：
     - 縮減股數依減資比例 $r_c$ 扣減，退還現金依股數權重分攤扣抵該 Lot 之 $\text{totalCostBasis}$。若單一 Lot 退款超出成本，溢出款項記為該 Lot 當期已實現利得，Lot 成本降為 0。
3. **賣出沖銷 (`SELL`)**：
   - 依選定之 `AccountingMethod` 對在庫可用 Lots 排序：
     - `FIFO`：`buyDate ASC, createdAt ASC`
     - `LIFO`：`buyDate DESC, createdAt DESC`
     - `HIFO`：`unitCost DESC, buyDate ASC`
     - `SPECIFIC_LOT`：依交易紀錄內之 `lotAllocations` 指定順序扣除。
     - `MOVING_AVERAGE`：依整體池化均價沖銷（保留與原有 `calculator.ts` 100% 相容）。
   - 逐筆扣減 Lot 剩餘股數，產生 `LotDisposal` 記錄：
     - 計算單筆配對之 $\text{costBasis} = \text{shares} \times \text{unitCost}$
     - 分攤賣出手續費與證交稅
     - 計算 $\text{realizedPnL} = \text{netProceeds} - \text{costBasis}$
     - 判定 $\text{holdingDays} = \text{sellDate} - \text{buyDate}$ 與 $\text{isLongTerm} = (\text{holdingDays} \ge 365)$。

---

## 4. 使用者介面與互動設計 (UI/UX Design)

### 4.1 持倉明細頁面：批次展開抽屜與模式切換

- **會計模式切換器**：
  - 位於持倉列表頂部工具列，提供下拉選單：
    - `移動加權平均 (Moving Avg)`
    - `先進先出 (FIFO)`
    - `後進先出 (LIFO)`
    - `最高成本先出 (HIFO - 節稅優先)`
  - 每個選項後方皆有 `ℹ️` 圖示，滑鼠移上即浮現專屬 Tooltip。
- **持股展開抽屜 (Lots Breakdown Drawer)**：
  - 點擊持股列可展開查看該標的所有在席 `TaxLot` 清單。
  - 標註每個 Lot 的買入日期、剩餘股數、單股成本、當前未實現損益、以及「長期持有 (綠色徽章)」或「短期持有 (黃色徽章)」。
- **節稅沖銷試算卡 (Tax-Loss Harvesting Card)**：
  - 當標的處於未實現虧損或持有成本參差時，系統自動提示：「若以 HIFO 模式出脫 50 股，可比 FIFO 模式少認列 $1,200 利得，有效延後稅負」。

### 4.2 交易錄入視窗：支援「指定批次 (Specific Lot)」

- 在 `TradeModal` 選擇 `SELL` 類型時，新增「指定沖銷批次」折疊面板。
- 勾選後可手動為各個在庫 Lot 分配本次出脫股數，並即時顯示本次賣出的預估已實現損益與節稅對比。

---

## 5. 檔案變更清單 (File Changes Matrix)

| 檔案路徑 | 變更性質 | 說明 |
| :--- | :--- | :--- |
| `src/types/lot.ts` | 新增 | 定義 `TaxLot`, `LotDisposal`, `AccountingMethod`, `TaxComparisonResult` 等型別與名詞常數 |
| `src/engine/lotEngine.ts` | 新增 | 實作多批次沖銷核心運算引擎、公司行動等比分攤、長短期持有天數判定 |
| `src/engine/taxOptimizer.ts` | 新增 | 提供多種沖銷模式的已實現損益對比與節稅收割 (Tax-Loss Harvesting) 試算器 |
| `src/components/common/Tooltip.tsx` | 新增/增強 | 提供統一直覺的金融名詞懸停氣泡提示元件 |
| `src/components/LotsBreakdownModal.tsx` | 新增 | 持股在席批次明細抽屜與沖銷歷史歸因視圖 |
| `src/components/HoldingsTable.tsx` | 修改 | 整合會計模式選擇器、批次展開按鈕與專有名詞 Tooltip |
| `src/components/TradeModal.tsx` | 修改 | 支援賣出時之「指定批次 (Specific Lot)」選擇與分攤輸入 |
| `src/engine/__tests__/lotEngine.test.ts` | 新增 | 100% 覆蓋之 TDD 單元測試（包含分割、減資、長短期天數邊界、各模式比對） |
| `docs/adr/0035-lot-based-accounting-and-tax-loss-harvesting.md` | 新增 | 架構決策紀錄 ADR |
| `docs/debts/0008-lot-based-accounting-and-tax-loss-harvesting.md` | 修改 | 標記狀態為 `RESOLVED` |
| `docs/debts/README.md` | 修改 | 更新技術債看板 |
| `CONTEXT.md` | 修改 | 同步新領域實體與術語 |

---

## 6. 驗收標準 (Acceptance Criteria)

1. **演算法精確度**：
   - `FIFO`、`LIFO`、`HIFO`、`MOVING_AVERAGE` 計算之單筆與累計損益 100% 通過單元測試驗證。
   - 遇股票分割與除權配股時，各 Lot 單價與股數之乘積總和保持零誤差。
2. **名詞中文與 Tooltip 懸停體驗**：
   - 介面上所有英文專業縮寫（如 FIFO, LIFO, HIFO, Lot, Tax-Loss Harvesting）均附帶繁體中文名稱。
   - 滑鼠移至名詞或 `ℹ️` 圖示上方 100ms 內順暢浮現解釋說明氣泡框，文字清晰通俗。
3. **向後相容與安全性**：
   - 預設模式保持為 `MOVING_AVERAGE`，現有使用者既有損益與介面不受任何非預期漂移影響。
   - `npm test` 100% 綠燈，`npm run build` 0 型別錯誤。
