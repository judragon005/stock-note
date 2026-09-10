## PRD #0115: ETF 穿透透視、交易心理量化覆盤與跨券商對賬審計系統

### 關聯技術債
- Debt #0024: ETF 穿透式成分股透視與產業因子集中度分析 (核心主體)
- Debt #0026: 交易行為心理學與情緒偏誤量化覆盤審查系統 (強相關伴隨 1)
- Debt #0028: 跨券商持倉對賬審計與匯入衝突智能消解器 (強相關伴隨 2)

詳細規格請參閱 [docs/specs/0115-etf-look-through-behavioral-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0115-etf-look-through-behavioral-audit-and-reconciliation-spec.md)。

### 核心功能清單
1. **ETF 穿透透視 (Debt #0024)**：
   - 台美核心 ETF 權重字典庫 (`0050`, `006208`, `0056`, `00878`, `00919`, `00923`, `SPY`, `QQQ`, `VT`, `VTI`)
   - 遞歸計算直接持股 + ETF 間接穿透之實質總曝險
   - Treemap 支援「標的視圖」與「穿透透視」切換，高亮標記 >25% 單一標的與 >50% 產業集中度
2. **交易行為心理與處置效應覆盤 (Debt #0026)**：
   - 量化獲利與虧損部位平均持有天數、PGR / PLR 處置效應強度指數
   - 買進日 60MA 季線正乖離 > 15% 追高勝率與冷靜進場勝率矩陣
   - 年化摩擦稅費拖累率 (Friction Cost Drag % on NAV) 與客觀交易改善卡
3. **跨券商持倉對賬審計 (Debt #0028)**：
   - 匯入/貼上券商庫存快照比對，識別股數差異與遺漏標的
   - 同日零股分批拆合智能匹配 (Fuzzy Multi-Lot Matcher)
   - 生成無損審計調整單 (`type = 'ADJUSTMENT'`)，不破壞歷史真實交易

### 驗收標準 (Acceptance Criteria)
- [ ] `src/engine/lookThroughEngine.test.ts` 覆蓋率 100%，台美 ETF 穿透加權計算精確
- [ ] `src/engine/behavioralAuditEngine.test.ts` 覆蓋率 100%，處置效應與 FOMO 乖離統計無誤
- [ ] `src/engine/reconciliationEngine.test.ts` 覆蓋率 100%，對賬差異識別與調整單生成完整
- [ ] 本地 `npm test` 全部綠燈通過，`npm run build` 0 型別錯誤
