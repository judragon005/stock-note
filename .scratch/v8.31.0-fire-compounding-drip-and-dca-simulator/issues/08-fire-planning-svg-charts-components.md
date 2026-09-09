# Issue 08: 開發原生 SVG 雙軌複利對照圖與蒙地卡羅百分位錐形圖 (Fan Chart)

## 狀態與分流
- 狀態：`OPEN`
- 負責人：Agent
- 標籤：`ready-for-agent`, `ui`, `svg`, `visualization`, `chart`

## 任務說明
1. 建立 `src/components/fire/DRIPCompoundingChart.tsx`：
   - 0 外部圖表依賴純原生 SVG 渲染。
   - 繪製雙軌曲線：灰色虛線（提領花掉）vs 翡翠綠實線（DRIP 複利）。
   - 填充兩線之間的半透明超額財富漸層色。
   - 標註 4 階被動收入自由度里程碑達標點虛線與徽章。
   - 提供滑鼠 Hover 懸停 Tooltip 讀取當年度市值與股息數值。
2. 建立 `src/components/fire/MonteCarloFanChart.tsx`：
   - 0 外部圖表依賴純原生 SVG `<polygon>` 渲染。
   - 繪製 P10~P90 外部淺色擴散帶、P25~P75 內部深色核心帶、P50 中位數加粗走勢線。
   - 標記 $NAV = 0$ 破產紅色基線。
   - 提供自適應 ViewBox 與響應式寬高。
3. 建立組件單元驗證或無痛渲染測試，確保在 0 數據或極端數值下不崩潰。
