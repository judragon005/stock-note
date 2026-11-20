# Spec 0240: 主力戰情室與湖倉同步中樞 Wave 1 技術債清償與防復發架構守門規格 (War Room & Lakehouse Wave 1 Technical Debt Consolidation & Architectural Fitness Guard Spec)

## Problem Statement

在經歷 Spec 0237 至 Spec 0239 連續三個版本的雙市場主力戰情室與本地 SQLite 湖倉高速演進後，專案中異動頻率最高的核心中樞（市場同步中介層、主力戰情室運算引擎、智策提示詞轉接器與前端戰情卡片群）累積了三筆高度耦合的架構技術債（技術債 0060、0061 核心 3 項、0062）。這些債務不僅增加後續演進的維護摩擦，更已產生實質的運行時資源風險與數據語意瑕疵：

1. **跨檔重複定義導致「單一事實來源（SSOT）」破裂**：
   - 湖倉 7 維欄位健康度門檻常數（融資、借券、當沖、估值、ETF 淨值）在歷史回補腳本與市場新鮮度服務兩處重複硬編碼，一旦標的檔數擴增或門檻調整，極易發生雙邊判定口徑分裂。
   - 除權息公司行動資料表（`corporate_action_calendar`）的建表 DDL 在湖倉核心模組與美股基本面攝取模組重複宣告，存在 Schema 漂移風險。
   - 美股點號與連字號代碼別名正規化（如 `BRK.B` / `BRK-B`）在市場同步中介層、美股基本面攝取與 SEC EDGAR 代理三處各自實作，容易造成跨管線標的匹配不一致。
   - 前端戰情室 7 張以上卡片與任務面板重複撰寫 `taiwan`（紅漲綠跌）與 `international`（綠漲紅跌）漲跌色票判斷，且曜石主題容器樣式（邊框與底色）散落於個別卡片局部常數中，未來調整色彩主題時必須手動多處修改。
2. **按需補齊逾時缺乏底層 I/O 中斷機制與測試盲區**：
   - 市場同步中介層對按需補齊任務採用逾時競速降級策略，雖保障前端於 2,500ms 內不卡頓，但逾時觸發時未透過原生 `AbortController` 主動中止底層 HTTP 連線與子任務，導致被放棄的請求持續佔用系統網路連線資源。
   - 伺服器啟動自動追趕流程雖已掛載台股董監事質押同步函式，但中介層單元測試尚未建立專屬的呼叫斷言，無法防止後續重構意外拔除質押追趕接線。
3. **提示詞轉接層存在型別逃逸與大戶欄位語意混用**：
   - 智策提示詞事實摘要轉接器以 `as unknown as number | undefined` 強行將 `null` 寫入僅宣告為 `number | undefined` 的籌碼介面，繞過 TypeScript 靜態型別保護。
   - 同一轉接器將 `bigHolderRatioChange1000` 與 `bigHolderRatioChange400` 兩項不同級距的大戶指標均指向同一份集保 4 週變化率來源，造成下游 AI 分析可能誤判 400 張與 1,000 張大戶為兩組獨立信號。
4. **深度投研彈窗未接通湖倉借券餘額**：
   - 主力戰情室已從 SQLite 湖倉完整取得借券賣出餘額（`sblBalance`），但開啟個股 7 步深度投研彈窗時尚未將該數據傳遞至下游籌碼分析步驟，使深度投研視圖缺少空方借券壓力視角。
5. **高頻異動巨石檔案持續膨脹且缺乏自動化防復發護欄**：
   - 市場同步中介層（近 30 天高頻異動熱點，超過 1,300 行）與主力戰情室核心運算引擎（超過 2,300 行）同時承擔多項發散職責（Divergent Change），認知負擔極高。
   - 專案目前僅靠人工 Code Review 事後登記技術債，缺乏在 CI/測試階段即時攔截「重複門檻常數、重複 DDL、雙重型別斷言、硬編碼漲跌色票」的自動化架構適應度測試（Architectural Fitness Functions）。

---

## Solution

執行 **「Wave 1 高息熱點原子清償 + 架構適應度測試防復發守門」**，在不破壞任何既有公開 API 路由、React Props 契約與數值計算結果的前提下，透過心臟不停跳搭橋式重構（先建 SSOT 旁路模組 ➔ 切換消費端 ➔ 移除舊重複碼），一次收斂技術債 0060、0061（核心 3 項）與 0062：

1. **後端湖倉與同步管線單一事實來源（SSOT）收斂**：
   - 抽離統一的湖倉 7 維健康度門檻常數模組，由歷史回補與市場新鮮度服務共同引用。
   - 由湖倉核心模組匯出單一 `corporate_action_calendar` 建表函式，消除美股基本面攝取模組的重複 DDL。
   - 於市場同步共用核心集中實作美股點號／連字號別名正規化函式，統一供中介層、美股基本面攝取與 SEC EDGAR 代理呼叫。
2. **按需補齊真中斷控制與質押追趕測試覆蓋**：
   - 在市場同步中介層的按需補齊競速降級中導入原生 `AbortController`，逾時觸發時立即呼叫 `abort()` 並將 `AbortSignal` 向下傳遞至底層非同步抓取任務，釋放無效網路 I/O。
   - 於市場同步中介層測試套件補齊台股董監事質押追趕的 mock 呼叫計數與日期參數斷言。
3. **提示詞轉接層型別安全與集保大戶語意校正**：
   - 放寬智策事實摘要籌碼介面之集保變化率與散戶人數變化型別為 `number | null | undefined`，徹底拔除 `as unknown as` 型別逃逸。
   - 依據湖倉集保真實欄位語意（400 張以上大戶持股比率 4 週變化），嚴格對齊 `bigHolderRatioChange400` 並依 Zero-Mock 原則明確區分無獨立來源之 1,000 張大戶欄位（無獨立數據時誠實輸出 `null` 或 `undefined`，不以 400 張數據冒充）。
4. **前端戰情室主題 Token 集中化與深度投研借券接線**：
   - 抽離統一的漲跌色彩主題解析純函式（支援 `taiwan` 與 `international` 雙模式），取代散落於戰情室卡片與任務面板的重複三元運算子。
   - 集中定義曜石深色卡片設計 Token（容器底色、細微邊框、陰影），供戰情室卡片統一引用。
   - 擴充個股 7 步深度投研輸入契約與彈窗介面，由主力戰情室傳入湖倉借券賣出餘額（`sblBalance`），並於第 2 步（主力籌碼分析）呈現借券賣出餘額資訊。
5. **高頻巨石模組職責拆解**：
   - 將市場同步中介層內的「按需回補與自癒調度路由」抽離為獨立子模組，維持主中介層僅負責 HTTP 路由分派與跨模組協調。
   - 將主力戰情室運算引擎中的「美股專屬微觀結構與資料組裝子流程」抽離為獨立純函式模組，降低主引擎的發散式變化壓力。
6. **植入自動化架構適應度測試（Architectural Fitness Guard）**：
   - 建立專屬的架構適應度測試套件，納入常規單元測試管線，自動靜態掃描並攔截：跨檔重複的 7 維門檻魔術數字、重複的 `corporate_action_calendar` 建表 DDL、戰情卡片內硬編碼的漲跌色票判斷、以及提示詞轉接器內的 `as unknown as` 型別逃逸。

---

## User Stories

1. As a system maintainer operating the local SQLite Lakehouse, I want all 7-dimension market health thresholds to be defined in a single shared module, so that adjusting Taiwan market coverage thresholds never causes drift between historical backfill and daily freshness checks.
2. As a database maintainer, I want `corporate_action_calendar` DDL to be owned exclusively by the SQLite core module, so that adding or altering columns never creates schema mismatch between Taiwan and US ingestion pipelines.
3. As a US equity data pipeline developer, I want ticker dot/hyphen alias normalization (such as `BRK.B` and `BRK-B`) to live in one canonical helper, so that the market middleware, Yahoo fundamentals ingestion, and SEC EDGAR proxy always resolve symbols identically.
4. As a user opening the AI Force Dashboard during slow external API responses, I want timed-out on-demand backfill requests to immediately abort their underlying network I/O via `AbortController`, so that abandoned background fetches do not leak sockets or saturate my home network.
5. As a QA engineer guarding the Lakehouse catchup scheduler, I want an automated unit test asserting that the director pledge catchup job is invoked with the expected date when pledge data is missing, so that future middleware refactors cannot silently drop pledge synchronization.
6. As a TypeScript developer maintaining the Strategic Prompt Engine, I want nullable TDCC chip change fields to be accurately typed as `number | null | undefined` without `as unknown as` assertions, so that compiler checks remain sound across prompt assembly.
7. As a Taiwan equity investor using AI strategic prompts, I want the 400-lot and 1,000-lot big-holder change fields to strictly obey Zero-Mock semantics without duplicating the same 400-lot metric into both fields, so that AI analysis never misinterprets one signal as two independent confirmations.
8. As a trader opening the 7-Step Equity Deep Dive modal from the Main Force War Room, I want the stock's Lakehouse securities lending short-sale balance (`sblBalance`) to flow into Step 2 (Main Force Chips Analysis), so that I can evaluate short-selling pressure alongside institutional flows.
9. As a frontend developer working on the Main Force War Room cards, I want a single `resolveDirectionalPalette` helper to compute profit/loss colors from `ColorThemeMode`, so that switching between Taiwan (red-up) and International (green-up) themes is guaranteed consistent across all cards and panels.
10. As a UI designer evolving the obsidian dark theme, I want shared obsidian card container tokens (background, border, shadow) centralized in a design tokens module, so that visual refinements propagate uniformly across War Room cards without manual copy-paste.
11. As a backend developer maintaining the Vite market middleware, I want on-demand Lakehouse backfill and self-healing orchestration extracted into a dedicated submodule, so that I can modify sync logic without navigating a 1,300+ line monolith.
12. As a quantitative engineer evolving US market analytics, I want US-specific dashboard assembly logic extracted from the main War Room engine into a dedicated module, so that US microstructure updates do not risk breaking Taiwan chip calculations.
13. As an engineering lead preventing technical debt recurrence, I want automated architectural fitness tests in the test suite that fail immediately if duplicate health thresholds, duplicate calendar DDL, raw directional color ternaries in War Room cards, or `as unknown as` escapes in the prompt adapter are reintroduced, so that code cleanliness is enforced mechanically rather than by manual review alone.
14. As a project contributor reviewing the Technical Debt Tracker, I want Technical Debts 0060 and 0062 marked as `RESOLVED`, and Technical Debt 0061 clearly updated to reflect that its 3 core architectural items are resolved while the remaining non-mainstream ETF AUM/expense-ratio monthly crawler is separated as an independent future enhancement, so that the registry remains 100% accurate.
15. As a user relying on existing Main Force War Room and Lakehouse features, I want all existing 21 dashboard cards, API endpoints, and historical tests to remain 100% backward compatible with zero regressions after Wave 1 refactoring.

---

## Implementation Decisions

1. **後端 7 維健康度門檻單一事實來源（SSOT）**：
   - 建立共用的同步門檻常數模組，匯出不可變的 `MARKET_HEALTH_THRESHOLDS` 物件（涵蓋日 K、三大法人、融資融券、借券、當沖、估值與 ETF 淨值門檻）。
   - 歷史回補腳本與市場新鮮度服務移除本地魔術數字宣告，全面改為解構匯入該單一來源。
2. **湖倉 DDL 與美股別名正規化集中化**：
   - 由湖倉核心模組匯出 `ensureCorporateActionCalendarTable(db)`，美股基本面攝取模組改為直接呼叫該共用函式，刪除本地重複 DDL。
   - 由市場同步共用核心模組匯出標準化的美股代碼別名產生與正規化純函式（支援點號 `.`、連字號 `-` 與大寫去空白正規化），取代中介層、Yahoo 基本面攝取與 SEC EDGAR 代理中的三份重複實作。
3. **按需補齊 `AbortController` 取消鏈設計**：
   - 按需補齊的逾時競速封裝在建立任務前初始化 `new AbortController()`，將 `controller.signal` 傳遞給任務回呼函式。
   - 當逾時門禁（沿用 Spec 0239 之首屏 300ms 非阻塞門禁，可透過參數注入以便測試）先於任務完成時，立即執行 `controller.abort()` 並清理計時器；底層抓取函式接收 `signal` 並透傳至 `fetch`，且在捕捉 `AbortError` 時優雅結束而不拋出未處理例外。
4. **提示詞轉接層契約校正（原型級型別契約決策）**：
   - 將智策事實摘要籌碼介面之相關欄位放寬為可容納 `null`（符合 Zero-Mock 原則，明確區分「未查詢」與「官方查無數據」）：
     ```ts
     bigHolderRatioChange400?: number | null;
     bigHolderRatioChange1000?: number | null;
     retailHolderCountChange?: number | null;
     ```
   - 依湖倉集保資料來源（400 張以上大戶 4 週變化率），將 `tdcc.change4WeeksRatio` 僅綁定至 `bigHolderRatioChange400`；`bigHolderRatioChange1000` 僅在資料來源明確提供 1,000 張級距變化值時才賦值，否則誠實輸出 `null`，徹底消除「雙欄位複製同一數值」的誤導與 `as unknown as` 轉型。
5. **前端漲跌色票 Helper 與曜石主題 Token 集中化**：
   - 建立純函式 `resolveDirectionalPalette(colorTheme: ColorThemeMode)`，統一回傳 `{ upColor, downColor, neutralColor, upBg, downBg }`（台灣模式紅漲 `#ef4444`／綠跌 `#10b981`；國際模式綠漲 `#10b981`／紅跌 `#ef4444`）。
   - 於設計系統 Token 模組集中定義 `OBSIDIAN_CARD_CONTAINER` 等曜石主題常數，並將戰情室相關卡片與任務面板全面遷移至共用 Helper 與 Token。
6. **深度投研彈窗借券賣出餘額（`sblBalance`）接線**：
   - 於深度投研輸入契約（`EquityDeepDiveInput`）與彈窗屬性（`EquityDeepDiveModalProps`）新增可選欄位 `sblBalance?: number`。
   - 主力戰情室呼叫深度投研彈窗時，注入湖倉摘要中的 `sblBalance`；深度投研引擎第 2 步（主力籌碼分析）在 `sblBalance` 為有效數值時，於提示詞事實與檢視摘要中呈現借券賣出餘額（單位依台股「張」口徑呈現）。
7. **巨石模組受控拆解策略（Blast Radius Control）**：
   - **市場同步中介層拆解**：將「按需補齊與自癒任務調度（含 `AbortController` 逾時封裝）」抽離為獨立子模組，主中介層保留路由註冊、請求解析與向後相容匯出，使主檔行數顯著收斂且不改動任何外部呼叫介面。
   - **主力戰情室運算引擎拆解**：將「美股專屬微觀結構與基本面報告組裝流程」抽離為獨立純函式模組，由主引擎委派呼叫，維持主引擎對外函式簽章 100% 不變。
8. **自動化架構適應度測試（Architectural Fitness Functions）**：
   - 新增輕量、純本地檔案系統靜態掃描測試，直接作為 `npm test` 的一部分執行（零外部依賴、耗時 < 1 秒），驗證四項不變量：
     1. 7 維門檻常數僅允許定義於單一門檻模組。
     2. `CREATE TABLE IF NOT EXISTS corporate_action_calendar` 全專案僅出現一次（位於湖倉核心模組）。
     3. 主力戰情室卡片目錄內不得再出現裸寫的 `colorTheme === 'international' ? '#10b981' : '#ef4444'`。
     4. 提示詞轉接器內不得存在 `as unknown as` 雙重型別斷言。
9. **技術債 0061 邊界切分決策**：
   - 技術債 0061 原文包含 3 項核心架構/韌性/測試項目與 1 項「非主流 ETF 規模與經理費率月報爬蟲」新功能。依 YAGNI 與爆炸半徑控制原則，本次 Wave 1 完整清償前 3 項，並於 0061 文件明確註記剩餘 ETF 爬蟲項獨立延後（或視專案需要後續另立 Feature Issue），避免將全新外部爬蟲與純重構混在同一個 PR。

---

## Testing Decisions

1. **測試哲學（Testing Philosophy）**：
   - 嚴格遵循黑盒行為驗證原則，僅在模組公開介面縫隙（Test Seams）驗證輸入與可觀測輸出／副作用，不對私有實作細節編寫脆性斷言。
2. **測試縫隙與受測模組（Test Seams）**：
   - **縫隙一：市場同步中介層與按需補齊調度縫隙**
     - 驗證按需補齊在逾時門禁觸發時，傳入的 `AbortSignal.aborted` 立即轉為 `true`，且降級回應不阻塞前端。
     - 補齊台股董監事質押追趕的 mock 斷言，驗證當日缺少質押資料時確實以正確交易日呼叫 `fetchAndIngestTwPledge`。
     - 驗證美股別名正規化共用函式針對點號、連字號、大小寫與空白輸入產出一致的標準代碼與候選別名陣列。
   - **縫隙二：智策提示詞事實摘要轉接器縫隙**
     - 驗證當集保資料缺漏時，`bigHolderRatioChange400`、`bigHolderRatioChange1000` 與 `retailHolderCountChange` 誠實回傳 `null`；當僅提供 400 張大戶 4 週變化率時，`bigHolderRatioChange400` 正確取值且 `bigHolderRatioChange1000` 不會錯誤複製同一數值。
   - **縫隙三：前端色票解析與深度投研引擎縫隙**
     - 驗證 `resolveDirectionalPalette` 在 `taiwan` 與 `international` 模式下回傳正確的漲跌極性色碼。
     - 驗證深度投研引擎在傳入 `sblBalance` 時，第 2 步主力籌碼分析輸出明確包含借券賣出餘額資訊；未傳入時優雅省略不報錯。
   - **縫隙四：主力戰情室雙市場運算引擎回歸縫隙**
     - 執行既有主力戰情室全量測試，確保美股子流程抽離後，21 張卡片與雙市場報告輸出與重構前 100% 等價。
   - **縫隙五：架構適應度守門測試縫隙（Architectural Fitness Guard）**
     - 驗證四項靜態不變量（單一門檻定義、單一 `corporate_action_calendar` DDL、戰情卡片零重複色票三元式、提示詞轉接器零 `as unknown as`）全部通過。
   - **縫隙六：全專案建置與回歸門禁**
     - 執行 `npm test`（100% 綠燈）與 `npm run build`（TypeScript 0 錯誤）。
3. **既有測試先例（Prior Art）**：
   - 沿用現有 `viteMarketMiddleware` 測試套件（mock 注入與狀態驗證）、`aiForcePromptAdapter` 契約測試、`equityDeepDiveEngine` 7 步提示詞測試與 `aiForceDashboardEngine` 雙市場快照斷言模式。

---

## Out of Scope

- **Wave 2 冷區 UI 巨石拆解**：本次不處理技術債 0049（`DynamicSignalsCard` 子元件拆解）與技術債 0050（`AnalysisMetricView` 5 大 Section 拆解），留待 Wave 2 獨立排程。
- **Wave 3 獨立功能專題**：本次不處理技術債 0046（NAS 中央金鑰庫與全端代理網格）與技術債 0051（未來現金流投影慣性配息動態學習引擎），亦不於本次為其另行立項。
- **非主流 ETF 規模與經理費率月報爬蟲**：技術債 0061 第 3 項（新增投信投顧公會／公開資訊觀測站 ETF 月報爬蟲與 `etf_meta` 新資料表）屬於新資料攝取功能，不在本次 Wave 1 純重構與韌性修繕範疇內。
- **既有外部 API 路由與 UI 視覺大改版**：不變更任何現有 REST 端點路徑、HTTP 回應格式或戰情室既定視覺佈局。

---

## Further Notes

- 關聯技術債：
  - `docs/debts/0060-equity-deep-dive-sbl-wiring-and-card-theme-token-convergence.md`（Wave 1 完成後標記為 `RESOLVED`）
  - `docs/debts/0061-sync-threshold-magic-numbers-and-abort-controller.md`（Wave 1 完成後更新核心 3 項為已解決，並註記第 3 項 ETF 爬蟲留待後續專題）
  - `docs/debts/0062-war-room-dual-market-code-smells-consolidation.md`（Wave 1 完成後標記為 `RESOLVED`）
- 領域文檔同步：實作完成後須同步更新 `CONTEXT.md`（新增架構適應度守門與統一路徑術語）與 `docs/debts/README.md` 索引看板。
