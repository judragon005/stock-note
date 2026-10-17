# ADR 0193: 法人旗艦級宏觀戰情室 2.0 (Institutional Macro War Room 2.0)

## 狀態 (Status)
已接受 (Accepted) - 2026-10-17

## 脈絡 (Context)
宏觀戰情室 (Market War Room) 過去在架構上存在以下結構性問題：
1. **假數據殘留 (Mock Data Violation)**：雙重動能輪動模組過去在組件層寫死了 145 行 `MOCK_MOMENTUM_PRICES`，嚴重違反專案的 `zeroMockPolicy` 與真實性要求。
2. **缺乏機構級信用與流動性金絲雀 (Credit & Liquidity Canaries)**：僅有美債 10Y/2Y 殖利率，欠缺高收益債信用利差 (HY OAS) 與違約互換保險指數 (CDS/CDX)，在系統性信用緊縮爆發前夕缺乏前瞻預警。
3. **市場訊號未分流 (Market Views Conflation)**：台美市場受制於不同主導變數（美股看利率與信用，台股看外資期貨空單與散戶融資維持率），未分流造成決策干擾。
4. **個人風控深度不足 (Risk Exposure & Stress Test Missing)**：僅有靜態維持率，缺乏機構級的單日 95% 在險價值 (1-Day 95% VaR) 與急速 3 階壓力情境推估。
5. **配額浪費與相容風險 (Quota Guard & Schema Compatibility)**：未鎖定 24H 刷新頻率造成無效切換時重複呼叫外部 API，且舊版 LocalStorage 缺乏數據消毒容易在讀取未定義欄位時觸發白屏。

## 決策 (Decisions)

### 1. 0~100 宏觀水溫計與作戰姿態模型
在 `macroAdvisorEngine.ts` 內實作純數學函數 `calculateMacroThermometer()`，以美債殖利率倒掛、VIX 恐慌指標、高收益債利差 OAS、外資期貨空單部位綜合評分，得出：
- **作戰姿態 (Stance)**：`DEFENSIVE` (< 40 分)、`NEUTRAL` (40~70 分)、`AGGRESSIVE` (> 70 分)。
- **建議權益部位上限 (Suggested Equity Allocation)**：20% ~ 90% 區間動態收斂。

### 2. 頂部台美雙軌與全球視角分流 (TW / US / Global)
- **`'GLOBAL'`**：綜合宏觀水溫計、核心指標四柱、跨市場比率 (SPY/TLT、0050/0056) 與雙重動能排行榜。
- **`'TW'`**：外資台指期淨未平倉口數、全市場融資維持率（130% 警戒線）、台幣匯率與在線月營收倒數。
- **`'US'`**：10Y/2Y 殖利率利差、高收益債利差 (HY OAS)、CDS 債券履約違約保險指數 (CDX) 與 VIX 恐慌指數。

### 3. 100% Zero Mock 與真實湖倉日 K 驅動
- 徹底剷除 `WarRoomWorkspace.tsx` 內之 `MOCK_MOMENTUM_PRICES` 假數據。
- 透過外部傳入之真實 `historicalDailyPrices` 注入日 K 序列，動態計算 12-1M 滾動動能與無風險避風港狀態。

### 4. 機構級風控在險模型 (1-Day 95% VaR) 與 3 階黑天鵝急速壓力測試
- **1-Day 95% VaR**：根據持倉總額與大盤年化波動度 (預設 20%)，精算在 95% 信心水準下之單日極限潛在損失。
- **FX Delta**：精算台幣每升值 1 元對美股投資部位產生的總匯損敏感度。
- **3 階急速壓力測試**：提供 `[-10% 震盪]`, `[-20% 回檔]`, `[-30% 崩盤]` 互動切換，即時計算跌幅下個人融資質押維持率與追繳保證金缺口。

### 5. 彭博式三段時序雷達與催化劑聚合
- 催化劑依時序收斂至「今日登場」、「7 日焦點」、「30 日遠端」。
- 注入每月 10 號台股營收截止倒數催化劑。
- 預估個股除息時對加權指數的實質扣點點數，預防假跌破誤判。

### 6. 快取鎖定與舊版 Schema 自動消毒相容
- 實作 `isSameDayCacheValid`，同日 24H 內重複開啟戰情室直接命中快取，API 發送次數降為 0。
- 實作 `sanitizeMacroRecord`，讀取舊版 LocalStorage 快照時自動補齊缺失欄位，徹底阻絕 `undefined.toFixed()` 執行期崩潰。

## 後續影響 (Consequences)
1. **優點**：
   - 實現 100% Zero Mock Policy，所有動能與風控指標皆依據真實數據計算。
   - 投資決策路徑縮短至 3 秒（看水溫計 ➔ 看 VaR ➔ 挑選動能最強資產）。
   - 徹底杜絕 API 免費額度耗盡與升級舊資料導致的白屏錯誤。
2. **潛在挑戰**：
   - 無網路環境下需仰賴本地快照與手動微調，已提供離線自校準 UI 與預設保底數值作為防御。
