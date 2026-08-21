# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Document)

> **交接產生時間**：2026-08-21 14:38 (UTC+8)  
> **交接里程碑**：**V1.7 智慧掃描動態時序配股與交易時態清洗系統**（虛擬時序動態配股推進器 `Virtual Holdings Timeline`、台股現金減資向下取整 `Floor New Ratio` 縮減股數精算法、除權息 $T-1$ 前一日收盤在倉判定、零持股平倉安全守護 `Zero-Holding Shield`、全量台灣時區 `Asia/Taipei UTC+8` 解析校準、官方標的正式名稱校正、純手動匯入 ➔ 智慧掃描 ➔ 21 檔持股 100% 吻合閉環）。全量單元測試 81/81 通過 (100% Passed)，TypeScript 0 錯誤 0 警告，Vite Production Bundle 建置成功。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon003/-.git`
- **當前開發分支**：`main`
- **CI/CD 自動化**：[`.github/workflows/ci.yml`](file:///d:/APP/股票紀錄/.github/workflows/ci.yml) (GitHub Actions 綠燈)
- **測試狀態**：**81/81 通過** (100% Passed)，TypeScript 0 錯誤，Production Bundle 打包正常。
- **目前正式版本**：**V1.7**
- **隱私安全**：所有交易資料 JSON（如 `clean_trades_import_latest.json`）均受 `.gitignore` 隔離保護，杜絕個人財務資料推播至 GitHub 遠端。

---

## 🏛️ 2. 領域模型與架構決策索引 (Domain & Decisions)

1. **通用語言詞彙表**：[`CONTEXT.md`](file:///d:/APP/股票紀錄/CONTEXT.md)
   - **V1.7 新增術語**：
     - `Virtual Cumulative Holdings Timeline`（虛擬時序動態持股推進器）
     - `Floor New Ratio Capital Reduction`（台股集保整數換發減資算法）
     - `Pre-Ex-Date Resolution`（除權息 T-1 基準日在倉判定）
     - `Zero-Holding Shield`（零持股平倉安全守護）
     - 官方標的詞庫對照表（嚴格依使用者照片一順序呈現：`00403A` 至 `VT` 21 檔）
2. **架構決策紀錄 (ADR)**：
   - [`ADR-0001`](file:///d:/APP/股票紀錄/docs/adr/0001-core-architecture-and-accounting-model.md)：React 18 + TypeScript + Vite + Vanilla CSS，雙市場獨立記帳與加權平均成本模型。
   - [`ADR-0002`](file:///d:/APP/股票紀錄/docs/adr/0002-v1.1-treemap-theme-and-fee-architecture.md)：純 SVG Squarified Treemap、CSS 變數全域主題切換。
   - [`ADR-0003`](file:///d:/APP/股票紀錄/docs/adr/0003-v1.2-corporate-actions-and-date-holding-resolution.md)：統一事件流模型、純函式 `applyTradeToShares` 股數回放、資本返還扣減成本會計模型。
   - [`ADR-0004`](file:///d:/APP/股票紀錄/docs/adr/0004-full-market-live-corporate-actions-and-special-events.md)：全市場純線上多源即時掃描、5 大特殊公司行動會計核心與台股整數股數規則。
   - [`ADR-0005`](file:///d:/APP/股票紀錄/docs/adr/0005-realtime-and-delayed-market-quotes-system.md)：全市場即時與延遲多源報價引擎、交易時段智慧輪詢與自訂價格鎖定防禦架構。
   - [`ADR-0006`](file:///d:/APP/股票紀錄/docs/adr/0006-auto-usd-twd-exchange-rate-and-fallback.md)：美金台幣 (USD/TWD) 匯率自動更新、行情同步輪詢與多層平滑備援架構。
   - [`ADR-0007`](file:///d:/APP/股票紀錄/docs/adr/0007-scanner-progress-and-resume-architecture.md)：智慧掃描公司行動進度可視化、受控並行與斷點接續架構。
   - [`ADR-0008`](file:///d:/APP/股票紀錄/docs/adr/0008-virtual-holdings-timeline-and-corporate-action-accuracy.md)：**V1.7 虛擬時序動態配股與台股減資整數換發架構**。
3. **規格說明書 (PRD)**：
   - [`0001-stock-tracker-and-analyzer.md`](file:///d:/APP/股票紀錄/docs/specs/0001-stock-tracker-and-analyzer.md)（V1.0）
   - [`0002-v1-enhancements-and-treemap.md`](file:///d:/APP/股票紀錄/docs/specs/0002-v1-enhancements-and-treemap.md)（V1.1）
   - [`0003-corporate-actions-and-date-holding-resolution.md`](file:///d:/APP/股票紀錄/docs/specs/0003-corporate-actions-and-date-holding-resolution.md)（V1.2）
   - [`0004-full-market-live-corporate-actions-and-special-events.md`](file:///d:/APP/股票紀錄/docs/specs/0004-full-market-live-corporate-actions-and-special-events.md)（V1.3）
   - [`0005-realtime-and-delayed-market-quotes-system.md`](file:///d:/APP/股票紀錄/docs/specs/0005-realtime-and-delayed-market-quotes-system.md)（V1.4）
   - [`0006-auto-usd-twd-exchange-rate.md`](file:///d:/APP/股票紀錄/docs/specs/0006-auto-usd-twd-exchange-rate.md)（V1.5）
   - [`0007-corporate-action-scanner-progress-and-resume.md`](file:///d:/APP/股票紀錄/docs/specs/0007-corporate-action-scanner-progress-and-resume.md)（V1.6）
   - [`v1.7_corporate_actions_and_trades_cleaning_spec.md`](file:///d:/APP/股票紀錄/docs/specs/v1.7_corporate_actions_and_trades_cleaning_spec.md)（**V1.7：AC-1 至 AC-4 全數驗收通過**）

---

## 📂 3. 實體模組與程式碼索引 (Codebase Map)

| 模組分類 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **純線上即時掃描** | [`src/engine/corporateActionScanner.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.ts) | 升級 `virtualTrades` 虛擬時序推進器、台股現金減資換發 `Math.floor` 縮減股數算法、除權息 $T-1$ 前一日在倉判定、零持股平倉安全守護、受控並行池與斷點接續。 |
| **掃描模組測試** | [`src/engine/corporateActionScanner.test.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.test.ts) | 13 大測試案例，涵蓋虛擬時序多次配股累積、台股減資整數換發 (9927)、$T-1$ 基準日持股、零持股平倉保護、進度回呼、中斷與快取 (100% 通過)。 |
| **會計計算核心** | [`src/engine/calculator.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.ts) | 支援 12 種交易與特殊公司行動、`applyTradeToShares` 純函式計算、`getHoldingsAsOfDate` 歷史基準日持股時態回溯。 |
| **報價與匯率引擎** | [`src/engine/priceFetcher.ts`](file:///d:/APP/股票紀錄/src/engine/priceFetcher.ts) | 多源即時與延遲報價、`USDTWD=X` 自動匯率、TWSE 備援降級與 CORS 代理池。 |
| **最新純手動交易檔** | [`docs/json/clean_trades_import_latest.json`](file:///d:/APP/股票紀錄/docs/json/clean_trades_import_latest.json) | 全量台灣時區校準、不寫死任何配股與減資特例、官方名稱完整更正之純手動交易紀錄。 |

---

## 🎯 4. 歷史交付票券閉環摘要 (Ticket Summary)

### V1.7 迭代 (當前)
| 票券編號 | 標題 | 本地 Ticket | GitHub 遠端 Issue | 狀態 |
| :--- | :--- | :---: | :---: | :---: |
| **Epic** | `Feature: V1.7 智慧掃描動態時序配股與交易時態清洗系統` | [PRD v1.7](docs/specs/v1.7_corporate_actions_and_trades_cleaning_spec.md) | [#73](https://github.com/judragon003/-/issues/73) | ✅ Completed |
| **Ticket #1** | `[Engine] 實作虛擬時序動態配股推進器 (Virtual Holdings Timeline)` | [01-virtual-holdings-timeline.md](.scratch/v1.7-corporate-actions-accuracy/issues/01-virtual-holdings-timeline.md) | [#74](https://github.com/judragon003/-/issues/74) | ✅ Completed |
| **Ticket #2** | `[Engine] 實作台股現金減資整數換發 (Floor New Ratio)` | [02-floor-capital-reduction.md](.scratch/v1.7-corporate-actions-accuracy/issues/02-floor-capital-reduction.md) | [#75](https://github.com/judragon003/-/issues/75) | ✅ Completed |
| **Ticket #3** | `[Engine] 實作除權息 T-1 基準日收盤判定與零持股平倉安全守護` | [03-pre-exdate-and-zero-holding-shield.md](.scratch/v1.7-corporate-actions-accuracy/issues/03-pre-exdate-and-zero-holding-shield.md) | [#76](https://github.com/judragon003/-/issues/76) | ✅ Completed |
| **Ticket #4** | `[Data & Test] 全量交易資料時區校準 (UTC+8) 與端到端全量驗收測試` | [04-timezone-names-and-e2e-verification.md](.scratch/v1.7-corporate-actions-accuracy/issues/04-timezone-names-and-e2e-verification.md) | [#77](https://github.com/judragon003/-/issues/77) | ✅ Completed |

---

## 🔮 5. 下一階段建議主題 (Next Session Candidates)

若使用者欲啟動下一迭代版本（V1.8），建議可探索以下候選功能方向：
1. **多投資組合 / 分帳戶管理 (Multi-Portfolio Support)**：支援「長期存股倉」、「短線波段倉」、「退休帳戶」多帳號分流記帳。
2. **歷程淨值走勢與績效圖表 (Historical NAV & Performance Chart)**：繪製時間序列的總資產淨值曲線與大盤指數（如 S&P 500、加權指數）對比基準。
3. **自動股息預估與行事曆 (Dividend Forecast & Calendar)**：基於在倉持股與已公告除息日程，預估未來 12 個月現金流。

---

## 🛠️ 6. 建議接續使用的 Agent 技能 (Suggested Skills for Next Agent)

下一位 Agent 接手時，建議優先呼叫以下技能：
- **`brief-builder`** 或 **`/grill-with-docs`**：進行新需求的深入拷問與規格對齊。
- **`/to-spec` & `/to-tickets`**：產出 PRD 與可測試的微小 Tickets。
- **`Unit Test Master`** (`/tdd`)：嚴格遵循紅-綠-重構循環實作新功能。
