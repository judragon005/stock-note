# ADR 0240: 主力戰情室與湖倉同步中樞 Wave 1 技術債清償與防復發架構守門

- **狀態 (Status)**: Accepted
- **日期 (Date)**: 2026-11-20
- **關聯規格 (Spec)**: [docs/specs/0240-war-room-lakehouse-wave1-debt-consolidation-and-fitness-guard-spec.md](file:///d:/APP/股票紀錄/docs/specs/0240-war-room-lakehouse-wave1-debt-consolidation-and-fitness-guard-spec.md)
- **關聯 Issue**: `#594`

---

## 1. 背景與問題定義 (Context & Problem Statement)

在經歷 Spec 0237 至 Spec 0239 連續三個版本的高速演進後，主力戰情室與本地 SQLite 湖倉累積了三筆高耦合架構技術債（Debt 0060、Debt 0061 核心 3 項、Debt 0062）：
1. **單一事實來源 (SSOT) 破裂**：7 維市場健康度門檻常數在歷史回補與新鮮度服務重複硬編碼；`corporate_action_calendar` DDL 在核心模組與美股基本面模組重複宣告；美股點號/連字號代碼別名在三處各自實作；戰情室 8 張卡片與任務面板重複撰寫漲跌色票與曜石主題樣式。
2. **逾時未中止底層 I/O**：按需補齊任務於 300ms 逾時競速降級後未以 `AbortController` 主動中止底層非同步 HTTP 與子行程抓取，浪費系統網路資源；且質押追趕排程缺少中介層呼叫測試。
3. **提示詞轉接器型別逃逸與語意混淆**：以 `as unknown as` 強行將 `null` 寫入籌碼介面，且將 1000 張與 400 張大戶指標綁定至同一來源。
4. **深度投研未接通借券餘額**：主力戰情室已自 SQLite 湖倉取得 `sblBalance`，但未貫通至 7 步深度投研彈窗。
5. **巨石模組發散變化**：中介層與戰情室核心運算引擎持續膨脹，且缺乏自動化 CI 防復發測試機制。

---

## 2. 架構決策 (Architectural Decisions)

### 2.1 後端湖倉與同步管線 SSOT 收斂
- 抽離 [sync-thresholds.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/sync-thresholds.cjs)，匯出不可變 `MARKET_HEALTH_THRESHOLDS` 常數供歷史回補與新鮮度服務統一引用。
- 統一由 [sqlite-db-core.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/sqlite-db-core.cjs) 匯出 `ensureCorporateActionCalendarTable`，移除 [us-fundamentals-ingestion.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/us-fundamentals-ingestion.cjs) 重複 DDL。
- 於 [market-sync-core.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/market-sync-core.cjs) 集中實作美股點號/連字號別名正規化函式 `normalizeUsSymbol`。

### 2.2 原生 `AbortController` I/O 取消鏈
- 於 [on-demand-backfill-orchestrator.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/on-demand-backfill-orchestrator.cjs) 建立 `AbortController`，當 300ms 逾時觸發時立即呼叫 `abort()`，並將 `signal` 深度透傳至 TDCC 集保、月營收與美股基本面抓取函式，優雅攔截 `AbortError`。
- 於 [viteMarketMiddleware.test.ts](file:///d:/APP/股票紀錄/src/engine/viteMarketMiddleware.test.ts) 補齊台股董監事質押追趕任務呼叫斷言。

### 2.3 提示詞轉接層型別安全與 Zero-Mock 語意對齊
- 放寬 [strategicPrompt.ts](file:///d:/APP/股票紀錄/src/types/strategicPrompt.ts) 介面為 `number | null | undefined`，徹底拔除 [aiForcePromptAdapter.ts](file:///d:/APP/股票紀錄/src/engine/aiForcePromptAdapter.ts) 內部 `as unknown as` 型別逃逸。
- 嚴格校正集保欄位語意：`bigHolderRatioChange1000` 對齊千張大戶 4 週變化率，`bigHolderRatioChange400` 依歷史 400 張持股比率推導差值（無數據時誠實輸出 `null`），杜絕同一數值雙重冒充。

### 2.4 設計系統 Token 集中化與深度投研借券接線
- 建立 [designTokens.ts](file:///d:/APP/股票紀錄/src/constants/designTokens.ts)，提供 `resolveDirectionalPalette`（台股紅漲綠跌、美股綠漲紅跌）與 `OBSIDIAN_CARD_CONTAINER` Token，戰情室卡片全面遷移引用。
- 擴充 [equityDeepDive.ts](file:///d:/APP/股票紀錄/src/types/equityDeepDive.ts) 契約，將湖倉 `sblBalance` 注入 [EquityDeepDiveModal.tsx](file:///d:/APP/股票紀錄/src/components/equityDeepDive/EquityDeepDiveModal.tsx) 並於第 2 步呈現主力空方借券賣出餘額。

### 2.5 巨石模組職責拆解
- 自市場同步中介層抽離 [on-demand-backfill-orchestrator.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/on-demand-backfill-orchestrator.cjs)，主中介層精簡至路由分派。
- 自戰情室運算引擎抽離 [aiForceMarketAssembly.ts](file:///d:/APP/股票紀錄/src/engine/aiForceMarketAssembly.ts)（570+ 行美股組裝管線），主引擎維持對外簽章不變。

### 2.6 防復發架構適應度測試 (Architectural Fitness Guard)
- 建立 [architecturalFitnessGuard.test.ts](file:///d:/APP/股票紀錄/src/engine/architecturalFitnessGuard.test.ts)，納入單元測試管線，自動靜態攔截：門檻魔術數字、重複建表 DDL、戰情室裸寫三元色票、以及提示詞雙重型別斷言。

---

## 3. 影響與驗證 (Consequences & Verification)

- **測試與建置**：全數 8 組 Wave 1 專案測試檔（60/60 測試）與全庫 314 個測試檔全綠通過；`npm run build` TypeScript 0 錯誤。
- **技術債狀態**：Debt 0060 與 Debt 0062 標記為 `RESOLVED`；Debt 0061 標記為核心 3 項架構債已清償完畢。
