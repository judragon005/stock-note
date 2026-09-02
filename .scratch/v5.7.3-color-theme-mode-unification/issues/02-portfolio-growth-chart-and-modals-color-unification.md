# 子任務 02: NAV 圖表概覽卡片與全專案彈窗色彩全面連動

- **父票券**: [issue-0044.md](issue-0044.md)
- **狀態**: `RESOLVED`
- **分流標籤**: `ready-for-agent`
- **目標檔案**:
  - `src/components/PortfolioGrowthChart.tsx`
  - `src/components/XirrDetailModal.tsx`
  - `src/components/MarginStressModal.tsx`

---

## 🎯 任務目標與實作細節

1. **PortfolioGrowthChart.tsx 改造**：
   - 當日漲跌額度與報酬率：`color: activeSnapshot.dailyPnL >= 0 ? 'var(--gain-color)' : 'var(--loss-color)'`。
   - 全期累計總損益：`color: (activeSnapshot?.cumulativeReturnPnL || 0) >= 0 ? 'var(--gain-color)' : 'var(--loss-color)'`。
   - 全期累計總報酬率：`color: (activeSnapshot?.cumulativeReturnPercent || 0) >= 0 ? 'var(--gain-color)' : 'var(--loss-color)'`。
   - 區間 XIRR 數值：`color: metrics.xirrPercent >= 0 ? 'var(--gain-color)' : 'var(--loss-color)'`。
   - 量化看板 Alpha 超額回報：`color: quantMetrics.alpha !== null ? (quantMetrics.alpha >= 0 ? 'var(--gain-color)' : 'var(--loss-color)') : 'var(--text-muted)'`。
   - 淨資產 (NAV) 總額與最高淨值 (ATH)：保持中性主題亮色。
2. **XirrDetailModal.tsx 改造**：
   - 簡單報酬率與個別現金流損益數值使用 `var(--gain-color)` / `var(--loss-color)`。
3. **MarginStressModal.tsx 改造**：
   - 保證金追繳試算差額與警示圖示連動 `var(--gain-color)` / `var(--loss-color)`。
