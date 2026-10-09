# 產品需求規格書 (PRD)：全市場個股 7 步深度投研引擎強化：NAS 剪貼簿高容錯雙軌傳輸、數據管線修復與券商法人級決策閉環升級 (Spec 0173)

- **版本**: v8.85.0
- **狀態**: `ready-for-agent`
- **對應技術債**: `Debt #0045` (P1)
- **架構決策 (ADR)**: ADR #0173
- **關聯 PRD**: Spec 0156 (7 步投研引擎), Spec 0140 (主力戰情室), Spec 0110 (肌肉書僮 R 倍數制), Spec 0155 (SQLite 湖倉)

---

## 1. 問題陳述 (Problem Statement)

在真實部署（如 QNAP / Synology NAS 局域網環境）與實盤交易實戰中，「全市場個股 7 步深度投研決策閉環」暴露出以下阻礙正常運作之核心缺陷與架構斷點：

### 1.1 NAS / 局域網非安全上下文導致複製按鈕完全靜默失效 (Silent Failure)
- 部署於 NAS 或內部伺服器時，使用者透過純 HTTP 局域網 IP（如 `http://192.168.1.X:3000`）存取。
- 現代瀏覽器（Chrome, Edge, Safari, Firefox）基於 W3C 安全規範，在非 HTTPS 且非 localhost 環境中將 `navigator.clipboard` 設為 `undefined`。
- 現有 [`EquityDeepDiveModal.tsx`](file:///d:/APP/股票紀錄/src/components/equityDeepDive/EquityDeepDiveModal.tsx) 與 [`EquityDeepDiveStepCard.tsx`](file:///d:/APP/股票紀錄/src/components/equityDeepDive/EquityDeepDiveStepCard.tsx) 使用 `if (typeof navigator !== 'undefined' && navigator.clipboard)` 進行判斷，導致在 NAS 環境下條件永遠為 `false`，程式碼直接靜默略過，**無複製、無報錯、無 Toast 反饋**，嚴重破壞可用性。

### 1.2 父層組件傳參缺漏造成「數據斷鏈 (Props Starvation)」
- 主呼叫端 [`App.tsx`](file:///d:/APP/股票紀錄/src/App.tsx) 與 [`AiForceDashboardView.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/AiForceDashboardView.tsx) 喚起投研彈窗時，僅傳入 `symbol`, `market`, `name`，**完全遺漏了現價行情 (`quote`)、K 線歷史 (`candles`)、在庫持倉 (`holdings`)、持倉更新回調 (`onUpdateHoldings`) 與戰情數據 (`reportContext`)**。
- **引發之連鎖崩潰**：
  1. 現價計算為 `0`，預設目標價 (+20%) 與停損價 (-8%) 無法產生，輸入框呈現空白。
  2. 第 2、5、6 步 Prompt 出現「0 TWD 定錨」、「三大法人 0 張」、「PE/PB 為 N/A」。
  3. `holdings` 永遠為空，系統永遠標記為「非在庫（觀察清單）」，「同步更新至持倉風控線」功能徹底癱瘓。
  4. 導出 PNG 快照時降級產出 0 元行情報價之殘破圖檔。

### 1.3 散戶型定性 Prompt 脫節於券商與買方法人風控標準
- 缺乏**非對稱風險報酬比（R-Multiple）**即時試算，使用者可能建立 $R < 1.5$ 之高風險負期望值交易。
- 缺乏**論點證偽條款（Kill-Switch / Thesis Invalidation）**，僅有單一價格停損，容易落入基本面崩壞卻拗單之心理偏誤。
- 籌碼分析缺少台股外資避險最關鍵之**「借券賣出 (SBL) 與券資比」**，以及處置股票分盤撮合之**「流動性折價 (Liquidity Haircut)」**警示。

### 1.4 決策最後一哩路斷鏈：手動填寫的高摩擦力
- 使用者複製 Prompt 至外部 LLM 獲得千字研報後，必須手動逐格閱讀、提煉並敲入第 7 步 5 個欄位，缺乏「一鍵智慧貼上解析 (Smart Paste)」與「系統湖倉量化指標自動帶入草稿 (Auto-Draft)」。

---

## 2. 解決方案藍圖 (Solution Blueprint)

本規格書將分四層全方位修復並升級 7 步深度投研決策閉環：

```mermaid
flowchart TD
    A[Spec 0173 投研強化] --> B[1. 跨環境高容錯剪貼簿工具 (src/utils/clipboard.ts)]
    A --> C[2. 父層數據管線端到端串接 (App.tsx / AiForceDashboardView.tsx)]
    A --> D[3. 法人級量化與風控擴充 (R-Multiple / Kill-Switch / SBL)]
    A --> E[4. 閉環極速體驗 (Smart Paste 智慧解析 / Auto-Draft 草稿)]
```

1. **核心工具層 (`src/utils/clipboard.ts`)**：
   - 封裝 `copyTextToClipboard(text: string): Promise<boolean>`，提供現代 `navigator.clipboard` 與降級 `document.execCommand('copy')` 雙軌機制，完美相容 NAS HTTP 局域網與安全沙盒。
2. **數據裝配與父層串接層**：
   - 全面補齊 `App.tsx`、`HoldingsTable.tsx` 與 `AiForceDashboardView.tsx` 傳參，注入即時報價、歷史 K 棒、本地湖倉法人、在庫持倉與回寫回調。
3. **法人級風控與 Prompt 引擎升級 (`src/engine/equityDeepDiveEngine.ts`)**：
   - 導入 **R-Multiple（報酬風險比）** 即時計算與視覺化徽章。
   - 擴充第 7 步資料模型，新增「核心論點失效條件 (Kill-Switch)」。
   - 升級 Prompt：台股納入「借券賣出 SBL / 券資比」、處置股票提示「流動性折價與滑價風險」。
4. **智慧解析回填 (Smart Paste & Auto-Draft)**：
   - 支援將外部 LLM 回覆全文貼入快速解析框，利用正則自動萃取目標價、停損價、買進理由與觀察指標。
   - 支援點擊「帶入系統量化草稿」，將箱底防線與外資動能自動預填。

---

## 3. 使用者故事與驗收準則 (User Stories & Acceptance Criteria)

### A. 跨環境剪貼簿與 NAS 相容性 (Clipboard Resilience)
1. **US-01**：作為 NAS 使用者，當我透過純 HTTP 區網 IP 存取時，點擊「📋 一鍵複製全量 Prompt」，系統應能成功將文字寫入剪貼簿，按鈕切換為「✓ 已複製」，並彈出成功 Toast，絕不靜默失敗。
2. **US-02**：作為使用者，當我點擊各步驟卡片的「📋 複製本步」時，系統應同樣使用降級安全機制成功複製該步文字。
3. **US-03**：作為極端受限瀏覽器使用者，若兩軌複製皆被系統封鎖，系統應彈出友善引導（如顯示帶有全選焦點之文字框），讓使用者能手動 Ctrl+C。

### B. 數據管線與市價風控修復 (Data Pipeline Repair)
4. **US-04**：作為使用者，從主力戰情室或庫存表開啟投研彈窗時，彈窗頂部應正確顯示標的市價，且第 7 步表單應自動根據現價預算出預設目標價 (+20%) 與停損價 (-8%)，拒絕空白。
5. **US-05**：作為持有該標的之使用者，彈窗頂部應顯示「📦 已在庫持倉」，第 7 步應展示「同步更新至在庫持倉之目標價與停損風控線」Checkbox；儲存後持倉清單中該標的之目標價/停損價應同步更新。
6. **US-06**：作為使用者，點擊「🖼️ 導出快照 PNG」時，產出之 1920x1080 圖片應包含真實行情、法人多空評級與支撐箱體，而非 0 元假數據。

### C. 券商與買方法人級決策升級 (Institutional Decision Framework)
7. **US-07**：當使用者在第 7 步輸入「目標價」與「停損價」時，系統應即時以現價計算 **R-Multiple 風報比**：
   - $R \ge 3.0$：顯示綠色「優良風報比 (3.2R)」；
   - $2.0 \le R < 3.0$：顯示藍色「合理風報比 (2.2R)」；
   - $R < 2.0$：顯示黃/紅色「警示：風報比過低 (< 2.0R)，不符機構交易紀律」。
8. **US-08**：第 7 步新增「核心論點失效條件（證偽開關 Kill-Switch）」輸入欄位，記錄基本面破壞時的強制砍倉條件。
9. **US-09**：當股票處於處置狀態（`DISPOSITION`）時，步驟 4 與步驟 7 自動帶出「⚠️ 處置分盤交易中：流動性凍結，停損點應預留額外滑價空間，並嚴控部位上限」。

### D. 智慧解析與低摩擦回填 (Smart Paste & Auto-Draft)
10. **US-10**：在第 7 步提供「📋 智慧貼上解析」按鈕與文字框，使用者直接貼上外部 AI 生成之結論全文，系統自動正則提取並回填各欄位。
11. **US-11**：提供「🪄 帶入系統量化數據」按鈕，可一鍵將戰情室之近 60 日箱底設為停損價、箱頂設為第一目標價。

---

## 4. 資料模型與契約變更 (Data Contract Changes)

### 4.1 擴充 `InvestmentMemoRecord` ([`src/types/equityDeepDive.ts`](file:///d:/APP/股票紀錄/src/types/equityDeepDive.ts))
```typescript
export interface InvestmentMemoRecord {
  symbol: string;
  name: string;
  market: MarketType;
  buyReason: string;
  targetPrice: number;
  stopLossPrice: number;
  holdingPeriodDays: number | string;
  trackingMetrics: string[];
  isWatchlist: boolean;
  syncedToHoldings?: boolean;
  createdAt: number;
  updatedAt: number;

  // 新增欄位 (Spec 0173)
  thesisInvalidation?: string; // 核心論點失效條件 (Kill-Switch)
  targetPositionWeight?: number; // 目標配置權重 (%)
  calculatedRiskRewardRatio?: number; // 預估 R-Multiple (報酬風險比)
}
```

### 4.2 共用剪貼簿工具 (`src/utils/clipboard.ts`)
```typescript
export async function copyTextToClipboard(text: string): Promise<boolean>;
```

---

## 5. 架構與實作決定 (Implementation Decisions)

1. **剪貼簿雙軌降級安全機制**：
   - 封裝於單一獨立公用函式 `src/utils/clipboard.ts`。
   - 優先調用 `navigator.clipboard.writeText`（若環境支援且處於 Secure Context）。
   - 降級調用 `document.createElement('textarea')` + `document.execCommand('copy')`，樣式設置 `position: fixed; left: -9999px; opacity: 0;`。
   - 保留 Promise 傳遞與 try/catch 防護，回傳 boolean 指標，UI 據此決定 Toast 內容。
2. **父層呼叫端數據完整注入**：
   - [`App.tsx`](file:///d:/APP/股票紀錄/src/App.tsx)：在 `deepDiveState` 擴充 `quote`, `candles`, `institutionalRecords`, `boxFloorPrice`, `boxCeilingPrice`, `statusTag`，或在 `handleOpenDeepDive` 時依據當前選取之行情與快照即時裝配。
   - 傳入 `holdings={holdings}` 與 `onUpdateHoldings={handleUpdateHoldings}`。
   - [`AiForceDashboardView.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/AiForceDashboardView.tsx)：開啟彈窗時直接傳入當前已生成的完整 `report` 作為 `reportContext`，並自動映射 `input` 相關屬性。
3. **純前端 R-Multiple 計算公式**：
   $$\text{RiskRewardRatio} = \frac{\text{targetPrice} - \text{currentPrice}}{\text{currentPrice} - \text{stopLossPrice}}$$
   若 $\text{currentPrice} \le \text{stopLossPrice}$ 或 $\text{targetPrice} \le \text{currentPrice}$，顯示「價位設定不合邏輯」。
4. **Smart Paste 正則解析器 (`src/utils/memoSmartParser.ts`)**：
   - 萃取規則包含常見繁中/簡中/英文模式：
     - 目標價：`/(?:目標價|Target Price)[：:\s]*([0-9.]+)/i`
     - 停損價：`/(?:停損價|停損|Stop Loss)[：:\s]*([0-9.]+)/i`
     - 買進理由：`/(?:買進理由|核心催化劑|Catalyst)[：:\s]*([^\n]+)/i`
     - 觀察指標：`/(?:觀察指標|追蹤指標|Tracking Metrics)[：:\s]*([^\n]+)/i`
     - 論點失效：`/(?:論點失效|證偽條件|Kill Switch)[：:\s]*([^\n]+)/i`

---

## 6. 測試策略 (Testing Decisions - TDD)

所有新模組與修復項目必須遵循紅-綠-重構 (Red-Green-Refactor) 循環，只在公開介面縫隙進行測試：

1. **`src/utils/clipboard.test.ts`**：
   - 測試 Secure Context 下成功呼叫 `navigator.clipboard.writeText`。
   - 測試 Insecure Context（`navigator.clipboard` 為 `undefined`）下成功降級至 `document.execCommand('copy')`。
   - 測試複製拋出異常時安全回傳 `false` 且不崩潰。
2. **`src/utils/memoSmartParser.test.ts`**：
   - 測試不同 LLM 格式（Claude / ChatGPT / 條列式 / 粗體 Markdown）輸出之解析正確性。
3. **`src/components/equityDeepDive/EquityDeepDiveModal.test.tsx`**：
   - 驗證傳入真實 `holdings` 時呈現「📦 已在庫持倉」與同步勾選框。
   - 驗證輸入目標價與停損價後正確渲染 R-Multiple 徽章。
   - 驗證點擊全量複製與單步複製時調用 `copyTextToClipboard` 並展示正確 Toast。
4. **回歸測試**：
   - 確保 `npm test` 100% 通過，`npm run build` TypeScript 0 錯誤。
