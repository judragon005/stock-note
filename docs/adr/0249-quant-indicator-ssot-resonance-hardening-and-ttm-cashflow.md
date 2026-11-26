# ADR 0249: 量化指標與稅費 SSOT 收斂、共鳴引擎四態檢傷解耦與 TTM 動態現金流學習 (Wave 2)

- **狀態 (Status)**: `Accepted`
- **日期 (Date)**: `2026-11-26`
- **關聯規格**: [Spec 0249](../specs/0249-quant-indicator-ssot-resonance-hardening-and-ttm-cashflow-spec.md) · GitHub Issue `#613`
- **清償債務**: [Debt 0067](../debts/0067-quant-indicator-ssot-and-resonance-edge-defects.md) · [Debt 0064](../debts/0064-war-room-resonance-and-tdcc-smells-consolidation.md) · [Debt 0051](../debts/0051-projected-cashflow-dynamic-calendar-profile-learning.md)

---

## 背景與問題 (Context)

Spec 0247 五路正交法醫審計與前期雙軸審查揭露四項量化核心分裂問題：
1. Card 01 主圖於日 K 時框跳過統一擺盪管線，與下方 Card 01B 共鳴卡形成同螢幕 RSI/KD/MACD 口徑矛盾；`omniIndicatorEngine.calculateRSI` 於全平盤無漲跌時誤回傳 `100`；`rebalancingEngine` 硬編碼稅費且漏算台股 20 元低消與 ETF 0.1% / 債券 0% 稅率。
2. `buildTechnicalResonance` 單體函式達 462 行，且存在盤中零量跨日基準分裂、KDJ 鈍化遮蔽高檔死叉／低檔金叉、`WARN` 蒸發進 `neutralCount`、`VOLATILITY_SQUEEZE` 權重與文案矛盾、空頭總評漏檢 `!hasConflict`、`WARN` 失效防線反轉、勝率回測漏檢 `fwd.close <= 0` 與週/月 K 量比文案寫死等 8 項邊界漏洞。
3. `projectedCashflowEngine` 靜態常數蓋過歷史配息月份且以 `4.5%` 假殖利率高估美股大盤／科技股 3.5–10 倍，且 SQLite 缺乏在席美股除權息按需入庫與 TTM 查詢。
4. TDCC `> 11` 天日曆斷層常數分散，且 `klineOscillatorEngine`、`technicalResonanceEngine`、`darvasBoxEngine` 缺乏獨立單元測試。

## 決策 (Decision)

1. **Oscillator & Friction SSOT**：確立 `klineOscillatorEngine.ts`（含共用 `createWilderRsiStepper`）為全站 KDJ/MACD/Wilder RSI 唯一計算源，Card 01 全時框（DAY/WEEK/MONTH）一致呼叫並清除手算 `3*K-2*D`；修正 `omniIndicatorEngine.calculateRSI` 全平盤回傳 `50`；`rebalancingEngine.estimateTransactionFriction` 委派 `calculator.ts` 稅費原語（保留 3 參數向後相容）。
2. **Four-State Resonance Triage & Decomposition**：將 `buildTechnicalResonance` 拆解為四支純函式支柱 + `arbitrateResonanceSummary`；盤中零量全四維統一前收定錨；KDJ 顯式交叉優先於鈍化；總評新增獨立 `warnCount`（四態加總恆為 4）；`VOLATILITY_SQUEEZE` 賦予獨立權重組 (`VOL 1.4 / MACD 1.2 / KDJ 0.7 / RSI 0.7`) 並校準震盪盤「折減 35%」文案；空頭補齊 `!hasConflict` 降級與 `WARN` 失效防線方向校準；Card 01B 依時框動態切換 `日/週/月` 副標。
3. **TTM Cashflow Projection Hierarchy**：確立四層階梯 `customPayoutRates > TTM 真實每股配息 (LAKEHOUSE_TTM / LEDGER_TTM) > DEFAULT_DIVIDEND_PROFILES > 0`，徹底廢除 `4.5%` 假殖利率；擴展 `on-demand-backfill-orchestrator.cjs` 支援持倉美股近 2 年真實配息冪等入庫與 TTM 查詢（受因果屏障保護）。
4. **TDCC DRY & 三引擎測試防線**：於 `aiForceMarketAssembly.ts` 抽離共用 `TDCC_GAP_THRESHOLD_DAYS = 11` 與 `calcCalendarDayGap`，並補建 `klineOscillatorEngine.test.ts`、`technicalResonanceEngine.test.ts`、`darvasBoxEngine.test.ts` 與 `spec0249-us-ttm-dividends.test.cjs`。

## 後果與權衡 (Consequences)

- **正面**：Card 01 與 Card 01B 全時框偏差嚴格為 $\Delta = 0.00$；四維共鳴 8 項邊界漏洞與測試真空全面封口；美股與改頻率 ETF 之未來現金流投影消除 3.5–10 倍虛胖誤差。
- **取捨**：TDCC SVG X 軸維持等距佈局搭配虛線斷層標示（不重寫比例座標系），以控制爆炸半徑並優先保障量化核心精度。
