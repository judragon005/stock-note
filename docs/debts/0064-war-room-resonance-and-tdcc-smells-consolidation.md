# Debt 0064: 主 K 四維共鳴引擎拆解與 TDCC / 擺盪引擎 DRY 收斂

- **優先級 (Priority)**: `P3`
- **狀態 (Status)**: `OPEN`
- **發現來源**: Spec 0245 雙軸 `/code-review`（第二輪複審，Commit `e37ee29`，Issue `#605`）
- **標籤**: `Refactor` · `CleanCode` · `DRY` · `AiForceDashboard` · `TDCC`
- **預計觸發時機**: 後續擴充主 K 技術指標（如新增籌碼／布林通道支柱）或調整 TDCC 週期視覺比例時一併重構

---

## 背景與現況

Spec 0245 雙軸審查全數 PASS（零阻斷項），但記錄 4 項非阻斷架構與代碼整潔度改善空間：

1. **`buildTechnicalResonance` 長函式拆解與文案一致性**：
   - `src/engine/technicalResonanceEngine.ts`（第 205–667 行）單一函式約 462 行，集中體制判定、四維支柱（VOL / KDJ / MACD / RSI）診斷與衝突裁決，具發散式變更（Divergent Change）傾向；建議拆分為四支獨立支柱純函式。
   - 同步微調：`TechnicalResonanceCard.tsx:83` 於切換週 K / 月 K 時量能副標「5日 / 20日」改採動態 `barUnit`；`technicalResonanceEngine.ts:124` 文案「折減 60%」對齊實際權重參數 `0.65`。
2. **`3*k - 2*d` 與 Wilder RSI 對稱計算 DRY 收斂**：
   - `KLineChartCard.tsx`（第 300–305、409–414、852–856 行）出現 3 處 `3 * k - 2 * d` 後備計算；`klineOscillatorEngine.ts`（第 137–184 行）之 Wilder `RSI(14)` 與 `RSI(6)` 平均漲跌幅遞推高度對稱，可抽取共用純函式 `calcWilderRsi`。
3. **TDCC 日曆斷層輔助收斂與 X 軸時間比例距演進**：
   - `> 11` 天集保斷層門檻與日期差計算分別出現於 `scripts/market-sync/ingest-tw-tdcc.cjs`、`src/engine/aiForceMarketAssembly.ts` 與 `src/components/aiForceDashboard/cards/TdccDistributionCard.tsx`，前端兩處可共用常數與輔助函式。
   - `TdccDistributionCard.tsx` 目前對 `> 11` 天斷層繪製虛線段 (`tdcc-gap-segment`) 與動態跨度標籤，X 軸點位仍採陣列索引等距佈局，後續可評估改採按真實日曆天數之比例 X 軸映射。
