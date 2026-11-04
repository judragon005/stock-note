# ADR 0216: 肌肉書僮量化防禦核升級、既有引擎零造輪子串聯與分段視圖收斂架構決策 (Spec 0216)

- **狀態 (Status)**: 已採納 (Accepted)
- **關聯 Issue**: #397
- **實作分支**: `feature/397-muscle-booker-quant-defense-and-segmented-lens`
- **日期 (Date)**: 2026-11-03

---

## 背景與問題陳述 (Context & Problem Statement)

在肌肉書僮動能雷達核心演算法與工作區落地後，四位專家視角審查識別出以下關鍵問題：

1. **破底翻反轉基準偏誤**：先前以 MA20 回踩判定破底翻，而非以跌破箱底 `boxLower` 後強勢收復為準，且缺乏長上影線墓碑倒錘 (Bull Trap) 的一票否決機制。
2. **R-Multiple 階躍斷崖**：現價距離近 60 日歷史高點 0.01 元時，R-Multiple 驟然從 3.5R 暴跌至 0.1R，缺乏加權平滑期望值；且缺乏成交金額容量門檻（Dollar Volume Gate），容易引發流動性枯竭滑價。
3. **重複造輪子**：未善用既有成熟演算法（20 日主力 VWAP 成本過熱檢查、Volume Profile 上方套牢反壓峰阻斷、美股 CMF 背離偵測）。
4. **假數據污染**：在全池水合過程中調用 `generateSyntheticCandles` 注入隨機偽造行情，違反金融數據零幻覺準則；IndexedDB 2,280 檔無分塊併發查詢易導致線程堵塞。
5. **DOM 節點爆炸**：操盤導航、動能象限、扣抵望遠鏡三重視圖垂直平鋪，同一標的重複出現 4 次，總 DOM 節點高達 130,000 個，觀望池未折疊導致效能瓶頸。
6. **假安全感**：持股緩衝僅剩 0.8% 卻顯示全數守穩，大盤空頭自適應門檻未與大盤歷史日 K 實質接通。

---

## 架構決策 (Decision)

### 1. 量化防禦核升級 (Tickets 01 ~ 03)

- **箱底破底翻與墓碑倒錘**：`calculateMaDeduction(candles, boxLower)`，必須 `low < boxLower && close >= boxLower` 且下影線佔振幅 >= 50% 方確立破底翻；突破日上影線墓碑倒錘一票否決輸出 `AVOID (墓碑誘多)`。
- **加權期望值平滑化 R-Multiple**：$Target = 0.5 \times lookback60High + 0.5 \times measuredTarget$，徹底消除階躍斷崖。
- **日均成交金額容量門檻**：台股 5 日均成交金額 $\ge 30,000,000$ TWD，美股 $\ge 5,000,000$ USD，非持股低於門檻者一票否決 `AVOID (流動性不足)`。
- **零造輪子引擎複用**：無縫串接 `vwapCostEngine` (VWAP 乖離 > 10% 輸出 HOLD)、`volumeProfileEngine` (上方 5% 密集成交峰 POC 阻斷)、`smartMoneyEngine` (美股 CMF < -0.15 背離阻斷)。

### 2. 零幻覺數據水合與增量快取 (Ticket 04)

- 徹底自水合工作流移除 `generateSyntheticCandles`，未回補標的維持 `isDataPending: true` 與「🟡 數據回補中」。
- IndexedDB 查詢採 Chunk 100 分塊併發，消滅 2,280 併發線程堵塞。
- 全工作流採用 `try ... finally` 封裝，保證 `isSyncing: false` 必定重置，免疫死鎖。
- 引入 `scannedItemsMapRef` 增量快取 Map，僅重算數據變更之標的，掃描耗時由 350ms 降至 2ms。

### 3. Apple 風格分段視圖與渲染收斂 (Tickets 05 & 06)

- 頂部常駐 `ActionDirectivesHUD`，下方導入 Apple 風格分段控制器：`[ 🚦 操盤導航 ]` ⇄ `[ ⚡ 動能看板 ]` ⇄ `[ 📈 扣抵望遠鏡 ]`。
- 「🟡 觀望不碰」池預設折疊收納僅顯示前 12 檔精華，支援展開查看全量，DOM 節點降低 95%。
- `DeductionTelescopeTable` 導入 50 / 100 / ALL 分頁控制器。
- `MuscleStockCard` 封裝 `React.memo`，剪貼簿收斂至 `src/utils/clipboard.ts`。

### 4. 瀕臨破防雙重預警、大盤 Regime 與實戰快篩 (Tickets 07 & 08)

- 在庫持股警戒升級為雙重過濾：收錄「已破防 (`currentPrice < defensePrice`)」與「瀕臨破防 (`bufferPercent <= 1.5%`)」，消除假安全感。
- 基準標的日 K 真實計算大盤體系（`BULL | BEAR | NEUTRAL`），接通既有 `computeOmniIndicators` 狀態機，大盤偏空時門檻自動提升至 3.0R 且非極強 RS 禁止進場。
- 卡片右上角加入「⚡ 一鍵下單」與「⭐ 自選星號」微按鈕。
- Header 加入多維動態排序下拉選單與 5 顆實戰快篩膠囊 (`[🔥 爆量發動]`、`[⚡ 極致壓縮]`、`[🎯 高賠率]`、`[💼 在庫持股]`、`[🚨 瀕臨破線]`)。

### 5. Code Review 全面修正與架構精進 (Issue #399)

- **動態布林帶寬放寬**：若近 5 交易日內曾極致壓縮 (`<= 8.0%`)，突破當日帶寬放寬至 `<= 12.0%`，避免長紅突破瞬開帶寬遭誤殺。
- **破底翻主力成本驗證**：破底翻反轉時檢驗收盤價是否同步站回 20 日主力 VWAP 成本線，標註 `🟢 建議買進 (破底翻站回成本線)`。
- **快篩全視圖同步聯動 (Blocker 解除)**：`TrafficLightMatrix`、`DarvasQuadrantGrid` 與 `DeductionTelescopeTable` 全量對齊 `filteredItems`，點擊快篩膠囊或輸入搜尋時三大視圖 100% 同步反應。
- **統一防守指標計算 (DRY)**：導出 `calculateDefenseBufferMetrics` 統一防守價、緩衝距離、破防與瀕危判定，清除所有子組件的重複算式與死代碼。
- **排序 O(N) 預算快取**：多維排序比較器預先建立單次快取 Map，消滅 2,280 檔下 $O(N \log N)$ 指標重複運算開銷。
- **工具函式 DRY 收斂**：幣別價格格式化統一呼叫 `formatStockPrice`。

---

## 驗證結果 (Consequences & Verification)

- **單元測試驗證**：全量 271 個測試套件、2,032 隻測試 100% PASS 綠燈通過。
- **TypeScript 編譯**：`npm run build` 0 錯誤通過，生產打包 bundle 順利產出。
- **規範對齊**：Spec 0216 的 8 張 Tickets 全數標記為 `done`，Code Review 審查建議全數落實閉環。
