# ADR 0214: 肌肉書僮·動能雷達全量進化、量化風控防禦與無重複模組化重構

## 狀態 (Status)
已採納 (Accepted)

## 上下文 (Context)
原本「肌肉書僮·動能雷達」工作區在實戰中面臨以下架構與量化缺陷：
1. **分母微小陷阱 (Near-Zero Denominator Fallacy)**：停損價緊貼突破價時，風益比暴衝至 16R~20R 甚至 100R，造成嚴重期望值虛胖。
2. **目標價虛幻天花板**：等距測量目標價未經歷史 60 日真實高點壓制，脫離實戰阻力位。
3. **均線扣抵時空盲區**：僅單日比對，缺乏未來 3 日扣抵高檔的下彎預警能力。
4. **單一指標脆弱性**：缺乏專案既有 mature engines（OBV 量能、MACD 零軸、Regime 體系、財報防雷）的跨維度多空閘門。
5. **Re-render 瀑布與巨型組件壞味道**：`MuscleBookerWorkspace.tsx` 膨脹至 2,464 行，重複手寫 7 處卡片，背景回補逐檔刷新 State 觸發 50 次全頁重繪。
6. **相依倒置與循環引用**：底層指標引擎 `technicalIndicatorEngine.ts` 反向依賴上層業務 `muscleBookerEngine.ts`。

## 決策 (Decision)
1. **量化期望值模型重構**：
   - 引入最小防守緩衝：`minRiskBuffer = Math.max(price * 0.02, atr14 * 1.0)`，徹底消滅虛胖分母。
   - 目標價結構化天花板壓制：`Math.min(lookback60High, measuredTarget)`。
   - 均線扣抵時空望遠鏡：提取未來 3 日扣抵數列 `futureDeductions`，若均值大於現價提前標記 `DOWN`。
2. **無重複造輪子之跨模組閘門**：
   - 整合 `omniIndicatorEngine.ts` 之 OBV 量能背離與 MACD 零軸主控門檻。
   - 整合 `dualMomentumEngine.ts` 大盤 Regime，在空頭環境動態提高買進門檻至 3.0R。
   - 整合 `forensicRadarEngine.ts` 財報防雷與流動性容量防禦。
3. **架構解耦與相依倒置消除**：
   - 建立 `src/engine/darvasBoxEngine.ts` 下沉幾何與箱體計算，解除 `technicalIndicatorEngine` 對業務模組的依賴。
   - 統一使用 `calculateSMA` 數列函數，消滅多處手寫 `reduce`。
   - 清理自選名單硬編碼魔術字串 `s !== '3175'`，改採通用正規合法性過濾。
4. **前端效能與模組化重構**：
   - 抽取 `useMuscleBookerSync.ts`，採用 `Promise.all` 批次水合 IndexedDB 快取。
   - 引入批次緩衝區節流更新（每 5 檔或 300ms 刷新一次 State），消滅 50 次重繪瀑布。
   - 抽取單一職責共用卡片 `MuscleStockCard.tsx`，補齊實戰量比、漲跌幅、防守距離 Buffer % (<= 1.5% 閃爍紅燈)、一鍵複製代碼與透視直通。
   - 抽取 `ActionDirectivesHUD.tsx`、`MuscleBookerHeader.tsx`、`TrafficLightMatrix.tsx`、`DarvasQuadrantGrid.tsx`、`DeductionTelescopeTable.tsx`，主工作區壓降至 420 行。

## 後果 (Consequences)
- **正面影響**：
  - 徹底杜絕了虛假 20R 高期望值訊號，風益比真實可信。
  - 大幅降低 React 渲染開銷，頁面切換與背景回補極致流暢。
  - 代碼高度模組化，單一組件行數受控，可維護性與可測試性大幅提升。
  - 既有 2000+ 測試套件 100% 綠燈，TypeScript 0 型別錯誤。
- **負面影響/權衡**：
  - 引入了 `darvasBoxEngine.ts` 與 `muscleBooker/subcomponents/` 檔案，需妥善管理匯出介面與相容性（已透過 re-export 完美保證 100% 向後相容）。
