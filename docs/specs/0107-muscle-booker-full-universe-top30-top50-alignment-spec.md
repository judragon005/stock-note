# 0107. 肌肉書僮目標池滿編規格化與名實相符擴充規格書 (Muscle Booker Full Universe Top 30/50 Alignment Spec)

## 1. 問題意識與背景需求 (Problem Statement)

使用者在操作肌肉書僮動能雷達時發現重大名實不符問題：
1. **「權值核心 Top 50」僅有 20 檔**：按鈕與文案標記為 Top 50，但底層 `TW50_BLUE_CHIP_SYMBOLS` 與 `US_MEGA_50_CORE_SYMBOLS` 僅硬編碼 20 檔。
2. **「台股焦點 Top 30」僅有 16 檔**：按鈕與文案標記為 Top 30，但底層 `TW_TOP_30_FOCUS_SYMBOLS` 僅有 16 檔、`US_TOP_30_FOCUS_SYMBOLS` 僅有 17 檔。
3. **名實不符嚴重損害使用者體驗與分析覆蓋率**：既然 V8.25.0 已經導入本地 IndexedDB 持久化與受控增量並行回補機制，標的擴充至滿編（30 檔與 50 檔）在快取加持下將維持毫秒級離線秒開，完全不會造成效能負擔。

---

## 2. 核心架構與名單規格 (Target Specifications)

### 2.1 臺灣 50 指數 (0050) 官方成分股滿編 (50 檔)
- **常數**：`TW50_BLUE_CHIP_SYMBOLS` 擴充至滿編 50 檔，覆蓋全臺灣市值前 50 大藍籌權值股（台積電、鴻海、聯發科、台達電、廣達、富邦金、國泰金、聯電、中鋼、長榮、世芯-KY、緯穎、奇鋐、研華、聯詠等）。

### 2.2 台股焦點動能飆股滿編 (30 檔)
- **常數**：`TW_TOP_30_FOCUS_SYMBOLS` 擴充至滿編 30 檔，收錄市場法人聚焦之短線箱體飆股（奇鋐、雙鴻、世芯-KY、緯穎、技嘉、欣興、健策、華城、中興電、長榮、大立光等）。

### 2.3 美股巨頭 Top 50 (50 檔)
- **常數**：`US_MEGA_50_CORE_SYMBOLS` 擴充至滿編 50 檔，涵蓋美股市值前 50 大巨頭（NVDA, AAPL, MSFT, AMZN, GOOGL, META, TSLA, BRK.B, LLY, JPM, V, UNH, XOM, MA, COST, PG, HD, JNJ, ABBV, WMT, BAC, NFLX, CRM, AMD, QCOM, ORCL, INTC, CSCO 等）。

### 2.4 美股焦點動能 Top 30 (30 檔)
- **常數**：`US_TOP_30_FOCUS_SYMBOLS` 擴充至滿編 30 檔，收錄短線高流動性與熱門科技飆股（NVDA, TSLA, AMD, AVGO, PLTR, ARM, MU, SMCI, COIN, QCOM, ASML, TSM, CRWD, PANW, UBER, MSTR 等）。

---

## 3. 驗收標準 (Acceptance Criteria)

1. `TW50_BLUE_CHIP_SYMBOLS.length === 50`。
2. `US_MEGA_50_CORE_SYMBOLS.length === 50`。
3. `TW_TOP_30_FOCUS_SYMBOLS.length === 30`。
4. `US_TOP_30_FOCUS_SYMBOLS.length === 30`。
5. `getScopedUniverseSymbols('TW', 'TW50_CORE').length === 50`。
6. `getScopedUniverseSymbols('US', 'TW50_CORE').length === 50`。
7. `getScopedUniverseSymbols('TW', 'TOP30_FOCUS').length === 30`。
8. `getScopedUniverseSymbols('US', 'TOP30_FOCUS').length === 30`。
9. 全量單元測試 100% 綠燈，`npm run build` 0 型別錯誤。
