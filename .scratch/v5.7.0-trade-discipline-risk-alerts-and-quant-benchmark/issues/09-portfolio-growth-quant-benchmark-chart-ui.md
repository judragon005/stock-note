# 子任務票券 #09: 淨值成長大盤疊圖與量化指標看板 (Portfolio Growth Quant Benchmark Chart UI)

- **母票券**: [issue-0041.md](issue-0041.md)
- **版本**: v5.7.0
- **分流標籤**: `ready-for-agent`
- **狀態**: `RESOLVED`
- **目標檔案**:
  - `src/components/PortfolioGrowthChart.tsx`

---

## 🎯 任務目標
1. 升級 `PortfolioGrowthChart.tsx`：
   - 頂部工具列新增基準切換 Toggle 按鈕：`[ 無基準 | 0050 (台股) | SPY (美股) | 50/50 股債配置 ]`。
   - 啟用基準時，將自身的資產成長曲線與大盤指數走勢以 100% 歸一化標準疊加顯示，並提供雙色曲線與圖例標示。
2. 圖表下方新增「量化風控儀表板 (Quant Risk Metrics Grid)」：
   - 👑 **Alpha (詹森阿爾法超額報酬)**
   - ⚖️ **Beta (市場敏感係數)**
   - ⚡ **Sharpe Ratio (夏普值)**
   - 📉 **Max Drawdown (最大回撤對比：自身 vs. 基準)**
   - 🌊 **Volatility (年化波動度)**

---

## 驗收標準
- [ ] 基準走勢切換順暢，圖表 Tooltip 可同步對照自身與大盤當日數值。
- [ ] 當歷史天數過短時，量化指標卡片能優雅展示提示而非破版。
