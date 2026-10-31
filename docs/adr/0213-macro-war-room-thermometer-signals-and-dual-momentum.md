# ADR 0213: 宏觀戰情室雙水溫計排版對齊防折行、持股訊號分頁膠囊與雙重動能湖倉數據審計升級 (Macro War Room Thermometer Signals and Dual Momentum)

- **狀態 (Status)**: 已接受 (Accepted)
- **日期 (Date)**: 2026-10-31
- **關聯規格 (Spec)**: [docs/specs/0213-macro-war-room-thermometer-signals-and-dual-momentum-spec.md](file:///d:/APP/股票紀錄/docs/specs/0213-macro-war-room-thermometer-signals-and-dual-momentum-spec.md)
- **關聯 Issue**: Issue #367

---

## 背景與問題陳述 (Context & Problem Statement)

在宏觀戰情室（Macro War Room）實際高頻看盤中，投資人與專業操盤團隊反映了三個直觀體驗與數據信任核心問題：
1. **溫度計排版碎裂折行**：右側「短中期波段戰術溫度計」Header 因塞入「標題 + 長徽章 (`⚠️ 拉積盤警訊`) + 分數」，在右軌寬度不足時，分數標籤發生 `25 /` 與 `100` 換行破圖，破壞視覺平衡。
2. **持股戰術訊號按鍵無操作反饋**：點擊「收合正常震盪股 (1 檔)」按鈕時，清單無任何變化，僅按鈕文字切換，令使用者困惑按鍵是否失靈。根因為清單預設在無行動訊號時 fallback 顯示前 5 檔正常股，且無明確的空狀態正向反饋。
3. **雙重動能跨資產輪動排行榜數據真偽疑慮**：冷啟動或本地 SQLite 無美股歷史日 K 時，API 返空導致分數直接渲染 `-999.0%`，讓使用者質疑是否為假數據；且缺乏數據來源審計標章與除息總報酬加回校準。

---

## 決策核心 (Decision Drivers)

- **Bloomberg / TradingView 終端嚴謹排版**：所有金融指標與分數必須強制等寬（`tabular-nums`）且嚴禁折行（`white-space: nowrap`），徽章與副標題對稱排列。
- **直覺且自帶反饋的狀態機**：廢除單一折疊狀態按鈕，導入「分頁膠囊（Tab Capsules）」；在在倉全部健康無警訊時，明確渲染「綠色安全盾卡片」，提供實戰安心感。
- **真實湖倉數據審計與冷啟動優雅降級**：卡片 Header 標示「SQLite 湖倉真實日 K 驅動 · 基準日」標章；冷啟動缺失歷史數據時優雅顯示「⏳ 水合中 / 待同步」，徹底杜絕 `-999.0%` 破圖。
- **全景聯動防護**：總經與波段雙冷（<45 且 <30）時觸發全域質押防斷頭防禦告警；雙重動能演算法支援除息還原（Total Return）。

---

## 架構變更 (Architecture Changes)

### 1. 雙水溫計標題與分數排版對稱 (`MacroDualThermometerBar.tsx`)
- 第一行僅保留標題與分數，分數容器加上 `whiteSpace: 'nowrap'`, `flexShrink: 0`, `fontVariantNumeric: 'tabular-nums'`。
- 將 `⚠️ 拉積盤警訊` 徽章下移至第二行右側，與左軌的 `建議總股票上限 ≤ XX%` 達成對稱結構。

### 2. 持股訊號分頁膠囊與綠色安全盾 (`HoldingTacticalSignalsCard.tsx`)
- 採用顯式狀態機：`activeFilter: 'actionable' | 'all'`，提供 `[ 🚨 需行動 (X) ]` 與 `[ 📑 全部在倉 (Y) ]` 兩個分頁膠囊。
- 當 `activeFilter === 'actionable'` 且需行動數為 0 時，渲染綠色「🛡️ 當前在倉全數安全續抱」正向通知卡片，告知使用者目前全數處於健康防守軌道。

### 3. 雙重動能數據源透明審計與冷啟動防護 (`WarRoomWorkspace.tsx` & `dualMomentumEngine.ts`)
- 卡片頂部新增「🟢 SQLite 湖倉真實日 K 驅動 · 基準日: YYYY-MM-DD」可信度審計標籤。
- 針對 `momentumScore <= -990`（冷啟動或歷史日 K 水合中），UI 顯示「⏳ 水合中」與「待同步」，不顯示破圖負值。
- `calculateAssetMomentum` 與 `evaluateDualMomentum` 支援傳入 `dividendAdjustments3M`，還原高息 ETF 除息總報酬缺口。
- 雙水溫計偏冷時聯動質押防斷頭警報（`isDoubleCold`）。

---

## 驗證結果 (Verification & Outcomes)

1. **單元測試**：
   - `HoldingTacticalSignalsCard.test.tsx` (3 tests 通過)
   - `MacroDualThermometerBar.test.tsx` (1 test 通過)
   - `DualMomentumAudit.test.tsx` (1 test 通過)
   - `dualMomentumDividendAdjustment.test.ts` (2 tests 通過)
2. **型別與編譯**：
   - `npm run build` TypeScript 0 錯誤，Vite 13.63s 綠燈打包完成。
