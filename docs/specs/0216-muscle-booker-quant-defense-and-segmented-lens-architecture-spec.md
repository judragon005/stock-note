# Spec 0216: 肌肉書僮動能雷達量化防禦核升級、既有引擎零造輪子串聯與分段視圖收斂規格 (MuscleBooker Quant Defense, Engine Reuse & Segmented Lens Architecture Spec)

## Problem Statement

當前「肌肉書僮·動能雷達 (MuscleBooker)」在經歷四大市場擴展與卡片 Apple 風格美化後，在大型資料規模（如 `TW_ALL` 2,280+ 檔、`US_SP500` 500+ 檔）與實戰操盤深度上暴露出五大核心痛點：

1. **實戰動能量化邏輯漏洞與假突破無防禦**：
   - 突破箱頂僅檢驗「收盤價 > 箱頂」，未檢驗長上影線「墓碑倒錘 (Bull Trap)」拉高出貨誘多，散戶極易追在當天最高點；布林帶寬門檻過苛 (<= 8.0%)，誤殺了剛拉第一根長紅開口擴張的強勢標的。
   - 「破底翻 (`isBottomPenetrationRebound`)」基準語意嚴重錯位，程式碼實質檢驗的是跌破「MA20」而非「達瓦斯箱底 (`boxLower`)」，導致在箱頂回踩月線被誤判為破底翻，真正的箱底假跌破反轉反而漏抓。
   - 目標價演算法以「近 60 日高點」硬性截斷，違背動能交易突破大底的肥尾效應，且在現價距離前高相差 0.01 元時造成 R-Multiple (風益比) 斷崖式階躍（例如從 0.1R 突變為 3.5R）。

2. **核心量化風控懸空斷線與模擬 K 線造假風險**：
   - 大盤多空 `marketRegime` 與財報鑑識 `isForensicDangerous` 在底層引擎中已具備防線代碼，但在 `MuscleBookerWorkspace.tsx` 呼叫時 100% 懸空未傳入，空頭市場依然發出買進訊號。
   - 在切換大型資產池（> 150 檔）時，系統為缺損標的透過 `generateSyntheticCandles` 隨機生成 25 根偽造日 K 線放行至決策引擎，導致系統產出虛假的「🟢 建議買進」與「8.5R 突破」，嚴重違反金融「事實為本與防幻覺」原則。

3. **專案現成量化引擎嚴重孤島化（重複造輪子）**：
   - 專案既有的 `volumeProfileEngine.ts`（60 日分價量表與 POC 阻力最小路徑）、`vwapCostEngine.ts`（20 日主力成本線與過熱乖離）、`smartMoneyEngine.ts`（美股 CMF 資金流）整合度均為 0，MuscleBooker 成了空有量價外殼、缺乏實質主力籌碼靈魂的孤島。

4. **DOM 節點爆炸與主執行緒 CPU 阻塞**：
   - 頁面將 HUD、三色矩陣、四大象限、均線扣抵表全部縱向平鋪無分頁渲染。在 2,280 檔下，單是「觀望不碰」池即佔 1,800+ 檔，總 DOM 節點高達 130,000+，導致瀏覽器卡死；水合期間每 300ms 對 2,280 檔重新跑全套指標，主執行緒凍結數秒；卡片未封裝 `React.memo`，單卡展開觸發全樹 3,000+ 張卡片重繪。

5. **實戰操作斷點與在庫持股虛假安全感**：
   - 同一標的在同一頁面縱向重複出現 3~4 次，造成嚴重滾動疲勞；卡片缺少「一鍵下單 (Quick Trade)」與「加自選星號 (Watchlist)」，看到買賣訊號無法閉環落地；HUD 在庫持股警戒僅在「已跌破」時通報，當持股距離防守線僅剩 0.5%（緩衝 ≤ 1.5% 瀕臨破防）時卻顯示「全數守穩」，給予操盤手致命的虛假安全感。

---

## Solution

遵循 **KISS 原則**、**第一性原理** 與 **零外部依賴 (Zero External Dep)**，透過微創架構升級完成五大核心重構：

1. **量化決策與防守核硬化 (`muscleBookerEngine.ts`)**：
   - **破底翻校正**：基準由 MA20 校正為達瓦斯箱底 `boxLower`（盤中跌破箱底但收盤站回箱底之上，且下影線佔振幅 ≥ 50%）。
   - **假突破墓碑線熔斷**：調用現成 `detectPriceActionTraps`，一旦突破當日出現長上影線墓碑線 (Bull Trap)，一票否決買進（轉為 `AVOID`）。
   - **平滑化 R-Multiple 目標價**：以波段等幅目標價與前高壓力進行加權期望值平滑計算，消除階躍斷崖。
   - **動態布林帶寬放寬**：近 3~5 日曾極致壓縮 (≤ 8.0%)，當日放量開口擴張允許確立買點。

2. **專案既有模組零造輪子串聯 (`volumeProfile` / `vwapCost` / `Regime`)**：
   - 串聯 `volumeProfileEngine.ts`：突破時檢驗現價上方 5% 內是否存在 POC 大量套牢峰，若有則降級風益比並提示套牢壓制。
   - 串聯 `vwapCostEngine.ts`：計算 20 日主力成本乖離率，> 10% 降級為過熱觀望；破底翻站回 VWAP 加分標註。
   - 接通 `omniIndicatorEngine.evaluateMarketRegime`：大盤空頭時強制提高 R 門檻至 3.0R 且非極強領先股禁止逆勢進場。
   - 建立雙市場成交金額門檻：台股 5 日均成交金額 ≥ 3,000 萬 TWD；美股 ≥ 500 萬 USD。美股串聯 CMF 蔡金資金流。

3. **數據水合機制升級與零幻覺防護 (`useMuscleBookerSync.ts`)**：
   - 徹底移除 `generateSyntheticCandles` 的隨機假行情，缺損標的維持 `isDataPending: true` 並展示「數據回補中」。
   - IndexedDB 讀取改為每 100 檔分塊查詢 (Chunk 100)，避免 2,280 併發癱瘓瀏覽器資料庫線程。
   - 引入增量掃描快取 Map (`scannedItemsMapRef`)，僅重算數據變更標的，計算時間由 350ms 降至 2ms。
   - 保證死鎖免疫：批次水合邏輯採用 `try ... finally`，確保 `isSyncing` 狀態必然復位。

4. **資訊架構分段視圖收斂與 DOM 瘦身 (`MuscleBookerWorkspace.tsx`)**：
   - 保持頂部 HUD 常駐，下方導入 Apple 風格分段視圖控制器 (Segmented Tabs)：
     `[ 🚦 操盤導航 (三色動作) ]` ⇄ `[ ⚡ 動能看板 (四大象限) ]` ⇄ `[ 📈 扣抵望遠鏡 (排表) ]`
     徹底消滅標的重複出現 4 次的認知過載與無限滾動疲勞。
   - 扣抵表導入 50 / 100 / ALL 分頁（複用 `TradeHistoryTable` 成熟模式），DOM 節點減少 95%。
   - 「觀望不碰」池預設折疊收納，避免 1,800 張卡片塞爆 DOM。
   - `MuscleStockCard` 封裝 `React.memo`，單卡展開不觸發全樹重繪。
   - 剪貼簿複用 `src/utils/clipboard.ts`，價格格式化複用 `src/utils/formatters.ts`。

5. **實戰交易閉環與持股風控雙重預警 (`MuscleStockCard.tsx` / `ActionDirectivesHUD.tsx`)**：
   - 卡片補齊 `onQuickTrade`（⚡ 買進/賣出）與 `onToggleWatchlist`（⭐ 自選星號）。
   - HUD 在庫持股警戒納入「瀕臨破防 (Buffer ≤ 1.5%)」雙重預警，消除假安全感。
   - 增加按「風益比 (R)」、「量比 (Vol Ratio)」、「防守緩衝距離 (Buffer %)」、「漲跌幅 (%)」多維動態排序與快篩 Chips。

---

## User Stories

1. **As a 紀律波段交易員**, I want 系統在股票出現長上影線墓碑誘多 (Bull Trap) 時一票否決買進訊號, so that 我不會追在當天最高點被主力倒貨割韭菜。
2. **As a 達瓦斯箱體操盤手**, I want 破底翻訊號嚴格以跌破「箱底 (boxLower)」並強勢收復為判定標準, so that 我能精確捕捉主力在箱底洗盤後的真破底翻買點，不再被箱內回踩月線誤導。
3. **As a 量化風控主管**, I want 目標價與風益比 (R) 採用加權平滑演算法而非 60 日高點暴力截斷, so that R 值不會因 0.01 元微小變動發生階躍斷崖，並保留大底突破的主升段飆股。
4. **As a 價值投資者與機構操盤手**, I want 系統檢驗標的與 20 日主力 VWAP 成本線的乖離率 (< 10%) 與上方分價量表 POC 套牢壓, so that 我不會在主力高檔派發或沉重解套賣壓區盲目追高。
5. **As a 系統使用者**, I want 切換至台股全量 (2,280+ 檔) 時系統絕不隨機捏造偽造日 K 線, so that 看板呈現的每一組買賣訊號都 100% 基於真實數據，數據未就緒時明確標示回補中。
6. **As a 大規模選股操盤手**, I want 切換至台股全量時頁面秒級載入且不卡頓, so that 我不需要等待主執行緒凍結數秒，隨時能流暢切換分頁與搜尋。
7. **As a 專注型交易員**, I want 透過分段控制器切換「操盤導航」、「動能象限」與「扣抵望遠鏡」三重視角, so that 我不需要向下無止盡滾動數萬像素，同一檔股票不再重複出現 4 次。
8. **As a 活躍波段操盤手**, I want 在卡片上一鍵點擊快速下單按鈕與自選星號, so that 我在看見 4.0R 訊號時能秒級開啟交易視窗或加入自選清單，操作不中斷。
9. **As a 在庫持股管理者**, I want 當持股距離防守線剩餘緩衝不足 1.5% 時立即在 HUD 看到橘紅色瀕危預警, so that 我能提前拔槍戒備，不會因「尚未真正跌破」而陷入虛假的放鬆狀態。
10. **As a 量價操盤老手**, I want 能夠一鍵按「量比 (爆量優先)」或「防守緩衝 (貼近防守優先)」動態排序標的, so that 我能秒級抓出當日主力真金白銀進駐表態的發動先鋒。

---

## Implementation Decisions

### 1. 核心量化演算法改進 (`src/engine/muscleBookerEngine.ts`)

```ts
// 1. 破底翻基準校正 (darvasBoxEngine.ts)
// current.low < boxLower && current.close >= boxLower 且下影線佔比 >= 50%
export function detectBottomPenetration(candles: DailyCandle[], boxLower?: number): boolean;

// 2. 假突破墓碑線檢驗 (複用 omniIndicatorEngine.detectPriceActionTraps)
const traps = detectPriceActionTraps(subCandles);
if (traps.hasBullTrap) {
  return { action: 'AVOID', actionBadge: '⛔ 嚴禁碰觸 (墓碑誘多)', ... };
}

// 3. 平滑化 R-Multiple 計算
const measuredTarget = currentPrice + Math.max(boxWidth, 2.0 * (atr?.atr14 ?? currentPrice * 0.03));
const target = lookback60High && lookback60High > currentPrice
  ? 0.5 * lookback60High + 0.5 * measuredTarget // 加權平滑期望值
  : measuredTarget;

// 4. VWAP 成本過熱與 Volume Profile 套牢壓判定
const vwapData = calculateVwapCostStructure(candles, currentPrice);
if (vwapData.biasPercent > 10.0) {
  return { action: 'HOLD', actionBadge: '🟡 觀望 (主力成本過熱)', ... };
}

const vpData = calculateVolumeProfile(candles);
// 若現價上方 5% 內存在 POC 且佔比 > 25%
if (isHeavyResistanceAhead(vpData, currentPrice)) {
  return { action: 'HOLD', actionBadge: '🟡 觀望 (上方套牢壓沉重)', ... };
}
```

### 2. 資料水合與增量快取機制 (`src/components/muscleBooker/hooks/useMuscleBookerSync.ts`)

- 移除 `generateSyntheticCandles` 的偽造數據注入。
- 採用分塊檢索（Chunk size = 100）Promise.all 讀取 IndexedDB。
- 批次回補結果採用 `scannedItemsMapRef` 進行增量更新，未變更標的保留舊引用，使 `scannedItems` 記憶體重算時間降至 2ms。
- 採用 `try ... finally` 封閉同步迴圈，確保 `isSyncing` 必被重置。

### 3. 視圖分段控制器與分頁收斂 (`src/components/MuscleBookerWorkspace.tsx`)

- 新增視圖模式狀態：`const [viewLens, setViewLens] = useState<'ACTIONS' | 'QUADRANTS' | 'TELESCOPE'>('ACTIONS');`
- 條件渲染三重視圖：
  - `ACTIONS` ➔ `<TrafficLightMatrix />`（觀望池折疊收納）
  - `QUADRANTS` ➔ `<DarvasQuadrantGrid />`
  - `TELESCOPE` ➔ `<DeductionTelescopeTable />`（內建 50/100/ALL 分頁器）
- 頂部 HUD 升級持股雙重過濾：收錄 `item.currentPrice < defensePrice`（破線）與 `bufferPercent <= 1.5`（瀕危）。

### 4. 卡片組件記憶體保護與工具複用 (`src/components/muscleBooker/subcomponents/MuscleStockCard.tsx`)

- 封裝為 `React.memo(MuscleStockCard)`。
- 複製按鈕複用 `src/utils/clipboard.ts` 中的 `copyTextToClipboard`。
- 幣別格式化複用 `src/utils/formatters.ts` 中的 `formatCurrencyAmount`。
- 增加 `onQuickTrade` 與 `onToggleWatchlist` 回調，右上角放置快速交易與自選星號。

---

## Testing Decisions

1. **TDD 單元測試覆蓋**：
   - `src/engine/muscleBookerEngine.test.ts`：
     - 驗證墓碑倒錘線 (Bull Trap) 出現時強制輸出 AVOID。
     - 驗證破底翻在跌破 `boxLower` 收復時正確觸發，回踩 MA20 不得觸發破底翻。
     - 驗證 R-Multiple 目標價平滑連續性（消除階躍缺陷）。
     - 驗證 VWAP 乖離率 > 10% 時降級為過熱觀望。
     - 驗證雙市場日均成交金額流動性過濾（台股3,000萬/美股500萬）。
   - `src/components/MuscleBookerWorkspace.test.ts`：
     - 驗證分段視圖切換器 (Tabs) 正確切換渲染對應視圖。
     - 驗證持股在 `Buffer <= 1.5%` 時 HUD 正確拉響瀕危警報。
     - 驗證扣抵表分頁功能（第 1 頁顯示 50 筆，切換第 2 頁顯示下一組）。
   - `src/components/muscleBooker/subcomponents/MuscleStockCard.test.tsx`：
     - 驗證點擊一鍵下單按鈕正確觸發 `onQuickTrade`。
     - 驗證點擊自選星號正確觸發 `onToggleWatchlist`。
2. **品質閘門**：
   - 本地 `npm test` 100% 通過。
   - 本地 `npm run build` 0 TypeScript 編譯錯誤。

---

## Out of Scope

1. **自定義動態腳本編輯器**：維持達瓦斯與布林等量化公式，不開放使用者編寫 Pine Script 等自訂程式碼。
2. **美股 Level 2 逐筆報價**：維持日 K 線行情與 Yahoo Finance 延遲水合架構。
3. **自動程式化實盤下單 (Auto-Execution)**：一鍵下單僅為開啟交易確認彈窗（`handleQuickTrade`），不進行未經授權的自動撮合。

---

## Further Notes

- 本規格為 `/grill-me` 深度審查與架構調研後凝聚之正式技術規格，全面對齊 KISS、第一性原理與金融防幻覺準則。
- 遵循 Issue-First 規範，待使用者確認後建立對應 Issue、分支與進行 TDD 實作。

