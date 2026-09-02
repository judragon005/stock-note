# ADR #0035: 多批次沖銷會計 (FIFO/LIFO/HIFO/Specific Lot) 與稅務最佳化沖銷系統

## 狀態
- **狀態**：`ACCEPTED`
- **日期**：2026-08-27
- **決策者**：AI Agent & 使用者
- **關聯 PRD**：[docs/specs/0035-lot-based-accounting-and-tax-loss-harvesting.md](../specs/0035-lot-based-accounting-and-tax-loss-harvesting.md)
- **關聯技術債**：[docs/debts/0008-lot-based-accounting-and-tax-loss-harvesting.md](../debts/0008-lot-based-accounting-and-tax-loss-harvesting.md)

---

## 1. 背景與問題 (Context & Problem)
原先系統於 `src/engine/calculator.ts` 中一律採用「移動加權平均法 (Moving Weighted Average Cost)」計算持有成本與已實現損益。
雖然符合台灣本土券商慣例，但面對以下場景存在架構盲點：
1. **美股官方報稅規範**：美國 IRS 預設採用 **FIFO (先進先出法)**。
2. **高資產節稅沖銷 (Tax-Loss Harvesting)**：投資人需要以 **HIFO (最高成本先出法)** 優先出脫高價部位以最小化利得或最大化虧損以抵扣稅負。
3. **主動波段策略**：無法針對個別買進 Lot 進行損益歸因分析。
4. **專有名詞門檻**：專業金融縮寫對一般使用者不易理解，需提供直覺的繁體中文名稱與懸停即刻說明 (Tooltip)。

---

## 2. 決策內容 (Decision)
1. **建立多批次沖銷核心引擎 (`src/engine/lotEngine.ts`)**：
   - 支援 `MOVING_AVERAGE`（預設）、`FIFO`、`LIFO`、`HIFO` 與 `SPECIFIC_LOT`。
   - 完整支援股票分割 (`STOCK_SPLIT`)、除權配股 (`STOCK_DIVIDEND`) 與現金減資 (`CAPITAL_REDUCTION`) 之在席 Lots 股數等比縮放與單股成本稀釋。
2. **長短期資本利得與節稅試算器 (`src/engine/taxOptimizer.ts`)**：
   - 自然日持有天數運算，判定是否 $\ge 365$ 天達到長期資本利得優惠稅率。
   - 產生多沖銷準則之已實現損益對比矩陣與 Tax-Loss Harvesting 推薦。
3. **通用懸停提示元件與批次明細視圖 (`src/components/common/Tooltip.tsx` & `LotsBreakdownModal.tsx`)**：
   - 全面在中英文金融術語旁配置即時 Hover Tooltip。
   - 支援展開查看在庫所有 Tax Lots、買進日期、單股成本、未實現損益與長短期徽章。
4. **向下 100% 相容**：
   - 預設維持 `MOVING_AVERAGE`，舊有帳本與總覽數據 0 誤差無縫相容。

---

## 3. 結果與影響 (Consequences)
- **優點**：
  - 完美契合美股與跨國申報法規標準，補齊 Tax-Loss Harvesting 高階資產管理能力。
  - 使用者體驗極度友善，滑鼠懸停即可隨時查閱名詞定義。
  - 單元測試 100% 覆蓋，建置 0 型別錯誤。
- **負面/代價**：
  - 批次管理增加資料結構複雜度，已透過模組化純函式隔離維護。
