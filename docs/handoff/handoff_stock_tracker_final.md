# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Document)

> **交接產生時間**：2026-09-07 13:45 (UTC+8)  
> **當前最新里程碑**：
> - **V7.9.0 籌碼時序動態播放修正、美股 CMF 日 K 管線連接與本地歷史籌碼增量儲存系統**（泡泡依據 `currentDateIndex` 即時時序位移與 CSS 平滑滑動、彗星尾巴漸進延伸切片、在庫美股 20 日量價 Candles 注入與真實 CMF 計算、全市場焦點美股 Top 30 宇宙、本地 IndexedDB 歷史籌碼增量持久化庫）。
> - **V7.8.0 籌碼泡泡圖自適應相對縮放、2D 圓形防碰撞排斥算法與聚光燈佈局系統**（徹底解決全市場 Top 30 貼壁與重疊問題：動態自適應冪次縮放保留 25% 緩衝區、純原生 8 輪物理放鬆排斥演算法、象限守恆中軸鎖定、DOM 頂層繪製排序與滑鼠聚光燈高亮、動能散度優化）。
> - **V7.7.0 籌碼與聰明錢動態觀察儀（零基礎小白友善版、量價動能四象限泡泡圖與時序播放軌跡系統）**。
> **品質狀態**：全量單元測試 **525/525 通過 (100% Passed)**，TypeScript Strict 0 錯誤 0 警告，Vite 生產環境打包順利通過。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon003/-.git`
- **測試套件狀態**：**525/525 通過** (48 test suites / 100% 綠燈)，TypeScript 0 錯誤。
- **當前版本**：**V7.9.0**
- **隱私安全**：所有本機交易資料與 API 金鑰均受 IndexedDB / LocalStorage 本地隔離與 `.gitignore` 保護，杜絕個人財務資料推播至 GitHub 遠端。

---

## 🏛️ 2. 領域模型與架構決策索引 (Domain & Decisions)

1. **通用語言詞彙表**：[`CONTEXT.md`](file:///d:/APP/股票紀錄/CONTEXT.md)
   - **V7.9.0 核心術語**：
     - `Dynamic Temporal Playback Binding`（時序動態位移綁定與漸進尾巴）
     - `US 20-Day Daily Candles CMF Pipeline`（美股 20 日量價 Candles 注入管線）
     - `US Focus Top 30 Universe`（美股機構焦點 Top 30 宇宙）
     - `Local Incremental Chips Ingestion Engine`（本地歷史籌碼增量持久化引擎）
   - **V7.8.0 核心術語**：
     - `Adaptive Power-Law Scaling`（自適應相對冪次縮放與 25% 呼吸緩衝區）
     - `2D Circle Collision Relaxation Engine`（2D 圓形防碰撞排斥純函數演算法）
     - `Quadrant Invariant Guard`（象限中軸鎖定守門員）
     - `SVG DOM Spotlight Ordering`（DOM 頂層繪製排序與滑鼠聚光燈模式）

2. **架構決策紀錄 (最新)**：
   - [`ADR-0079`](file:///d:/APP/股票紀錄/docs/adr/0079-smart-money-temporal-playback-local-persistence-and-us-cmf-pipeline.md)：V7.9.0 籌碼時序動態播放、美股 CMF 日 K 管線與本地歷史增量庫架構。
   - [`ADR-0078`](file:///d:/APP/股票紀錄/docs/adr/0078-smart-money-bubble-collision-avoidance.md)：V7.8.0 籌碼泡泡圖自適應縮放、防碰撞排斥與聚光燈佈局架構。
   - [`ADR-0077`](file:///d:/APP/股票紀錄/docs/adr/0077-smart-money-bubble-view-and-chip-flow-dynamics.md)：V7.7.0 籌碼與聰明錢動態觀察儀架構。

3. **需求規格說明書 (最新)**：
   - [SPEC-0079](file:///d:/APP/股票紀錄/docs/specs/0079-smart-money-temporal-playback-local-persistence-and-us-cmf-pipeline-spec.md)：時序動態播放修正、美股 CMF 日 K 管線連接與本地歷史增量庫 PRD。
   - [SPEC-0078](file:///d:/APP/股票紀錄/docs/specs/0078-smart-money-bubble-collision-avoidance-and-adaptive-layout-spec.md)：自適應相對縮放、圓形防碰撞排斥與聚光燈佈局 PRD。

4. **單一版本交付紀錄存檔 (`docs/handoff/`)**：
   - [V7.9.0: 籌碼時序動態播放修正、美股 CMF 日 K 管線連接與本地歷史籌碼增量儲存系統交接紀錄](2026-09-07-v7.9.0-smart-money-temporal-playback-local-persistence-and-us-cmf-pipeline.md)
   - [V7.8.0: 籌碼泡泡圖自適應縮放、2D 防碰撞排斥算法與聚光燈佈局系統交接紀錄](2026-09-07-v7.8.0-smart-money-bubble-collision-avoidance-and-adaptive-layout.md)

5. **本地票券鏡像區 (`.scratch/`)**：
   - `.scratch/v7.9.0-smart-money-playback-and-us-pipeline/` (5/5 Completed)
   - `.scratch/v7.8.0-smart-money-bubble-collision-avoidance/` (5/5 Completed)



---

## 📂 3. 實體模組與程式碼索引 (Codebase Map)

| 模組分類 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **籌碼與動態星圖工作台** | [`src/components/ChipsWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/ChipsWorkspace.tsx) | 雙模式切換（我的在庫持倉 vs 全市場法人焦點 Top 30）、四象限即時診斷膠囊、官方籌碼重整與同步。 |
| **原生 SVG 動態泡泡圖** | [`src/components/SmartMoneyBubbleChart.tsx`](file:///d:/APP/股票紀錄/src/components/SmartMoneyBubbleChart.tsx) | 0 外部圖表庫純 SVG 渲染、四象限生活化浮水印、💡 3 秒新手速讀指南、彗星位移尾巴 (Motion Trails)、時間軸播放器 (Timeline Player)、大白話結論先行 Tooltip。 |
| **籌碼量化計算引擎** | [`src/engine/smartMoneyEngine.ts`](file:///d:/APP/股票紀錄/src/engine/smartMoneyEngine.ts) | 美股 20 日 CMF 佳慶資金流向演算法、四象限座標無量綱標準化映射、零基礎小白生活化診斷生成器 (12 tests)。 |
| **官方籌碼資料管線與快取** | [`src/engine/smartMoneyFetcher.ts`](file:///d:/APP/股票紀錄/src/engine/smartMoneyFetcher.ts) | TWSE 官方開放日報 `fund/T86` 解析、交易日自動回推重試、IndexedDB 本地持久化快取與離線秒開 (7 tests)。 |
| **原生 IndexedDB 儲存引擎** | [`src/utils/db.ts`](file:///d:/APP/股票紀錄/src/utils/db.ts) | 0 依賴原生 Promise 封裝 `StockTrackerDB`（9 大 Stores），支援 CRUD、`batchPut`、事務、10 份快照輪替淘汰、無損遷移與全庫 JSON 匯入匯出。 |
| **IndexedDB 引擎單元測試** | [`src/utils/db.test.ts`](file:///d:/APP/股票紀錄/src/utils/db.test.ts) | 9 個深度單元測試案例 (100% 綠燈通過)。 |
| **設定與時光機看板** | [`src/components/SettingsWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/SettingsWorkspace.tsx) | 券商費率、摩擦看板、API Key 管理與「時光機快照管理面板」（指標、自訂快照、鎖定切換、一鍵還原二次確認、JSON 備份）。 |
| **現金、在途與購買力引擎** | [`src/engine/cashLedgerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts) | 三層可用性核算 (`calculateAccountBalances`)、交易購買力風控 (`calculateTradingBuyingPower`)、在途時序分組 (`groupPendingSettlementsByTimeline`)、日曆解析 (`getSettlementDate`)、DRY 工廠與判定函式。 |
| **現金與在途引擎測試** | [`src/engine/cashLedgerEngine.test.ts`](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.test.ts) | 29 個單元測試案例 (100% 綠燈通過)。 |
| **現金工作台面板** | [`src/components/CashLedgerWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/CashLedgerWorkspace.tsx) | 頂部四核心可用性發光看板、在途交割時序排程面板、交割戶資金狀態網格、質押風控、流水表格三態過濾列與單筆點擊切換。 |
| **在途時序卡片子元件** | [`src/components/PendingSettlementCard.tsx`](file:///d:/APP/股票紀錄/src/components/PendingSettlementCard.tsx) | 專職渲染在途排程卡片、幣別處理與一鍵核銷互動。 |
| **收支換匯與交割彈窗** | [`src/components/CashTransactionModal.tsx`](file:///d:/APP/股票紀錄/src/components/CashTransactionModal.tsx) | 單筆收支、換匯調撥、預計交割日即時自動預填與手動狀態覆寫。 |
| **質押借貸彈窗** | [`src/components/LoanModal.tsx`](file:///d:/APP/股票紀錄/src/components/LoanModal.tsx) | 質押本金、利率、擔保品明細與三大規費（撥券費/設質費/手續費）設定。 |
| **歷史 NAV 引擎** | [`src/engine/historicalNav.ts`](file:///d:/APP/股票紀錄/src/engine/historicalNav.ts) | 歷史日 K 增量同步、遇假日 Forward-Fill、排除 relatedTradeId 避免雙重扣款 (9 tests)。 |
| **XIRR 數值求解與金流聚合引擎** | [`src/engine/xirrCalculator.ts`](file:///d:/APP/股票紀錄/src/engine/xirrCalculator.ts) | 0 依賴 Newton-Raphson + Bisection 混合求解器、30 天平滑防護、整戶/個股/週期三層級現金流聚合 (11 tests)。 |
| **XIRR 引擎單元測試** | [`src/engine/xirrCalculator.test.ts`](file:///d:/APP/股票紀錄/src/engine/xirrCalculator.test.ts) | 11 個深度單元測試案例 (100% 綠燈通過)。 |
| **XIRR 現金流透視診斷彈窗** | [`src/components/XirrDetailModal.tsx`](file:///d:/APP/股票紀錄/src/components/XirrDetailModal.tsx) | 4 格關鍵指標卡片、折現公式說明條、現金流時序明細表（含折現年數與現值 PV）。 |

---

## ⚡ 4. 常用驗證與維護指令 (Quick Verification)

```bash
# 1. 執行全量單元測試 (應 355/355 100% 通過)
npm test

# 2. 執行 TypeScript 型別嚴格檢查 (應 0 錯誤)
npx tsc --noEmit

# 3. 執行 Vite 生產環境建置 (應 0 錯誤成功打包)
npm run build
```

