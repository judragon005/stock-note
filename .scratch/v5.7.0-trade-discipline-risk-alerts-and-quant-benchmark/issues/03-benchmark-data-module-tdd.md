# 子任務票券 #03: 本地基準大盤歷史數據模組與補值算法 TDD (Benchmark Data Engine TDD)

- **母票券**: [issue-0041.md](issue-0041.md)
- **版本**: v5.7.0
- **分流標籤**: `ready-for-agent`
- **狀態**: `RESOLVED`
- **目標檔案**:
  - `src/engine/benchmarkData.ts` (新增)
  - `src/engine/benchmarkData.test.ts` (新增)

---

## 🎯 任務目標
1. 建立 100% 離線可用之大盤基準數據庫：
   - 內建 0050.TW (元大台灣50) 與 SPY (標普500) 之基準歷史價格常數表與獲取接口。
2. 開發時間序列對齊與插值補值演算法 `alignBenchmarkTimeSeries(dates, benchmarkType)`：
   - 當投資組合日期遇休市或無基準數據時，執行向前填充 (Forward Fill) 或線性插值。
3. 開發基準走勢歸一化計算函式 `calculateNormalizedGrowth(prices)`：
   - 以起始日為 100%，將每日價格標準化為累積百分比走勢。
4. 撰寫完整單元測試 `benchmarkData.test.ts`。

---

## 驗收標準
- [ ] 支援 0050、SPY 與 50/50 股債平衡模型計算。
- [ ] 執行 `npx vitest run src/engine/benchmarkData.test.ts` 全數通過。
