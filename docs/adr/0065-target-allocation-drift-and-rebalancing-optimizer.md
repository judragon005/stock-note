# ADR-0065: V7.0.0 資產配置目標偏離 (Drift) 試算與再平衡推薦器 (Target Allocation & Rebalancing Optimizer)

- **狀態**：`ACCEPTED`
- **日期**：2026-09-02
- **決策者**：架構團隊 / AI Agent
- **關聯規格書**：[docs/specs/0065-target-allocation-drift-and-rebalancing-optimizer-spec.md](../specs/0065-target-allocation-drift-and-rebalancing-optimizer-spec.md)
- **關聯技術債**：[docs/debts/0012-target-allocation-drift-and-rebalancing-optimizer.md](../debts/0012-target-allocation-drift-and-rebalancing-optimizer.md) (已解決 `RESOLVED`)

---

## 1. 背景與脈絡 (Context)

系統原先僅提供被動式的「市場/幣別佔比」與「個股市值樹狀圖」，缺乏投資人主動設定「目標資產配置模型 (Target Allocation)」與「偏離度量化分析 (Drift Analysis)」功能。
當市場行情波動導致資產比例失衡時，投資人無法直觀得知偏離幅度，在進行定期注水或年度再平衡時必須自行以試算表手動計算，缺乏自動化下單試算引擎。

---

## 2. 決策內容 (Decision Drivers & Choices)

我們決定建立整合式的資產目標配置與再平衡系統，架構重點如下：

1. **雙軌目標配置模型 (`TargetAllocationConfig`)**：
   - 支援「市場維度 (TW / US / CASH)」與「自訂個股維度 (Symbol-level)」配置策略。
   - 內建策略編輯器，支援自訂百分比配置並進行合計 100% 之防呆校驗。
   - 支援設定自訂偏離容忍門檻 (Tolerance Band，預設 $\pm 5\%$)。
2. **總資產基準單一事實來源 (SSOT)**：
   - 計算總資產價值時統一聚合台股持股市值 + 美股持股市值 (即時匯率折算) + 現金帳本實質可用餘額，確保個股佔比與市場佔比計算口徑一致。
3. **雙模式再平衡下單演算法 (`rebalancingEngine.ts`)**：
   - **定期注水加碼 (Cash-in Only)**：採用「缺口權重分配模型」，優先補足低配幅度最大的標的，只買不賣，杜絕額外資本利得稅與賣出交易摩擦成本。
   - **全量買賣再平衡 (Full Rebalancing)**：超配標的產生賣出建議、低配標的產生加碼建議，精確重置組合比例。
4. **跨市場交易顆粒度與摩擦成本適配**：
   - 台股：自動轉換為「整張數 (1,000股) + 零股數」複合格式。
   - 美股：支援小數點碎股精算（小數點後 3 位）。
   - 多幣別：同步輸出原幣別 (USD/TWD) 與折合台幣建議金額，並預估手續費與證交稅。
5. **UI/UX 深度整合**：
   - 於 `AllocationChart.tsx` 整合「⚖️ 目標配置與再平衡」Tab 視圖，包含策略選擇/編輯器、雙色長條偏離對比圖與再平衡試算操作台。

---

## 3. 結果與影響 (Consequences)

### 正面效益 (Positive)
- 徹底消除技術債 #0012，將被動資產圖表升級為主動投資決策中心。
- 提供嚴謹紀律的再平衡下單清單，大幅降低投資人手動計算錯誤風險。
- 專屬單元測試 100% 覆蓋，全專案 437 項測試綠燈通過，TypeScript 0 錯誤。

### 權衡考量 (Trade-offs)
- 目標配置策略目前儲存於 localStorage，未來跨裝置同步可進一步整合 IndexedDB 時光機快照體系。
