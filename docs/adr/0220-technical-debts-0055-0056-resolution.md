# 0220 ADR: 第二梯隊架構技術債清理與算法優化 (WarRoom 狀態抽取與估值河流二元搜尋)

## 狀態 (Status)
`ACCEPTED` (2026-11-06)

## 背景 (Context)
在專案演進至 v9.14.0 (Spec 0219) 後，系統具備高度成熟的湖倉與投研能力。然而在代碼整潔與微觀運算層面，存在兩項明確的技術債：
1. **技術債 0056**：`AnalysisMetricView.tsx` 在渲染估值河流圖歷史收盤軌跡時，每次對 8~20 個季度重複執行 `[...historicalCandles].reverse().find(...)`，存在 $O(M \times N)$ 線性搜尋與高頻陣列複製產生的 GC 壓力。
2. **技術債 0055**：`WarRoomWorkspace.tsx`（2,372 行）頂層承載了 110 行跨模組投組風控聚合邏輯（ETF 穿透、美股匯差、質押維持率、偏離度、防禦護盾與自由彈藥計算），存在典型的 Fowler Divergent Change 異味，且難以進行獨立無 DOM 測試。

## 決策 (Decision)
1. **二元搜尋純函式抽取**：
   - 在 `src/utils/binarySearch.ts` 實作極簡純函式 `findLatestCloseBeforeDate(candles, targetDate)`。
   - 拒絕引入外部二分搜尋套件（避免無謂造輪子與套件體積膨脹）。
   - 針對已依日期升序排列之日 K 陣列進行 $O(\log N)$ 邊界查找，徹底消除陣列拷貝與反轉。
2. **WarRoom 投組指標狀態抽取至自訂 Hook**：
   - 建立 `src/hooks/useWarRoomPortfolioMetrics.ts`，接收純資料參數並回傳 memoized 的 `shield` 與 `lookThroughReport`。
   - 拒絕引入全域狀態庫（Zustand / Redux），恪守 React 單純單向資料流與 KISS 原則。
   - 補齊獨立單元測試 `useWarRoomPortfolioMetrics.test.ts`，提升金融風控邏輯的測試覆蓋率與維護性。

## 後果 (Consequences)
- **正面效益**：
  - 估值河流圖渲染查詢時間降至微秒級，消除垃圾回收抖動。
  - `WarRoomWorkspace.tsx` 精簡 100+ 行非視圖邏輯，風控指標運算與 UI 渲染徹底解耦。
  - 技術債看板中 0055 與 0056 得以圓滿收斂為 `RESOLVED`。
- **潛在權衡**：
  - 日 K 線資料必須維持依日期升序排序的先決條件（此條件在資料庫層已有嚴格索引保證）。
