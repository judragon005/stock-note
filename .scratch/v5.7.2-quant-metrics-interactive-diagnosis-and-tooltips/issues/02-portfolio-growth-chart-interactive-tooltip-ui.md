# 子任務 #02: 成長圖表量化卡片雙層 Tooltip UI 與防溢出互動 (Interactive Tooltip UI)

- **所屬迭代**: v5.7.2
- **狀態**: `RESOLVED`
- **分流標籤**: `ready-for-agent`
- **關聯主票券**: [issue-0043.md](issue-0043.md)
- **目標檔案**:
  - `src/components/PortfolioGrowthChart.tsx`

---

## 🎯 任務目標

1. 在 `PortfolioGrowthChart.tsx` 中呼叫 `getQuantMetricDiagnosis()` 取得 5 大指標的診斷與原理資料。
2. 為看板的 5 個指標卡片（Alpha, Beta, Sharpe, MDD, Volatility）實作懸浮雙層 Tooltip：
   - 上層（原理層）：標題、英文名、公式、基準說明。
   - 分隔線。
   - 下層（診斷層）：評級 Badge（帶專屬色彩）、一句話機構診斷、💡 策略建議。
3. 支援 Hover 浮現與行動端/平板 Tap 點擊切換，並加入智慧邊界防溢出 (Auto-placement)。
4. 採用符合系統設計規範的深色毛玻璃 (Glassmorphism) 與流暢淡入動畫。

---

## 📋 驗收條件

- [ ] 滑鼠 Hover 至任一量化卡片時，平滑浮現雙層 Tooltip。
- [ ] Tooltip 內容正確對應當前數值之診斷語句與評級顏色。
- [ ] 靠邊界（最左或最右）之卡片 Tooltip 自動校準，不超出畫面寬度。
- [ ] 支援行動端點擊切換與空白處關閉。
