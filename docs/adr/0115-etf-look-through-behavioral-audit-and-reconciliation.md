# ADR 0115: ETF 穿透透視、交易心理偏誤量化覆盤與跨券商持倉對賬審計

## 狀態
已通過 (Accepted) - 2026-09-10

## 脈絡與背景 (Context)
在多資產配置、台美股雙核心投資架構中，投資者長期面臨三大核心盲區（對應技術債 `Debt #0024`, `Debt #0026`, `Debt #0028`）：
1. **ETF 黑盒子與假性分散 (False Diversification)**：投資人同時持有台美科技 ETF (如 0050, 006208, 00923, QQQ, SPY) 與權值個股 (如台積電 2330、NVDA)，表面看似分散，但無法穿透視圖得知底層單一標的或半導體產業的真實合併曝險權重。
2. **交易行為與情緒偏誤黑盒子**：多數交易者深受處置效應 (Disposition Effect，急於賣賺抱賠)、過度交易 (Overtrading)、追高殺低 (FOMO) 與報復性交易 (Revenge Trading) 困擾，缺乏量化的客觀數據指標 (如 PGR / PLR 比例、處置偏差值、持有天數與盈虧相關性) 來進行理性覆盤。
3. **跨券商分記與持倉不平 (Reconciliation Gap)**：多券商 (國泰、元大、富邦、嘉信、Firstrade 等) 定期定額、除權息碎股配發或外部交易導致本機記帳與集保或官方對帳單股數產生誤差，過去缺乏非侵入式的自動審計與差額平整機制。

## 決策細節 (Decision Details)

### 1. ETF 穿透透視引擎 (Look-Through Engine)
- **架構設計**：以 `src/data/etfHoldingsData.ts` 為權重基準庫，收錄台美 11 檔主流旗艦 ETF（0050, 006208, 00923, 0056, 00878, 00919, 00713, SPY, QQQ, VT, VTI）及其前十大權重股與產業分類。
- **計算原則**：`calculatePortfolioLookThrough` 將使用者個股持股與 ETF 依市值比例穿透解構，合併相同標的之「直接持有」與「穿透間接持有」，產出真實穿透後總市值與權重。
- **可視化整合**：在 `TreemapChart` 提供「標的視圖 (Direct)」與「穿透視圖 (Look-Through)」一鍵切換，並以 `LookThroughDetailModal` 提供單一標的成分透視清單。

### 2. 交易心理與偏誤量化覆盤引擎 (Behavioral Audit Engine)
- **量化指標體系**：
  - 處置效應 (Disposition Effect)：依據 Odean (1998) 經典架構計算實現獲利比例 (PGR) 與實現虧損比例 (PLR)，若 PGR/PLR > 1.3 評為嚴重抱賠殺賺。
  - 勝率與盈虧比 (Win Rate & Profit Factor)：統計獲利交易比率與總獲利/總虧損。
  - 持有天數與獲利相關性：分析獲利單平均持有天數 vs 虧損單平均持有天數。
  - 心理偏誤標籤診斷：自動標註過度交易、報復性交易、FOMO 追高殺低與過早停利等情緒模式，並提供量身定制之 AI 紀律改善建議。
- **獨立工作區**：在活頁導覽列新增 `behavioral` (交易心理與覆盤) 工作區，展示四大維度卡片、處置效應儀表板、交易檢討歷史清單與偏誤警告。

### 3. 跨券商持倉對賬審計與衝突智能消解器 (Reconciliation Engine)
- **防禦性會計隔離**：
  - 新增全新交易型別 `ADJUSTMENT`，嚴禁竄改歷史不可變交易分錄。
  - 調整單僅更新該標的剩餘股數，其 `totalCostBasis` 成本基準與已實現損益 (`realizedPnL`) 保持不變，徹底杜絕會計失真。
- **智能解析與對賬精靈**：
  - 支援文字解析 (CSV、TSV、集保格式) 自動辨識券商、標的代碼與對帳股數。
  - 自動比對系統在庫存與外部對帳單，計算差額 (`diffShares`) 並生成 `MATCHED`, `OVER_RECORDED`, `UNDER_RECORDED`, `MISSING_IN_SYSTEM` 等狀態。
  - 提供一鍵生成平整調整單機制，由使用者預覽確認後安全寫入。

## 影響評估 (Consequences)
- **正面效益**：
  - 投資人具備專業避險基金級別的因子穿透與真實曝險掌控力。
  - 交易者擁有科學化、量化的心理弱點審查鏡像，擺脫憑感覺交易的無序狀態。
  - 多券商分記投資人可於 10 秒內完成集保與系統庫存核實與平整。
- **折衷與邊界 (Trade-offs & Boundaries)**：
  - ETF 成分股先以靜態主流種子庫為核心 Baseline，避免全市場爬蟲之網路不確定性與維護成本。
  - 對帳單平整單屬於外部事件校準，使用者若刪除或修改調整單需注意後續股數的一致性。

## 關聯項目 (Related Items)
- 規格書：[0115-etf-look-through-behavioral-audit-and-reconciliation-spec.md](../specs/0115-etf-look-through-behavioral-audit-and-reconciliation-spec.md)
- GitHub Issue：[Issue #9](https://github.com/judragon005/stock-note/issues/9)
- 關聯技術債：`Debt #0024`, `Debt #0026`, `Debt #0028` (全數標記為 RESOLVED)
