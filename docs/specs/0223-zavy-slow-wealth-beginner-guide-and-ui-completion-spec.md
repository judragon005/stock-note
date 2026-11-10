# 0223 Spec: Zavy 慢富週期與配置新手白話導覽、零造輪子 TermTooltip 整合與既有引擎 12 項漏接欄位全貫通規格書

## 1. 概述與元數據 (Overview & Metadata)

* **規格編號：** Spec 0223
* **標題：** Zavy 慢富週期與配置新手白話導覽、零造輪子 TermTooltip 整合與既有引擎 12 項漏接欄位全貫通 (Zavy Slow Wealth Beginner Plain-Language Guide, Zero-Reinvention TermTooltip Integration & 12 Unconnected Engine Fields Completion)
* **目標版本：** v9.17.0
* **關聯 Issue：** #494 (<https://github.com/judragon005/stock-note/issues/494>)
* **關聯 Tickets：**
  - [#495](https://github.com/judragon005/stock-note/issues/495) (Ticket 01: Zavy 慢富白話決策字典、週期/利率枚舉中文化與頂部 30 秒慢富導覽垂直切片)
  - [#496](https://github.com/judragon005/stock-note/issues/496) (Ticket 02: 鏡頭一總經三級週期羅盤新手白話 TermTooltip、免費真實替代硬數據並列與小車三態貫通)
  - [#497](https://github.com/judragon005/stock-note/issues/497) (Ticket 03: 鏡頭二市場結構寬度與去槓桿新手白話 TermTooltip、反恐慌定心丸與落底/鈍化防禦指標全貫通)
  - [#498](https://github.com/judragon005/stock-note/issues/498) (Ticket 04: 鏡頭三見自己 A/B 雙軌決策新手白話 TermTooltip、5 檔風險耐受度互動 Pills、質押還款與 SRR 防彈衣實證全貫通)
* **關聯架構決策：** [`docs/adr/0223-zavy-slow-wealth-beginner-guide-and-ui-completion.md`](file:///d:/APP/股票紀錄/docs/adr/0223-zavy-slow-wealth-beginner-guide-and-ui-completion.md)
* **規格狀態：** `APPROVED`
* **版本：** V1.0
* **建立日期：** 2026-11-10

---

## Problem Statement

在 Spec 0221 與 Spec 0222 完成 Zavy 慢富週期與雙軌配置工作區（`🐢 慢富週期與配置`）的底層真實數據驅動與引擎統一後，從「投資新手小白（Retail Beginner）」與「長期金融軟體團隊 UI/UX 認知負荷」視角進行深度審視，發現目前畫面存在 **四大認知斷層與前端漏接問題**：

1. **硬核總經與量化術語缺乏「新手三問白話轉譯（這是什麼？對我有什麼影響？我現在該怎麼做？）」**：
   * 畫面上遍布 `10Y 美債新常態 4.0%~5.5%`、`高收益債 OAS`、`CCC 垃圾債利差`、`20/60/200MA 市場寬度`、`融資去槓桿比率 >= 1.0`、`取交集極小值`、`四階減碼瀑布流`、`股息活水轉向 (Dividend-Redirect)`、`Coast-FIRE` 等專業名詞，且部分欄位直接裸露工程英文枚舉（如 `【EXPANSION】`、10 秒校準彈窗中的 `IN_RANGE_4_TO_5_5`）。
   * 專案內其實早已具備成熟的四段式新手白話浮動解讀組件 `TermTooltip`（含 `createPortal` 防裁切、80ms 懸浮防抖、視窗邊界自動翻轉，以及「💡 白話比喻 / 📊 指標含義 / 🎯 買賣操作指引 / ⚡ 當前即時診斷」四層結構）與 `GlossaryEntry` 介面，但 Zavy 工作區尚未接入，導致新手看不懂指標背後的「大局觀、勿對漣漪起反應、見自己、穿好防彈衣、把路走完」核心邏輯。
2. **初次進入工作區缺乏「30 秒慢富看盤三步驟」全景心法引導**：
   * 新手面對三大鏡頭（總經羅盤、市場寬度、A/B 雙軌決策）時，不知道應按「先看天氣（總經週期是否順風）➔ 再量體溫（寬度與融資是否洗清浮現波浪買點）➔ 最後選軌道（依心臟耐受度與防彈衣配置把路走完）」的順序閱讀。
3. **官方付費 PMI 為 `--` 時，未將本機 SQLite 與 FRED 早已算好的「免費真實替代硬數據」透明並列與誠實引導**：
   * 美國 ISM PMI 與台灣官方 PMI 屬於商業封閉調查數據，無免費公開無限制 API。當顯示 `美 ISM: -- | 台 PMI: --` 時，新手容易誤以為系統故障。
   * 事實上，本專案後端與 SQLite 湖倉早已實作 100% 免費且更客觀的官方硬數據替代指標：**「美國製造業新訂單減存貨年增率利差 (`usNewOrdersMinusInventory`)」** 與 **「台股全市場上市櫃月營收擴散指數 (`twRevenueDiffusionIndex`，營收正成長家數佔比，50 為榮枯線) 及全市場總營收年增率 (`twExportOrdersYoY`)」**，但前端卡片尚未將這些現成數據並列展示與說明，且中介層在命中 15 分鐘快取時漏掛載 `twRevenue`。
4. **底層引擎早已精算完成的「12 項高價值決策欄位與互動開關」在前端 UI 被漏接或閒置**：
   * **鏡頭一（總經羅盤）**：漏接 `tidal.narrative`（潮汐大週期白話敘事），且 `twStatus === 'LEADING_DOWN'`（台灣小車率先轉弱）時被三元運算子誤顯示為「美台週期同步」。
   * **鏡頭二（市場寬度與落底表）**：漏接 `bottomingChecklist.guidanceText`（落底核對表綜合行動指引）、各檢核項目的合格門檻 `thresholdDescription`、大盤回撤 vs 融資減幅雙數據對比，以及 `interpretation.fallbackIndicator`（十年線鈍化失效防線改看 T10YIE 與 CCC 利差插針）。
   * **鏡頭三 A 軌（波段調節與風險預算）**：
     * `onUpdateTolerance` prop 已傳入卻被命名為 `_onUpdateTolerance` 閒置未綁定 UI，導致使用者無法互動切換個人最大耐受回撤 %（10% ~ 30%）。
     * 未顯示引擎已算出的 `currentEquityWeightPercent`（使用者目前實際持股佔比 % vs 最終建議上限 % 的超配/低配對比）與 `debtRepaymentSummary`（當有股票質押借款時，「負債即負向債券」優先還本金降槓桿建議）。
   * **鏡頭三 B 軌（慢富多資產配置與退休）**：
     * 未顯示 `monteCarloFireEngine` 經 1,000 次蒙地卡羅模擬算出的 **前 10 年報酬順序風險 (`SRR`) 破產率對比**（`equityOnlyExhaustionRate` 100% 純股破產率 vs `shieldedExhaustionRate` 穿防彈衣破產率，以及風險降幅 `srrRiskReductionPercent`）。
     * 未顯示 `targetCapital30xTwd`（30 倍年支出具體台幣目標本金）、`isRebalanceRecommended / rebalanceTriggerReason`（±5% 再平衡走廊觸發狀態徽章）、`dividendRedirectDetails`（股息活水具體導流分配明細），以及當使用者持有公司債 (`corpBondPercent`) 或 REITs (`reitsPercent`) 時的「真假防彈衣純度提示」。

---

## Solution

嚴格遵循 **「KISS 原則、不過度工程化、100% 複用既有 `TermTooltip` 與三大引擎輸出、零新增基礎 UI 輪子」**，採用 **三層漸進式揭露（3-Tier Progressive Disclosure）× 反恐慌行為金融 UX（Anti-Panic Behavioral UX）** 完成全方位升級：

1. **建立單一 Zavy 白話決策字典並 100% 複用既有 `TermTooltip`（零重複造輪子）**：
   * 新增純資料常數檔 `zavyGlossary.ts`，嚴格實作既有 `GlossaryEntry` 介面，收錄三大鏡頭核心指標與心法詞條（M01~M06、B01~B04、T01~T08）。
   * 每個詞條皆以 Zavy 標誌性語氣 DNA 撰寫「💡 白話比喻（3 秒日常比喻）」、「📊 指標含義」、「🎯 買賣操作指引（綠/紅/黃三色行動準則）」與「⚡ 當前即時診斷」，直接透過既有 `<TermTooltip showIcon underline>` 掛載於三大鏡頭指標標題旁，日常版面 0 膨脹，懸浮或點擊即刻展開。
2. **頂部可收合「📖 新手 30 秒慢富導覽（看天氣 ➔ 量體溫 ➔ 穿防彈衣）」與反恐慌視覺定錨**：
   * 於工作區頂部操作列新增輕量切換按鈕 `📖 新手 30 秒導覽`，展開後呈現三步驟白話看盤心法卡；收合時零版面佔用。
   * 徹底中文化所有裸露英文枚舉（如將 `EXPANSION` 轉為 `擴張成長期`、`IN_RANGE_4_TO_5_5` 轉為 `4.0%~5.5% 新常態平衡區`）。
   * 落實反恐慌色彩心理學：當製造業上行期遇上 `20MA 寬度 < 20%` 短線急跌時，以祖母綠機會色（`#10b981`）與「🛡️ 慢富定心丸：波浪回檔黃金買點，勿對漣漪起反應」微文案安撫散戶，防止砍在阿呆谷。
3. **誠實空狀態引導 + 自動並列 SQLite 免費真實製造業與月營收替代硬數據**：
   * 修復中介層 `/api/market/macro` 15 分鐘快取分支，確保永遠附帶 `twRevenue`（台股上市櫃月營收擴散指數 `diffusionIndex` 與全市場總營收年增率 `totalRevenueYoY`）及美國製造業新訂單減存貨利差。
   * 在鏡頭一「波浪商業週期」與「美台動能輪動」卡片中，保留官方 PMI 誠實顯示（無資料時標示 `--`），並自動並列顯示 **「美新訂單-存貨利差」** 與 **「台股營收擴散指數 / 全市場營收 YoY」**，搭配白話說明消除新手對 `--` 的困惑。
4. **全數接通既有引擎已精算之 12 項漏接欄位與 A 軌 5 檔風險耐受度互動 Pills**：
   * **鏡頭一**：渲染 `tidal.narrative` 白話敘事，修正台灣小車 `LEADING_DOWN`（「台灣小車率先轉弱」）三態顯示，並補齊信心度白話說明（「代表總經數據完整度，非上漲機率」）。
   * **鏡頭二**：渲染大盤回撤 vs 融資減幅雙數據對比、`bottomingChecklist.guidanceText` 落底總結指引、各項目 `thresholdDescription` 門檻說明，以及 `interpretation.fallbackIndicator` 十年線鈍化防禦錨點。
   * **鏡頭三 A 軌**：接通 `onUpdateTolerance`，提供 `[10% 保守] [15% 穩健] [20% 平衡] [25% 積極] [30% 進取]` 五檔直覺切換 Pills；並排顯示 `currentEquityWeightPercent`（當前實際持股 % vs 建議上限 % 差距診斷）；當帳上有質押借款時自動顯示 `debtRepaymentSummary`（「負債即負向債券，優先還本金降槓桿」提醒條）。
   * **鏡頭三 B 軌**：加入 A/B 軌一句話「見自己」選軌指南；頂部顯示 `isRebalanceRecommended` 再平衡狀態徽章與原因；當持有公司債/REITs 時顯示「真假防彈衣純度提示」；展示 `dividendRedirectDetails` 股息導流明細、`targetCapital30xTwd` 30 倍退休目標金額，以及 **「🛡️ 報酬順序風險 (SRR) 防彈衣保護力：100% 純股前 10 年破產率 vs 60/20/10/10 穿防彈衣破產率對比」**。

---

## User Stories

1. **As an** 初次接觸總經與資產配置的投資新手小白，**I want** 在工作區頂部點擊「📖 新手 30 秒慢富導覽」即可展開「看天氣（鏡頭一）➔ 量體溫（鏡頭二）➔ 穿防彈衣（鏡頭三）」三步驟白話口訣，並在再次點擊時收合，**so that** 我能在 30 秒內建立 Zavy 慢富大局觀，且熟悉後收合起來不會佔用日常看盤空間。
2. **As an** 看不懂財經專有名詞的新手使用者，**I want** 將滑鼠移到（或在手機上點擊）三大鏡頭中的任何核心指標標題（如「潮汐大週期」、「波浪商業週期」、「大卡車 vs 小車」、「信用裂痕雷達 OAS/CCC」、「20/60/200MA 市場寬度」、「十年線鈍化閘門」、「融資去槓桿比率」、「落底核對表」、「個人風險預算」、「負債即負向債券」、「四階減碼瀑布流」、「真假防彈衣」、「股息活水轉向」、「30x Coast-FIRE」、「報酬順序風險 SRR」）時，立即彈出四段式白話解說卡（💡 白話比喻、📊 指標含義、🎯 買賣操作指引、⚡ 當前即時診斷），**so that** 我不用去翻閱教科書就能在 3 秒內秒懂每個數字代表什麼、對我的錢有什麼影響、以及我現在該怎麼做。
3. **As an** 閱讀總經週期與 10 秒快速校準摘要的使用者，**I want** 畫面與匯出報告中的所有週期階段與利率狀態皆以清楚的繁體中文呈現（例如顯示「【擴張成長期】」與「4.0%~5.5% 新常態平衡區」，而非裸露 `EXPANSION` 或 `IN_RANGE_4_TO_5_5`），並看到引擎算出的完整潮汐白話敘事 `tidal.narrative`，**so that** 我不會被生硬的程式英文代碼困擾。
4. **As an** 未購買付費商業 PMI 數據的一般使用者，**I want** 當官方 ISM/台灣 PMI 為 `--` 時，卡片自動並列顯示本機 SQLite 與 FRED 免 Key 管線算出的「美國製造業新訂單減存貨利差 (%)」與「台股上市櫃月營收擴散指數 (%) 及全市場營收年增率 (%)」，並在說明中誠實告知這是更客觀的免費官方硬數據替代指標，**so that** 我不會誤以為系統壞掉，且能掌握最真實的美台製造業與營收動能。
5. **As an** 觀察美台景氣輪動的投資人，**I want** 鏡頭一「美台動能輪動（大卡車 vs 小車）」能正確區分「台灣小車率先向上領先 (`LEADING_UP`)」、「台灣小車率先降溫轉弱 (`LEADING_DOWN`)」與「美台週期同步 (`SYNCHRONIZED`)」三種狀態並顯示領先月數與台灣營收/外銷年增率，**so that** 當台灣出口率先轉弱時我不會被誤導為「美台週期同步」。
6. **As an** 容易在股市大跌時恐慌殺低的散戶，**I want** 在鏡頭二看到清楚的「大盤波段回撤 % vs 融資減幅 %」雙數據對比、落底核對表每一項的合格門檻 (`thresholdDescription`)、底部的綜合落底行動指引 (`guidanceText`) 與十年線鈍化防禦錨點 (`fallbackIndicator`)，且在製造業上行期遇上 `20MA 寬度 < 20%` 時看到祖母綠色的「💎 波浪回檔黃金買點（勿對漣漪起反應）」安定提示，**so that** 我能克服恐懼、不在阿呆谷停損砍倉。
7. **As an** 探索「見自己」風險邊界的投資人，**I want** 在鏡頭三 A 軌與 B 軌切換處看到清楚的一句話選軌定位說明（A 軌適合主動波段調節、B 軌適合被動領息再平衡），並在 A 軌直接點擊 `[10% 保守] [15% 穩健] [20% 平衡] [25% 積極] [30% 進取]` 五檔風險耐受度 Pills 即時試算我的安全持股上限，同時並排看到「我目前的實際股票佔比 (`currentEquityWeightPercent`) vs 最終建議上限」的超配/低配診斷，**so that** 我能立刻知道自己現在的股票部位是否超過心臟承受極限。
8. **As an** 有使用股票質押借貸的投資人，**I want** 當我帳上有未結清的質押借款 (`loans`) 時，A 軌卡片自動浮現「🛡️ 負債即負向債券：優先償還質押本金降槓桿」建議條 (`debtRepaymentSummary`)，並在四階減碼瀑布流中清楚解釋為何先砍 Tier 1 投機/凹單股、保護 Tier 3 高股息與 Tier 4 核心底倉及 `🔒[設質鎖定]` 標的，**so that** 我能在榮景期優先消除斷頭中斷風險，確保把路走完。
9. **As an** 採用 B 軌慢富配置與準備退休的投資人，**I want** 在 B 軌看到「✅ 配置均衡 / ⚠️ 觸發 ±5% 再平衡走廊」狀態徽章、公司債/REITs 的「真假防彈衣純度提示」、股息活水轉向的具體分配明細 (`dividendRedirectDetails`)、30 倍退休金的具體台幣目標金額 (`targetCapital30xTwd`)，以及「🛡️ 報酬順序風險 (SRR) 防彈衣保護力：100% 純股前 10 年破產率 vs 60/20/10/10 穿防彈衣破產率對比」，**so that** 我能深刻理解為什麼「存量不動、拿股息買純公債與黃金防彈衣」能保護我退休前 10 年遇到大股災也不會破產。

---

## Implementation Decisions

1. **極簡架構與測試縫隙（Test Seams）**：
   * 本次升級嚴格遵循 **不重複造輪子、不過度工程化** 原則，100% 複用既有 `TermTooltip` 組件與既有引擎計算結果，收斂於 **2 個既有公開測試縫隙**：
     1. **Zavy 慢富白話字典與引擎文案中文化縫隙（`zavyGlossary.ts` + `zavySlowWealthEngine.ts` + `vite-market-middleware.cjs`）**：
        * 建立 `zavyGlossary.ts`，匯出符合 `GlossaryEntry` 介面的 `ZAVY_SLOW_WEALTH_GLOSSARY`（涵蓋 M01~M06、B01~B04、T01~T08 共 18 項核心慢富詞條）與輔助格式化純函式（如將 `WaveBusinessCyclePhase` 與 `treasury10yNewNormalStatus` 轉為繁體中文白話標籤）。
        * 於 `zavySlowWealthEngine.ts` 的 `generateZavyAnalysisReport` 與 `exportZavyReportMarkdown` 中，將 `tenSecondsExecutiveSummary` 內的 `treasury10yNewNormalStatus` 與 `wave.phase` 由英文枚舉改為繁體中文白話描述；並於 `MacroIndicatorSnapshot` 型別擴充可選欄位 `twRevenueDiffusionIndex?: number` 以承接 SQLite 算出的台股上市櫃月營收擴散指數。
        * 於 `vite-market-middleware.cjs` 的 `/api/market/macro` 路由中，修復 15 分鐘快取命中分支（`hasFreshCache`）一併回傳 `twRevenue: getTwRevenueDiffusionAndYoY(db)`，並在寫入資料庫時完整傳遞美國製造業新訂單/存貨年增率與利差欄位。
     2. **Zavy 工作區三層漸進式揭露 UI 與 12 項現成欄位全貫通縫隙（`ZavySlowWealthWorkspace.tsx` + `ZavyMacroCompassCard.tsx` + `ZavyMarketBreadthCard.tsx` + `ZavyDualTrackDecisionCard.tsx`）**：
        * `ZavySlowWealthWorkspace.tsx`：
          * 頂部新增可開合的「📖 新手 30 秒慢富導覽」三步驟橫幅（預設收合，點擊切換展開/收合）。
          * 從 `/api/market/macro` 接收 `twRevenue.diffusionIndex` 注入 `macroSnapshot.twRevenueDiffusionIndex`；從 `holdings` 匯總預估年股息傳入 `generateZavyAnalysisReport`。
        * `ZavyMacroCompassCard.tsx`：
          * 4 大指標標題掛載 `<TermTooltip showIcon entry={...} dynamicDiagnosis={...}>`，信心度徽章掛載白話解釋 Tooltip。
          * 第 1 格補齊 `tidal.narrative`；第 2 格將 `wave.phase` 轉為繁體中文徽章，並在官方 PMI 旁自動並列顯示 `美新訂單-存貨利差` 與 `台股營收擴散指數`；第 3 格修正 `LEADING_DOWN` 三態文字並顯示 `twExportOrdersYoY`（台股營收/外銷年增率）與領先月數。
        * `ZavyMarketBreadthCard.tsx`：
          * 3 大區塊標題掛載 `<TermTooltip showIcon entry={...} dynamicDiagnosis={...}>`。
          * 寬度區補齊 `interpretation.fallbackIndicator`（十年線鈍化防禦錨點）；去槓桿區並列顯示「大盤波段回撤 % vs 融資減幅 %」雙數據膠囊；落底核對表補齊各項目 `thresholdDescription` 與底部綜合行動結論 `bottomingChecklist.guidanceText`。
        * `ZavyDualTrackDecisionCard.tsx`：
          * A/B 軌切換處下方加入一句話「見自己」軌道定位說明，並掛載 `<TermTooltip showIcon>`。
          * A 軌：接通 `onUpdateTolerance` 渲染 `[10, 15, 20, 25, 30]` 五檔風險耐受度切換 Pills；於最終建議持股上限旁並排顯示 `currentEquityWeightPercent`（當前實際持股 % 與超配/低配提示）；有質押借款時渲染 `debtRepaymentSummary` 優先還款提醒條。
          * B 軌：顯示 `isRebalanceRecommended` 再平衡狀態徽章與原因；若 `corpBondPercent > 0` 或 `reitsPercent > 0` 顯示真假防彈衣純度提示；渲染 `dividendRedirectDetails` 導流明細、`targetCapital30xTwd` 30 倍目標台幣金額，以及「🛡️ 報酬順序風險 (SRR) 防彈衣保護力（100% 純股破產率 vs 穿防彈衣破產率）」對比卡。

---

## Testing Decisions

1. **測試原則（Testing Philosophy）**：
   * 嚴格遵循 TDD 紅-綠-重構（Red-Green-Refactor）循環，僅在公開介面與組件渲染輸出（Test Seams）編寫測試，驗證使用者可見的白話文案、Tooltip 掛載、12 項漏接欄位的真實渲染與 5 檔風險耐受度 Pills 的互動回呼，不測試內部私有實現細節。
2. **預計測試模組與案例**：
   * `src/engine/zavySlowWealthEngine.test.ts`：
     * 驗證 `ZAVY_SLOW_WEALTH_GLOSSARY` 18 項核心慢富詞條結構完整性（皆具備非空 `term`, `metaphor`, `meaning`, `buySignal`, `sellSignal`）與週期階段/利率狀態中文轉譯函式。
     * 驗證 `tenSecondsExecutiveSummary` 不再裸露 `IN_RANGE_4_TO_5_5` 等英文枚舉代碼，而是輸出繁體中文白話描述。
   * `src/components/zavy/ZavyMacroCompassCard.test.tsx` 及新增/擴充之 Zavy 組件測試：
     * 驗證鏡頭一渲染 `tidal.narrative`、中文週期階段名稱、台灣小車 `LEADING_DOWN` 正確顯示「台灣小車率先轉弱」、當 PMI 為空時自動展示「新訂單-存貨利差」與「台股營收擴散指數」，且點擊/懸浮標題可喚醒 `TermTooltip` 白話比喻。
     * 驗證鏡頭二渲染大盤回撤 vs 融資減幅對比、`bottomingChecklist.guidanceText` 落底總結指引與 `fallbackIndicator` 十年線防禦錨點。
     * 驗證鏡頭三 A 軌點擊 5 檔風險耐受度 Pills（如 `15% 穩健`）正確觸發 `onUpdateTolerance(15)`、並排顯示當前實際持股佔比 `currentEquityWeightPercent` 與質押還款建議 `debtRepaymentSummary`；驗證 B 軌正確顯示 30 倍目標本金 `targetCapital30xTwd`、再平衡觸發狀態與前 10 年順序風險 (`SRR`) 純股 vs 防彈衣破產率對比。
     * 驗證工作區頂部「📖 新手 30 秒慢富導覽」按鈕可展開與收合三步驟白話心法卡。

---

## Out of Scope

* 不新增任何第三方 UI 套件或自建重複的 Tooltip / Popover / Tour 輪子。
* 不修改 `rebalancingEngine.ts` 與 `monteCarloFireEngine.ts` 的底層數學運算邏輯。
* 不影響 Zavy 慢富工作區以外之其他分頁佈局。

---

## Further Notes

* 本規格將 Zavy 視角的靈魂（「大局觀、勿對漣漪起反應、見自己、穿好防彈衣、把路走完」）與專案既有工程資產（`TermTooltip`、`rebalancingEngine`、`monteCarloFireEngine`、SQLite 湖倉真實數據）做最後一哩路的無縫縫合，達成老手 3 秒巡檢、新手 3 秒秒懂的極致體驗。
