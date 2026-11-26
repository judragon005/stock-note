# Spec 0249: 系統免疫強化 Wave 2 — 量化指標與稅費 SSOT 收斂、共鳴引擎四態檢傷解耦與 TTM 動態現金流學習

## Problem Statement

五路正交法醫審計（Spec 0247）與 Spec 0245 / 0183 雙軸程式碼審查揭露本系統在「量化技術指標口徑、交易摩擦試算、主 K 四維共鳴裁決與未來現金流投影」四個核心計算領域存在結構性分裂與邊界漏洞（[Debt 0067](../debts/0067-quant-indicator-ssot-and-resonance-edge-defects.md)、[Debt 0064](../debts/0064-war-room-resonance-and-tdcc-smells-consolidation.md)、[Debt 0051](../debts/0051-projected-cashflow-dynamic-calendar-profile-learning.md)）：

1. **同螢幕日 K 指標口徑分裂與三套重複實作**：
   - 在主力戰情室日 K 時框下，Card 01 主圖跳過統一擺盪指標管線，直接呈現簡易 SMA RSI(14) 與無最小期數保護之早期 KD／MACD；同螢幕下方的 Card 01B 主 K 四維共鳴解碼卡則採用 Wilder RSI(14) 與最小期數嚴格門檻，導致上下兩張卡片對同一標的給出互相矛盾的技術數值。
   - 全系統之 MACD、KD、Wilder RSI、OBV、ATR 與 VWAP 存在多套平行實作，其中全能指標引擎在全平盤無漲跌序列下將 RSI 誤回傳 `100`（正確值應為 `50`）；主圖卡片內亦散落多處手動 `3*K - 2*D` 後備計算，且 Wilder RSI(14) 與 RSI(6) 遞推邏輯重複。
2. **再平衡交易摩擦試算與核心帳務稅費脫鉤**：
   - 資產配置再平衡引擎硬編碼台股 0.1425% 手續費與 0.3% 證交稅，遺漏台股 20 元最低手續費門檻，且未依標的屬性區分股票 ETF（0.1%）與債券 ETF（0%）法定證交稅率，導致小額再平衡與 ETF 調倉成本估算失真。
3. **主 K 四維共鳴引擎單體膨脹與 8 項邊界邏輯漏洞**：
   - 共鳴引擎單一函式逾 460 行，混合體制判定、四維支柱診斷與衝突裁決，具明顯發散式變更傾向，並存在 8 項邊界缺陷：
     1. 盤中零量時僅成交量支柱退回前一已結算交易日，KDJ／MACD／RSI 與 ADX 仍混入未結算盤中參考價，違反既有「盤中即時參考價不參與歷史量化模型計算」之領域邊界。
     2. KDJ 高檔／低檔鈍化分支優先於交叉判定，導致高檔死亡交叉（如 K=82 跌破 D=84）與低檔黃金交叉（如 K=18 上穿 D=16）被鈍化狀態靜默遮蔽。
     3. 總評結構體僅統計多／空／中性三態，將代表風險警訊之 `WARN` 支柱計入 `neutralCount`，造成警戒訊號蒸發。
     4. 布林壓縮變盤體制（`VOLATILITY_SQUEEZE`）在權重分配上被歸入震盪盤（壓低 MACD 權重、拉高 KDJ／RSI），與「聚焦量能表態與 MACD 柱體首發方向」之戰術文案矛盾；震盪盤文案「折減 60%」亦與實際權重參數 `0.65` 不符。
     5. 空頭總評分支漏檢 `!hasConflict`，面對底背離等衝突訊號無法降級為警戒態。
     6. 失效防線文案僅以「是否純多頭」做二元分流，導致「偏多帶警戒（`WARN`）」反而印出空頭轉強確認文案，方向完全反轉。
     7. 250 日條件勝率回測僅檢查觸發日收盤價大於 0，未守衛未來第 10 日收盤價為零或非有限值之異常資料。
     8. 共鳴解碼卡切換至週 K／月 K 時，成交量副標仍硬編碼顯示「5日／20日」。
4. **未來現金流投影優先級倒置、4.5% 假殖利率膨脹與美股除息斷鏈**：
   - 靜態內建配息表優先級高於歷史實際發放月份，無法自適應 ETF 配息頻率變更（如由年配改季配或月配）。
   - 對非內建常態庫但具歷史發放月份的標的，盲目套用 `4.5%` 固定年化殖利率，使美股大盤與科技權值股（如 VOO、AAPL、MSFT 實質殖利率約 0.45%–1.3%）未來現金流被高估 3.5 至 10 倍。
   - 本機 SQLite 除權息行事曆中僅涵蓋極少數美股標的，缺乏針對在席持倉美股之按需歷史配息入庫機制。
5. **TDCC 日曆斷層常數分散與三大核心量化引擎測試真空**：
   - 集保大戶分佈「大於 11 天」日曆斷層門檻與天數差計算分別散落於多處前端與組裝層。
   - 擺盪指標引擎、四維共鳴引擎與箱子戰術引擎目前均無獨立單元測試保護網。

---

## Solution

執行「系統免疫強化 Wave 2」，嚴守 KISS（零新增外部依賴）、Zero Mock（絕不捏造假殖利率與假指標）與既有公開介面零破壞原則，一次清償 [Debt 0067](../debts/0067-quant-indicator-ssot-and-resonance-edge-defects.md)、[Debt 0064](../debts/0064-war-room-resonance-and-tdcc-smells-consolidation.md) 與 [Debt 0051](../debts/0051-projected-cashflow-dynamic-calendar-profile-learning.md)：

1. **量化技術指標與交易摩擦 SSOT 收斂（Oscillator & Friction SSOT）**：
   - 確立統一單趟 $O(N)$ 擺盪指標引擎為全站 KDJ（含 $J = 3K - 2D$）、MACD(12,26,9) 與 Wilder RSI(14/6) 之唯一事實來源，抽取對稱共用純函式計算 Wilder RSI；Card 01 主圖於日 K、週 K、月 K 全時框一致採用同一計算源，使 Card 01 與 Card 01B 偏差嚴格達成 $\Delta = 0.00$，並移除主圖內散落之手算 $J$ 值後備。
   - 全能指標引擎與歷史技術指標引擎對齊同一套數學定義，修正全平盤無漲跌序列 RSI 必回傳 `50`（杜絕除零誤判 `100`）。
   - 資產配置再平衡之交易摩擦試算委派至核心帳務稅費計算原語，接納選填標的代碼與手續費折扣率（向後相容既有呼叫端），自動補齊台股 20 元低消、股票 ETF 0.1% 與債券 ETF 0% 法定證交稅率。
2. **主 K 四維共鳴引擎模組化解耦與四態檢傷升級（Four-State Resonance Triage）**：
   - 將單體共鳴建構函式拆解為「成交量、KDJ、MACD、RSI」四支獨立純函式支柱與主裁決編排器（主函式控制在 80 行內）。
   - **全四維統一收盤定錨**：遇盤中未結算零量 K 棒時，四維支柱與 ADX 體制判定全面退回前一已結算交易日，貫徹領域模型「盤中即時參考價不參與歷史量化模型計算」之不變量。
   - **修復全部 8 項邊界漏洞**：
     - KDJ 顯式優先處理「高檔死叉／低檔金叉」，不再被鈍化區間靜默吞沒。
     - 總評結構體新增獨立 `warnCount` 計數器，使 `bullCount + bearCount + warnCount + neutralCount === 4` 恆成立。
     - `VOLATILITY_SQUEEZE` 體制採用獨立權重組（`VOL=1.4, MACD=1.2, KDJ=0.7, RSI=0.7`，總和 4.0），精準對齊「聚焦量能表態與 MACD 柱體首發方向」文案；同步校準 `CHOPPY_RANGE` 文案與權重參數 `0.65`（折減 35%）完全一致。
     - 空頭總評分支對稱補齊 `!hasConflict` 守衛，遇底背離衝突時降級為 `WARN` 並附衝突警示。
     - 失效防線文案依「偏向方向（多方／偏多警戒 vs 空方／中性觀察）」正確分流，徹底解決 `WARN` 方向反轉。
     - 歷史 250 日條件勝率補齊 `fwd.close <= 0` 與非有限數值守衛。
     - 共鳴解碼卡依時框動態切換量能單位文案（`5日/20日`、`5週/20週`、`5月/20月`）。
3. **未來現金流 TTM 真實配息三層階梯與持倉美股按需同步（TTM Cashflow Hierarchy）**：
   - 重構現金流投影優先級為嚴格四階：`使用者自訂設定 (customPayoutRates)` > `本地湖倉／帳本 TTM 真實每股配息與慣性月份` > `內建常態配息庫 (DEFAULT_DIVIDEND_PROFILES)` > `誠實回傳 0`（全面廢除 `4.5%` 假殖利率猜測，貫徹 Zero Mock）。
   - 擴展湖倉除權息按需同步管線，支援針對在席持倉美股拉取近 2 年真實歷史除息日與每股現金股利寫入 SQLite `corporate_action_calendar`，由前端透過既有湖倉介面與帳本時序因果屏障（`payDate <= todayStr`）共同驅動動態頻率與 TTM 每股配息推算。
4. **TDCC 日曆斷層輔助收斂與核心三引擎測試防線補齊**：
   - 收斂前端與組裝層共享之 `TDCC_GAP_THRESHOLD_DAYS = 11` 常數與日曆天數差純函式（維持現有等距點位與虛線斷層標籤，不重寫 SVG 比例座標系）。
   - 補建擺盪指標引擎、四維共鳴引擎與箱子戰術引擎之獨立單元測試與交叉口徑等價測試，徹底填平量化核心測試盲區。

---

## User Stories

1. 作為在主力戰情室同時檢視 Card 01 主圖與 Card 01B 共鳴解碼卡的交易員，我希望日 K、週 K、月 K 三個時框的 K、D、J、DIF、DEA、MACD 柱與 RSI(14) 數值 100% 一致（誤差 $\Delta = 0.00$），以便不會因上下卡片數據打架而產生決策猶豫。
2. 作為檢視長期盤整或一字鎖死標的的投資者，我希望全平盤無漲跌序列的 RSI 一律回傳中性值 `50` 而非誤報超買 `100`，以便技術指標評分與 AI 建議不被極端假訊號扭曲。
3. 作為盤中檢視戰情室的交易員，我希望在盤中尚未收盤且出現零量參考 K 棒時，四維共鳴支柱與 ADX 市場體制統一退回前一已結算交易日定錨，以便量能與擺盪指標基於完全相同的交易日基準，杜絕跨日混算。
4. 作為仰賴 KDJ 轉折點操作波段的交易員，我希望高檔鈍化區發生的死亡交叉與低檔鈍化區發生的黃金交叉能被明確辨識並提示，而非被鈍化標籤靜默遮蔽。
5. 作為重視風險預警的投資者，我希望四維共鳴總評獨立統計 `warnCount`（爆量滯漲、窒息量縮、頂背離等警戒支柱），不再將警戒燈號混入中性計數，以便 0.5 秒一眼掌握真實風險數量。
6. 作為觀察布林壓縮變盤標的的波段交易員，我希望系統在 `VOLATILITY_SQUEEZE` 體制下實質提高成交量與 MACD 權重，使底層加權分數與介面提示文案 100% 言行一致。
7. 作為在空頭跌勢中尋找底背離轉折的交易員，我希望當空頭總評同時出現底背離等衝突訊號時，系統能與多頭一樣觸發 `!hasConflict` 降級為警戒態，而非盲目維持純空結論。
8. 作為收到「偏多帶警戒（`WARN`）」訊號的交易員，我希望下方的失效防線明確指出「跌破支撐或 MACD 翻綠即撤銷偏多假設」，而非錯誤印出空頭轉強確認文案。
9. 作為檢視 250 日條件勝率的投資者，我希望當歷史序列中存在零價或異常缺值 K 棒時，勝率計算能安全略過該異常樣本，不產生 `NaN` 或 `Infinity` 污染報表。
10. 作為切換週 K 與月 K 分析中長線趨勢的投資者，我希望 Card 01B 成交量副標動態顯示「5週／20週」與「5月／20月」，而非始終寫死「5日／20日」。
11. 作為執行台股個股、高股息 ETF 或美債 ETF 再平衡的慢富投資者，我希望再平衡預估交易摩擦成本精確計入台股 20 元最低手續費，以及股票 ETF 0.1%、債券 ETF 0% 之法定證交稅率，以便準確評估調倉磨耗。
12. 作為持有季配／月配台股 ETF 與多檔美股標的（如 VOO、SCHD、AAPL、MSFT）的存股族，我希望未來 12 個月現金流投影優先依據「自訂設定 > 真實 TTM 每股配息與歷史發放月份 > 內建常態庫」，不再被過時靜態表覆蓋或被 4.5% 假殖利率高估 3.5–10 倍。
13. 作為持有不配息成長股或尚未同步歷史配息紀錄冷門股的投資者，我希望系統在缺乏真實配息證據時誠實回傳 0 預估配息，絕不以假殖利率製造虛幻現金流。
14. 作為持有美股並使用本機湖倉同步的使用者，我希望系統能針對我目前在席持有的美股標的按需同步真實歷史除息行事曆入庫，使美股現金流投影開箱即用且自動適應配息頻率變動。
15. 作為維護專案的開發者，我希望主 K 共鳴引擎拆解為四支獨立純函式支柱，並補齊擺盪指標、四維共鳴與箱子戰術三大引擎的單元測試，以便未來新增指標支柱時具備高強度回歸防護。

---

## Implementation Decisions

- **決策 1（Oscillator Single Source of Truth — 全站技術指標單一事實來源）**：
  - 確立單趟 $O(N)$ 擺盪指標引擎為全站 KDJ(9,3,3 含 $J = 3K - 2D$)、MACD(12,26,9) 與 Wilder RSI(14 / 6) 之唯一計算源，內部抽取共用 `calcWilderRsi` 遞推原語消除 RSI(14) 與 RSI(6) 之對稱重複代碼。
  - Card 01 主圖於日 K 時框移除跳過邏輯，與週 K、月 K 全面走同一擺盪指標管線，同時移除元件內 3 處手算 `3 * k - 2 * d` 後備程式碼。
  - 全能指標引擎之 RSI 計算修正邊界守衛：當 `avgLoss === 0 && avgGain === 0` 時回傳 `50`（平盤中性），僅當 `avgLoss === 0 && avgGain > 0` 回傳 `100`；各引擎重疊之 MACD／KD／RSI 計算委派或對齊同一數學規格，確保跨引擎交叉驗證 $\Delta = 0.00$。
- **決策 2（Transaction Friction SSOT — 再平衡稅費收斂至核心帳務原語）**：
  - 再平衡引擎之 `estimateTransactionFriction` 改為委派核心帳務引擎之手續費與證交稅計算邏輯，擴充選填參數 `symbol?: string` 與 `discountRate?: number`（預設全額牌告 `1.0`、台股低消 `20` 元），並於 `generateCashInRebalancePlan` 與 `generateFullRebalancePlan` 傳入標的代碼，精準識別一般股 `0.3%`、股票 ETF `0.1%` 與債券 ETF `0%` 證交稅率，既有 3 參數呼叫介面 100% 向後相容。
- **決策 3（Four-State Resonance Triage & Pillar Decomposition — 共鳴引擎四態檢傷與拆解）**：
  - 將共鳴建構主函式拆解為 4 支獨立純函式支柱（`diagnoseVolumePillar`、`diagnoseKdjPillar`、`diagnoseMacdPillar`、`diagnoseRsiPillar`）與 1 支體制加權四態裁決器（`arbitrateResonanceSummary`），主編排函式行數壓縮至 80 行內。
  - **統一收盤定錨**：於共鳴建構入口先執行 `resolveVolumeAnchorCandles`，若末筆為未結算盤中零量 K 棒，所有四維支柱、ADX 體制判定與 `asOfDate` 一律統一使用回退後之已結算序列（嚴格對齊既有領域術語 `Intraday Quote Reference` 隔離規則）。
  - **KDJ 交叉優先於鈍化**：在 KDJ 支柱診斷中，先檢測當期是否發生高檔死亡交叉（`pk >= pd && k < d && k >= 70`）或低檔黃金交叉（`pk < pd && k >= d && k <= 35`），再進入一般高檔／低檔鈍化判定。
  - **四態計數與體制權重契約**（型別與權重定案）：
    ```ts
    // summary 擴充 warnCount，確保四態計數加總恆等於 4
    export interface ResonanceSummaryCounts {
      bullCount: number;
      bearCount: number;
      warnCount: number;
      neutralCount: number;
    }

    // 三組體制支柱權重矩陣（每組總和均為 4.0）
    // TRENDING_BULL / TRENDING_BEAR: VOL 1.0, KDJ 0.75, MACD 1.50, RSI 0.75
    // VOLATILITY_SQUEEZE:            VOL 1.40, KDJ 0.70, MACD 1.20, RSI 0.70
    // CHOPPY_RANGE:                  VOL 1.00, KDJ 1.35, MACD 0.65, RSI 1.35 (註：文案同步改為「權重折減 35%」對齊 0.65)
    ```
  - **空頭衝突對稱守衛與失效防線方向校準**：`hasConflict` 納入居底背離（`macdDiv === 'BULLISH' || rsiDiv === 'BULLISH'`）對稱判斷；空頭總評分支全面檢查 `!hasConflict`，衝突時降級為 `WARN` 並附明確警訊；失效防線依「是否具偏多傾向（`overallTone === 'BULL'` 或 `overallTone === 'WARN' && bullCount > bearCount`）」分流，杜絕偏多警戒印出空頭轉強防線。
  - **勝率回測異常價守衛與動態週期副標**：`computeHistoricalWinRate` 新增 `!fwd || !Number.isFinite(fwd.close) || fwd.close <= 0` 守衛；Card 01B 依 `timeframe` 動態渲染 `日 / 週 / 月` 量比標籤。
- **決策 4（TTM Cashflow Projection Hierarchy & On-Demand US Dividend Sync）**：
  - 現金流投影引擎輸入介面新增選填 `ttmDividendProfiles?: Record<string, { payoutMonths: number[]; annualPerShareDividend: number; source: 'LAKEHOUSE_TTM' | 'LEDGER_TTM' }>`，並確立嚴格四層優先級：
    1. `customPayoutRates`（使用者手動覆蓋）
    2. `ttmDividendProfiles`（SQLite `corporate_action_calendar` 或帳本近 12 個月真實 TTM 每股配息與慣性發放月，均受 `Causal Horizon Wall` 時序屏障保護）
    3. `DEFAULT_DIVIDEND_PROFILES`（僅當缺乏真實 TTM 數據時作為台灣熱門標的兜底）
    4. 無上述任一來源時**誠實回傳 `0`**（徹底移除 `4.5%` 假殖利率推估分支）。
  - 除權息同步腳本擴充「在席美股持倉按需同步」能力，拉取近 2 年真實現金股利除息日、發放日與 `cash_dividend_per_share` 寫入 SQLite `corporate_action_calendar`；既有本機查詢端點補齊批次 TTM 彙整查詢供股息日誌視圖消費。
- **決策 5（TDCC Calendar Gap DRY Convergence）**：
  - 抽取共用常數 `TDCC_GAP_THRESHOLD_DAYS = 11` 與 `calcCalendarDayGap(laterDate, earlierDate)` 純函式，統一由市場資料組裝層與集保分佈卡片共用，保留既有等距點位與虛線斷層視覺呈現（不改動 SVG X 軸座標系）。

---

## Testing Decisions

所有測試嚴格鎖定公開介面縫隙（Test Seams），僅驗證外部可觀測輸入輸出契約與跨模組等價性，不耦合內部私有函式細節：

- **Seam 1（跨引擎擺盪指標等價契約）**：建立獨立測試針對擺盪指標引擎（`enrichCandlesWithOscillators`、`resolveVolumeAnchorCandles`）與全能指標引擎（`calculateRSI`），驗證：(a) 正常序列、不足期數、全平盤（必回 `50`）、極端單邊漲跌之輸出；(b) 同一組合成日 K／週 K／月 K 序列灌入擺盪指標引擎與共鳴引擎，所有重疊指標偏差 $\max|\Delta| = 0.00$。
- **Seam 2（四維共鳴引擎 8 缺陷與體制真值表契約）**：建立獨立測試針對 `buildTechnicalResonance` 公開入口，以矩陣案例覆蓋：(a) 盤中零量 K 棒使四維支柱與 `asOfDate` 同步定錨前收；(b) 高檔死叉與低檔金叉不被鈍化遮蔽；(c) `warnCount` 獨立計數且四態加總恆為 4；(d) `VOLATILITY_SQUEEZE` 體制下量能＋MACD 主導總評與 `CHOPPY_RANGE` 文案一致；(e) 空頭遇底背離降級為 `WARN`；(f) 偏多帶警戒輸出多方失效防線；(g) `fwd.close <= 0` 安全略過不產生 `NaN`。
- **Seam 3（箱子戰術引擎公開行為契約）**：建立獨立測試針對 `detectDarvasBox`、`detectBottomPenetration`、`calculateMaDeduction`、`calculateBollingerSqueeze` 與 `isHeavyResistanceAhead`，覆蓋箱頂突破、跌破箱底、均線扣抵方向、布林壓縮帶寬與空序列防護。
- **Seam 4（再平衡稅費精確契約）**：擴充再平衡引擎既有測試，驗證台股小額交易套用 20 元低消、股票 ETF（如 `0050`、`00878`）賣出稅率 0.1%、債券 ETF（如 `00679B`）賣出稅率 0%、個股 0.3%，並驗證舊版 3 參數呼叫向後相容。
- **Seam 5（TTM 現金流三層階梯與美股除息入庫契約）**：擴充現金流投影既有測試，驗證 `custom` > `TTM 動態學習` > `DEFAULT_DIVIDEND_PROFILES` > `0` 優先順序、TTM 覆蓋過時靜態表（如 ETF 改頻率）、美股 VOO/AAPL 依據真實 TTM 配息計算且絕不觸發 4.5% 膨脹、無歷史標的誠實回傳 `0`；後端測試驗證美股持倉除息按需入庫至暫存 SQLite `corporate_action_calendar` 之冪等 `UPSERT`。
- **既有測試參考（Prior Art）**：比照專案既有純引擎測試（如 `projectedCashflowEngine.test.ts`、`rebalancingEngine.test.ts`、`muscleBookerEngine.test.ts`）與後端同步整合測試風格撰寫，確保全量 `npm test`、`npm run test:backend` 與 `npm run build` 100% 綠燈通過。

---

## Out of Scope

- **Wave 3（`Spec 0250`）**：`Debt 0063`（23 顆有效既有彈窗遷移至 `ModalShell`）與 `Debt 0068`（75 處未安裝幽靈 Tailwind 根除、`ModalShell` 原語強化與明文 E2EE prompt 汰換）。
- **Wave 4（`Spec 0251`）**：`Debt 0046` 與 `Debt 0069`（獨立加密 `vault.db`、NAS 認證邊界、前端 `React.lazy` Code-Splitting 與儲存競態修復）。
- `TdccDistributionCard` 將 SVG X 軸點位由等距佈局改寫為真實日曆天數比例映射（本波僅做常數與日期差純函式 DRY 收斂，不改動既有 SVG 座標系）。
- 針對非在席持有之全美股 1,500+ 檔標的執行全市場歷史配息爬蟲（本波僅針對在席持倉美股按需同步，嚴格控管外部 API 配額）。

---

## Further Notes

- 關聯 GitHub Issue：`#613`；對應架構決策：將於實作交付閉環建立 `ADR 0249` 並同步更新 `CONTEXT.md` 領域術語（`Oscillator Single Source of Truth`、`Four-State Resonance Triage`、`TTM Cashflow Projection Hierarchy`）。
- 清償債務項目：[Debt 0067](../debts/0067-quant-indicator-ssot-and-resonance-edge-defects.md)、[Debt 0064](../debts/0064-war-room-resonance-and-tdcc-smells-consolidation.md) 與 [Debt 0051](../debts/0051-projected-cashflow-dynamic-calendar-profile-learning.md)（完成合併後於技術債看板標記為 `RESOLVED`）。
