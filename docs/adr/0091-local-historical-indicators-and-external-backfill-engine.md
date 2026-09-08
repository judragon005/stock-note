# ADR 0091: 本地全量歷史技術指標庫與免費外部資源自動回補架構 (肌肉書僮量化體系)

- **狀態**：`ACCEPTED`
- **日期**：2026-09-08
- **決策者**：AI Pair Programmer & User
- **關聯 PRD**：[PRD #0091](../specs/0091-local-historical-indicators-and-external-backfill-engine-spec.md)
- **關聯技術債**：[技術債 #0019](../debts/0019-local-historical-indicators-and-external-backfill-engine.md) (`RESOLVED`)
- **前置依賴**：[ADR 0090 (客戶端 API 速率限制與防封禁配額保護)](0090-client-side-rate-limiting-and-api-quota-guard.md)

---

## 1. 背景與脈絡 (Context)

系統先前僅將歷史價格收盤價純量儲存於 IndexedDB，缺乏完整日 K 線（高低開收成交量 OHLCV）與多天期指標時序，導致無法進行深度的技術指標研判與實戰選股診斷。

同時，為落實「肌肉書僮 (MuscleBooker)」量化短線波段核心體系，系統需要具備：
1. 箱子戰術與三日法則（Darvas Box Theory）。
2. 均線扣抵值時空望遠鏡（MA Deduction）與「底穿上」假跌破誘空型態偵測。
3. 布林通道極致壓縮 (Bollinger Squeeze)。
4. ATR 動態移動防守價 (Trailing Defense)。
5. RS 相對強度 (Relative Strength) 與投量比（過濾當沖虛胖水分）。

---

## 2. 架構決策 (Decision)

1. **底層儲存平滑升級 (`DB_VERSION = 3`)**：
   - 擴充 IndexedDB Object Stores：
     - `historicalOhlcv`（主鍵 `symbol`，存儲全量日 K 線數列）。
     - `technicalIndicators`（主鍵 `symbol`，存儲預先計算完成的肌肉書僮技術指標點位）。
   - 保證現有交易、帳戶、質押、快照數據 100% 零破壞零丟失。
2. **純函式肌肉書僮量化運算核心 (`src/engine/muscleBookerEngine.ts`)**：
   - 實作無副作用、高吞吐量的純函數指標庫，包含：
     - `detectDarvasBox`：連續 3 日不破高確認箱頂、不破低確認箱底，輸出突破/跌破/箱內狀態。
     - `calculateMaDeduction`：推算 5 日/20 日扣抵價並預判未來斜率，偵測盤中破線收盤站回的「底穿上」假跌破下影線型態。
     - `calculateBollingerSqueeze`：計算帶寬 $\text{BW} = \frac{\text{Upper} - \text{Lower}}{\text{Mid}} \times 100\%$，帶寬 $\le 8\%$ 標記極致壓縮。
     - `calculateAtrTrailingDefense`：以 $14$ 日 ATR 滾動計算波段動態移動防守價。
     - `calculateRelativeStrength`：比較個股與大盤基準之 10 日超額報酬並評定強弱等級。
     - `calculateTrustToNetVolumeRatio`：$\frac{\text{投信買超}}{\text{總成交量} - \text{當沖量}} \times 100\%$。
3. **安全背景回補調度器 (`src/engine/historicalOhlcvBackfill.ts`)**：
   - 整合 Yahoo Chart API，將掛牌以來全部歷史日 K 增量拉取並合併。
   - 請求強制經由 Phase 1 的 `globalRequestScheduler` 速率限制器，徹底杜絕 429 封禁。
   - 計算完成後自動沉澱寫入 IndexedDB，預設 6 小時新鮮度快取。

---

## 3. 結果與影響 (Consequences)

### 正面效益
- 成功為系統奠定全量 OHLCV 與肌肉書僮實戰量化體系之底層時序數據基石。
- 為後續「雙重動能輪動 (#0027)」與「宏觀戰情室 (#0020)」提供直接消費的指標與歷史走勢數據源。
- 單元測試覆蓋率 100%（全專案 52 個測試套件、584 個測試全數綠燈）。
