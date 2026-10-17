# Spec 0192: 宏觀戰情室關鍵財經催化劑倒數日曆、外部免費資料自動更新與多維度風控中樞規格 (Upcoming Catalysts Auto-Update & Macro War Room Calendar Spec)

## Problem Statement

在宏觀戰情室（Market War Room）的「關鍵財經事件倒數日曆 (Upcoming Catalysts)」模組中，畫面發生完全留白（只有卡片標題「關鍵財經事件倒數日曆」與「倒數雷達」徽章，卡片內部區域空無一物），喪失了宏觀大盤波動預警與操作方針的引導功能。

經深度調研與代碼審計，此問題暴露出以下深層架構缺陷與多角色痛點：

1. **靜態測試種子過期與嚴格過濾截斷 (Stale Seed Data & Strict Filter Clipping)**：
   - 在 `src/components/WarRoomWorkspace.tsx` 中，`DEFAULT_RAW_CATALYSTS` 寫死了 4 筆 2026 年 9 月至 10 月 2 日的事件（最後一筆為 `2026-10-02` 美國非農就業報告）。
   - 在 `src/engine/macroAdvisorEngine.ts` 的 `calculateUpcomingCatalysts()` 函式中，執行了嚴格的 `.filter((c) => c.daysLeft >= 0)`。
   - 當系統運行時間推進至 2026 年 10 月中旬（例如 `2026-10-17`）或任何晚於 10 月 2 日的時間點時，所有 4 筆預設事件的倒數天數皆小於 0（`-15` 至 `-36` 天），全部被濾除，回傳空陣列 `[]`。
2. **前端缺乏空狀態容錯與歷史封存通道 (Missing Empty State Fallback)**：
   - `WarRoomWorkspace.tsx` 直接對 `catalysts.map(...)` 渲染，未設計 `Empty State`（空狀態指引、重置按鈕或手動新增入口），導致陣列為空時高度縮減為 0，形成極差的使用者體驗。
3. **缺乏外部免費資料自動更新機制 (Missing External Free Data Pipeline)**：
   - 相比於市場四柱 (Macro Pulse) 與歷史 K 線已具備自動補水與同步管道，關鍵財經日曆為純靜態硬編碼孤島，無法自動從公開免費管道（如臺灣證券交易所 TWSE OpenAPI、Finnhub Free Tier、FRED）獲取最新公布時程。
4. **在庫持股除權息與法說會脫鉤 (Portfolio Dividend & Action Disconnect)**：
   - 系統在庫存端已具備成熟的 `receivableDividendEngine.ts` 與 `corporateActionScanner.ts`，能精確推算未來 30 天內在庫持股的除息日與發放日。然而戰情室催化劑日曆並未與個人投資組合事件合流，使投資人無法一眼洞悉手頭持股即將面臨的除息與重大事件。
5. **缺少券商與法人級多維度風控標記 (Lack of Institutional & Brokerage Depth)**：
   - 券商最在乎的「流動性擠壓日」（台指期貨每月第三個週三月結算日、美股季末第三個週五四巫日）未被納入。
   - 所有事件缺乏「衝擊度等級 (Impact: HIGH / MEDIUM / LOW)」與「影響市場 (TW / US / ALL)」標籤，且高衝擊事件（倒數 $\le 3$ 天）未能與個人的質押借貸槓桿維持率警示產生聯動。

---

## Solution

建立具備「**雙軌自適應降級、庫存事件自動匯流、外部免費端點同步、本地持久化與券商級風控標記**」的關鍵財經催化劑日曆中樞：

1. **第一軌：離線確定性前瞻種子庫 + 常態金融週期演算法 (100% 離線保底，永不留白)**：
   - **常態週期演算法 (Deterministic Periodic Engine)**：純原生 Date 演算法，自動推算未來 60 天內之「台指期貨/選擇權月結算日 (每月第 3 個週三)」、「美股四巫日 (3/6/9/12 月第 3 個週五)」以及「美國非農就業報告公布日 (每月第 1 個週五)」，零網路延遲且推算至 2030 年。
   - **2026~2027 官方前瞻排程種子庫**：收錄美聯儲 FOMC 與台灣央行理監事會已公告之排程，並具備自適應滾動機制（若當前月份所有靜態事件皆過期，自動以常態週期補充次月標準事件，杜絕留白）。
2. **第二軌：在庫持股除權息自動匯流 (Portfolio Catalysts Auto-Injection)**：
   - 自動讀取使用者庫存（`shares > 0`）於未來 30 天內即將除息與配息之日程（來源：`receivableDividendEngine.ts`），自動映射為 `EARNINGS_DIVIDEND` 類別事件並整合至倒數日曆。
3. **第三軌：外部免費資料管道與背景靜默更新 (External Free Data Mesh)**：
   - **台股端點 (100% 免費、免 Key)**：串接臺灣證券交易所 OpenAPI (`https://openapi.twse.com.tw/v1/exchangeReport/TWT48U` 除權除息預告表、`t187ap04_L` 上市公司法說會日程表)。
   - **美股與總經端點 (免費 Key / Free Tier)**：支援透過設定頁面之 API Key 管理器注入 Finnhub 免費 Key，拉取全球重磅經濟日曆 (CPI, PCE, GDP) 與美股財報日程。
   - **快取沉澱**：抓取成功後沉澱於本地 `localStorage`，設定 24 小時有效快取，避免重複呼叫。
4. **第四軌：本地持久化與自訂事件管理器 (`catalystStorage.ts`)**：
   - 比照 `macroPulseStorage.ts` 成熟模式，建立專屬本地儲存中樞，支援使用者手動新增/編輯/刪除自訂備忘事件，並提供「一鍵恢復預設日曆 (Reset)」防禦機制。
5. **第五軌：券商與法人級多維度風控標記**：
   - 擴充資料模型：新增 `impact: 'HIGH' | 'MEDIUM' | 'LOW'` 與 `targetMarket: 'TW' | 'US' | 'ALL'`。
   - 強化 AI 晨報聯動：若未來 3 天內存在 `impact === 'HIGH'` 之重磅事件（如 FOMC 決議或 CPI），且使用者質押維持率低於 180%，強制在 AI 作戰方針中警示控管槓桿與避開重大波動。
6. **第六軌：前端 UI 體驗與防禦進化**：
   - 增加**快速分類切換籤**：`全部`、`🏛️ 央行與利率`、`📊 通膨與就業`、`🎯 持股除息`、`⚡ 期貨結算`。
   - 增加**高溫倒數視覺標記**：$\le 3$ 天顯示高溫警示（`🔥 倒數 X 天`），當日登場顯示金色光暈。
   - 完善**空狀態引導 (Empty State)**：當無事件時，優雅展示說明，並提供「＋ 新增事件」與「🔄 重置預設日曆」按鈕，徹底消滅空白死角。

---

## User Stories

1. **作為系統使用者 (Retail Investor)**：
   - 當我在任何時間點（無論是 2026 年底還是 2027 年）進入宏觀戰情室時，我期望關鍵財經事件倒數日曆始終顯示未來 30~60 天內的重大財經事件，絕不會出現空無一物的留白卡片。
   - 我期望能在日曆中直接看到自己在庫持股（如台積電 2330、00878）即將到來的除息倒數，省去切換到除息頁面的麻煩。
   - 我期望能手動新增自訂事件（如「個人貸款撥款日」、「特定法說會」），並且在關閉瀏覽器後依然永久保存於本地。
2. **作為券商交易室與風控人員 (Brokerage Risk Officer)**：
   - 我期望日曆精確標註「台指期貨月結算日」與「美股四巫日」，並標示高衝擊 (HIGH) 警記，以便提醒投資人在衍生品合約結算週防範現貨大幅波動。
   - 我期望當高衝擊事件倒數 $\le 3$ 天且投資人質押維持率處於警戒水位時，AI 每日作戰方針能主動提出降槓桿與風險控制提示。
3. **作為法人機構量化分析師 (Institutional Quant)**：
   - 我期望所有總經事件具備客觀的衝擊度分類 (`HIGH` / `MEDIUM` / `LOW`) 與目標市場標註 (`TW` / `US` / `ALL`)，以便進行跨市場資產配置調節。
   - 我期望能從 TWSE 官方開放端點自動拉取已登記之上市公司法說會日程，無需手動爬蟲。
4. **作為前端架構師與維護工程師 (Frontend Engineer)**：
   - 我要求日曆模組符合 100% 離線確定性原則，在無網路、API 429 報錯或後端異常時，能毫秒級降級至本地常態演算法與種子庫，絕不使 UI 崩潰或阻塞。
   - 我要求新功能符合 KISS 原則，不引入重量級第三方套件，代碼與專案既有 `macroPulseStorage` 與 `receivableDividendEngine` 保持風格一致。

---

## Implementation Decisions

### 1. 核心資料模型擴充 (`src/types/macro.ts`)

```typescript
export type CatalystCategory =
  | 'CENTRAL_BANK'          // 央行利率與理監事會
  | 'INFLATION'             // CPI, PCE 等通膨數據
  | 'EMPLOYMENT'            // 非農就業, 失業率
  | 'EARNINGS_DIVIDEND'     // 在庫持股除權息與法說會
  | 'DERIVATIVE_SETTLEMENT' // 期貨與選擇權結算 / 四巫日
  | 'CUSTOM';               // 使用者自訂備忘

export type CatalystImpact = 'HIGH' | 'RED' | 'MEDIUM' | 'LOW';

export interface UpcomingCatalyst {
  id: string;
  name: string;
  date: string;               // YYYY-MM-DD
  daysLeft: number;           // 倒數天數 (0 為今日, 負數為過期)
  category: CatalystCategory;
  impact: CatalystImpact;     // 券商/法人衝擊度
  targetMarket?: 'ALL' | 'TW' | 'US';
  symbol?: string;            // 關聯個股代號 (如 2330.TW)
  description: string;
  isCustom?: boolean;         // 是否為使用者手動新增
  sourceUrl?: string;         // 官方來源連結 (如 TWSE 或 MOPS)
}
```

### 2. 本地儲存與自適應中樞架構 (`src/utils/catalystStorage.ts`)

- **儲存鍵值**：`STOCK_TRACKER_UPCOMING_CATALYSTS_V1`
- **四階梯資料聚合管線 (Aggregation Pipeline)**：
  1. **常態演算法動態生成 (Dynamic Periodic)**：
     - `getThirdWednesday(year, month)`：計算台指期結算日。
     - `getThirdFriday(year, month)`：計算美股月選擇權 / 四巫日 (3, 6, 9, 12 月)。
     - `getFirstFriday(year, month)`：計算美國非農就業公布日。
  2. **官方前瞻種子庫 (Rolling Seed Catalog)**：內建 2026~2027 年 FOMC、台灣央行與美國 CPI 基準排程。
  3. **在庫持股除息匯流 (Holdings Injection)**：透過純函式 `injectReceivableDividends(catalysts, dividends, asOfDate)` 自動合流。
  4. **本地持久化自訂與自適應補全**：提供 `loadStoredCatalysts()`、`saveStoredCatalysts()`、`addCustomCatalyst()`、`deleteCustomCatalyst()` 與 `resetCatalystsToDefault()`。

### 3. 外部免費資料擷取管線 (`src/engine/catalystSyncService.ts`)

- **TWSE 官方開放端點 (零 Key、官方直連)**：
  - `GET https://openapi.twse.com.tw/v1/exchangeReport/TWT48U`（除權除息預告）。
  - 若在開發環境遇到 CORS，透過本地既有中介層 `/api/market/corporate-actions/` 或安全降級處理。
- **Finnhub 免費經濟日曆 (選用)**：
  - 若 `localStorage` 中存在 Finnhub API Key，則在背景向 `https://finnhub.io/api/v1/calendar/economic` 請求未來 14 天重大事件，自動寫入本地快取。若無 Key 則靜默略過，不影響基礎體驗。

### 4. 前端 UI 元件防禦與視覺分層 (`src/components/WarRoomWorkspace.tsx`)

- **篩選籤 (Filter Tabs)**：
  - 全部 (`ALL`)
  - 🏛️ 央行利率 (`CENTRAL_BANK`)
  - 📊 通膨就業 (`INFLATION_EMPLOYMENT`)
  - 🎯 持股除息 (`EARNINGS_DIVIDEND`)
  - ⚡ 期貨結算 (`DERIVATIVE_SETTLEMENT`)
- **空狀態卡片 (Empty State Fallback)**：
  - 當過濾後無任何事件時，渲染友善指引圖標、提示文案「近期無特定分類之重大事件」，並提供「重置預設日曆」與「＋ 新增自訂事件」按鈕。
- **自訂事件彈窗 (Quick Custom Catalyst Modal)**：
  - 提供極簡彈窗，包含名稱、日期、類別、衝擊度與說明輸入欄位，一鍵儲存並持久化。

---

## Testing Decisions

遵循測試驅動開發 (TDD) 原則，先紅後綠編寫以下關鍵縫隙測試：

1. **單元測試：`src/utils/catalystStorage.test.ts`**：
   - 驗證「常態週期演算法」能正確算出任意月份（如 2026 年 10 月、11 月）的台指期第 3 個週三、四巫日與非農週五。
   - 驗證「自適應前瞻生成」在任意未來基準日（如 `2026-10-17`、`2027-01-01`）皆能回傳非空陣列，保證 `daysLeft >= 0` 的事件數量 $\ge 4$。
   - 驗證「在庫持股除息匯流」能正確將傳入之 `ReceivableDividend` 轉換為 `EARNINGS_DIVIDEND` 類別事件並按日期升冪排序。
   - 驗證本地 `localStorage` 的儲存、新增、刪除與重置恢復預設行為完全冪等。
2. **單元測試：`src/engine/macroAdvisorEngine.test.ts`**：
   - 驗證 `calculateUpcomingCatalysts()` 能正確保留擴充之 `impact`、`targetMarket` 與 `symbol` 欄位。
   - 驗證當存在 `impact === 'HIGH'` 且 `daysLeft <= 3` 時，若 `shield.marginStatus === 'WARNING'`，AI 晨報能精確給出「【重大事件逼近・嚴控質押槓桿】」之風控建言。
3. **元件與 E2E 驗證：`WarRoomWorkspace.test.tsx`**：
   - 驗證當催化劑陣列為空時，介面能正確顯示空狀態 (Empty State) 而非留白。
   - 驗證切換分類篩選標籤能正確過濾對應卡片。

---

## Out of Scope

為了嚴格恪守 KISS 原則與免費額度約束，下列項目明確排除於本次實作範圍之外：

- ❌ 架設需要付費維持的遠端雲端資料庫或外部微服務。
- ❌ 串接 Bloomberg Terminal、Refinitiv、FactSet 等昂貴商業 API。
- ❌ 開發高頻即時財經新聞爬蟲（避免觸發各國金融網站反爬蟲封鎖或專案 CORS 崩潰）。
- ❌ 實作跨交易所自動下單或保證金強制平倉等涉及券商下單 API 的重度工程。

---

## Further Notes

- 本規格書為 [ADR 0094 (宏觀戰情室與 AI 作戰方針)](../adr/0094-market-war-room-macro-liquidity-and-ai-advisor.md) 之深度補強與閉環演進。
- 本規格書資料管道設計完全對齊 [Spec 0167 (多來源免費金融資料網格與 API Key 池)](0167-multi-source-free-api-key-pool-and-external-data-mesh-spec.md) 之階梯式降級原則，以及 [Spec 0190 (全市場時序中樞與金融行事曆大一統架構)](0190-unified-financial-calendar-and-temporal-engine-spec.md) 的零 I/O 守衛精神。
- 規格書實施後，技術債 `0020` 將獲致真正具備自適應生命週期與外部免費同步能力的終極修復。
