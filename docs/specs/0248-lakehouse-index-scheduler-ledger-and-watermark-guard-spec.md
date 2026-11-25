# Spec 0248: 系統免疫強化 Wave 1 — SQLite 高頻表日期索引補齊、NAS 排程持久化單一帳本與三軌假性成功水位線防禦

## Problem Statement

全量法醫審計與 Spec 0246 雙軸審查揭露系統湖倉底層與 NAS 24/7 無人值守排程在「查詢效能、狀態持久性、水位線真實性與跨模組規則一致性」四個面向存在結構性債務（[Debt 0065](../debts/0065-nas-scheduler-retry-ledger-and-decomposition.md) + [Debt 0066](../debts/0066-sqlite-date-indexes-and-scheduler-watermark-poisoning.md)）：

1. **SQLite 四張高頻表缺少日期／年月首欄索引致反覆全表掃描**：集保股權分散表、台股月營收表、台股每日估值表與 ETF 每日淨值表僅建立標的優先複合索引，導致每次健康檢查（`/healthz`）、同步狀態遙測（`/api/market/sync-status`）與宏觀營收擴散查詢反覆觸發全表掃描（`SCAN`），隨歷史資料累積線性惡化 I/O 與延遲。
2. **NAS 排程重試帳本雙重維護、易失且長函式發散**：湖倉協調中樞與 NAS 自治排程器各自在記憶體內維護當日重試計數，迫使排程器在冷卻略過、Phase 1 寫價成功與 Phase 1 配額耗盡分支執行手動補償回扣；容器遇 OOM 或重啟時帳本歸零，恐引發開機暴衝重試迴圈；排程器單體巡檢函式與視窗評估函式承擔四軌邏輯與舊版相容分支，圈複雜度過高。
3. **三條排程軌道存在「假性成功水位線毒化」缺陷**：
   - **Macro 軌**：全網斷線時仍回傳全 `null` 指標物件並以 UTC 日期定錨（台北凌晨 00:00–07:59 與排程器日期錯位），入庫函式寫入空列仍回傳成功，誤導排程器推進當日水位線。
   - **Weekly 軌**：集保、除權息或月營收子任務遇網路異常內部吞錯回傳 0 筆寫入且無快取標記時，仍標記成功並推進週水位線，進而對殘缺資料觸發滾動備份。
   - **US Daily 軌**：美股全市場 1,500+ 檔標的僅成功 1 檔（其餘大量失敗）即判定同步成功並推進美股水位線，掩蓋大面積同步失敗。
4. **審計腳本與平行行情解析器規則漂移**：防漏水稽核模組硬編碼過期 2026 休市日曆而未引用共享休市日曆引擎；台股收盤行情平行解析與入庫模組未套用共享櫃買權證濾除規則，導致跨路徑入庫標的集合不一致。

---

## Solution

執行「系統免疫強化 Wave 1」，嚴守零新增外部依賴（KISS）與既有公開介面零破壞原則，一次清償 [Debt 0065](../debts/0065-nas-scheduler-retry-ledger-and-decomposition.md) 與 [Debt 0066](../debts/0066-sqlite-date-indexes-and-scheduler-watermark-poisoning.md)：

1. **SQLite Date-First Index Convergence（高頻表日期首欄索引收斂）**：為集保分佈、月營收、每日估值與 ETF 每日淨值四張大表補齊日期／年月首欄索引，確保健康檢查與新鮮度探針於 `EXPLAIN QUERY PLAN` 達成零 `SCAN`。
2. **Persistent Scheduler Lane Ledger SSOT & Decomposition（持久化單一排程帳本與分軌拆解）**：於 SQLite 建立單一 `scheduler_lane_state` 持久化表統一保存五個配額／軌道鍵值（`twDaily`、`twPhase1`、`usDaily`、`macro`、`weekly`）之水位線、當日重試計數、冷卻時間戳、執行狀態與階段；由湖倉協調中樞統一讀寫（無 SQLite 環境自動優雅降級回記憶體），NAS 排程器改採唯讀查詢徹底消滅雙重帳本與手動回扣，並將單體長函式拆解為獨立分軌決策與執行輔助函式。
3. **Tri-Lane Watermark Poisoning Guard（三軌假性成功水位線防禦）**：
   - **Macro 軌**：預設日期定錨統一改用台北時間（`Asia/Taipei`），對齊排程器日曆；入庫前驗證 21 項數值指標至少有 1 項為有限數值，全空列拒絕寫入並回傳失敗。
   - **Weekly 軌**：任一子任務回傳顯式失敗、錯誤訊息非空，或寫入筆數為 `0` 且未標記快取／略過／最新狀態時，一律判定該子項失敗，禁止推進水位線與執行滾動備份。
   - **US Daily 軌**：於門檻單一事實來源定義最低有效完成率（`0.8`），僅當目標總數大於 0 且有效完成率（成功＋已略過 / 總目標數）達門檻以上且未觸發熔斷或取消時，始判定成功並推進水位線。
4. **Calendar & Warrant Rule SSOT Convergence（日曆與權證過濾單一化）**：稽核模組移除硬編碼 2026 休市集合，改委派共享交易日曆引擎；台股收盤行情解析與入庫模組保留既有匯出簽章，統一接入共享櫃買權證濾除規則。

---

## User Stories

1. 作為長期運行 24/7 QNAP NAS 湖倉的維運者，我希望集保、月營收、每日估值與 ETF 淨值四張高頻表具備日期／年月首欄索引，以便 `/healthz`、`/api/market/sync-status` 與宏觀擴散查詢不再全表掃描，維持常數級低延遲。
2. 作為面臨容器 OOM 或系統重啟的 NAS 維運者，我希望各軌道的水位線、當日重試計數與冷卻時間持久化於 SQLite 單一帳本，以便重啟後不會遺失進度或重設配額引發暴衝重試迴圈。
3. 作為維護排程系統的工程師，我希望重試帳本由協調中樞單一管理且排程器僅做唯讀查詢，徹底消除雙重狀態同步與手動 `retryCount - 1` 補償回扣。
4. 作為後續擴充新市場軌道的開發者，我希望 NAS 自治排程器將四條軌道的視窗評估與執行邏輯拆解為獨立小函式，降低圈複雜度且 100% 保留現有公開介面與舊版測試相容性。
5. 作為依賴總經情緒指標的投資者，我希望宏觀同步統一以台北日期定錨，且在全網斷線回傳全 `null` 數據時拒絕寫入空列並禁止推進水位線，以便網路恢復後能自動重試補齊真實數據。
6. 作為依賴每週集保與月營收更新的投資者，我希望任一每週子任務遭遇靜默網路失敗（回傳 0 筆且無快取標記）時不會誤判成功或觸發滾動備份，確保備份快照永遠基於完整資料。
7. 作為追蹤美股全市場 1,500+ 檔標的的投資者，我希望美股同步在僅成功極少數標的（有效完成率低於 80%）時視為失敗且不推進水位線，避免系統誤以為美股已更新完成而遺漏大量個股。
8. 作為使用資料防漏水稽核工具的維護者，我希望稽核模組直接使用共享休市日曆引擎（含颱風停市與補假），徹底消除過期硬編碼日曆導致的誤報。
9. 作為執行台股收盤行情入庫的維護者，我希望行情解析與入庫模組統一採用共享櫃買權證濾除規則，防止上櫃權證污染 `daily_candles` 資料表，同時保持既有匯出介面零破壞。
10. 作為無 SQLite 環境或純記憶體測試的使用者，我希望持久化帳本在無可用資料庫時優雅降級回記憶體運作，不中斷現有工具鏈與離線單元測試。

---

## Implementation Decisions

- **決策 1（SQLite Date-First Index Convergence）**：
  - 於資料庫初始化流程以冪等 `CREATE INDEX IF NOT EXISTS` 為四張表新增日期／年月首欄索引：`tw_tdcc_distribution(date)`、`tw_monthly_revenue(year_month)`、`tw_valuation_daily(date)`、`etf_daily_nav(date)`。
  - 既有 `tw_institutional_chips` 已具備日期首欄索引，無需新增額外寫入放大索引。
- **決策 2（Persistent Scheduler Lane Ledger SSOT — 延伸 ADR 0246）**：
  - 於 SQLite 湖倉核心表結構新增單一持久化狀態表 `scheduler_lane_state`（表結構契約如下），負責保存五個配額／軌道鍵值（`twDaily`、`twPhase1`、`usDaily`、`macro`、`weekly`）之跨重啟狀態：
    ```sql
    CREATE TABLE IF NOT EXISTS scheduler_lane_state (
      lane_key TEXT PRIMARY KEY,       -- 'twDaily' | 'twPhase1' | 'usDaily' | 'macro' | 'weekly'
      watermark_date TEXT,             -- 最新已完整收斂之結算日 YYYY-MM-DD
      last_run_iso_date TEXT,          -- 最後執行之台北日期 YYYY-MM-DD
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_attempt_at INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'idle',
      phase TEXT,
      last_error TEXT,
      updated_at INTEGER NOT NULL
    );
    ```
  - 湖倉協調中樞提供具 `customDbPath` 綁定能力的持久化讀寫介面（查詢預算、記錄嘗試、更新軌道結果與水位線、唯讀查詢完整軌道快照），並以資料庫路徑隔離狀態；當 SQLite 不可用或未指定有效路徑時優雅降級至記憶體狀態。
  - NAS 自治排程器移除內部私有 `retryCount` 維護與手動回扣邏輯，統一向協調中樞查詢與寫回軌道狀態；`getState()` 保持既有回傳欄位結構零破壞。
- **決策 3（NAS 自治排程器分軌拆解）**：
  - 將視窗決策函式拆分為四條獨立純函式（每週、台股、美股、宏觀）與主彙整函式；將單體巡檢函式拆分為獨立分軌執行輔助函式（台股、美股、宏觀、每週），維持既有公開匯出簽章與舊版 `handlers.runDailySync` 注入替身 100% 向後相容。
- **決策 4（Tri-Lane Watermark Poisoning Guard）**：
  - **Macro 軌**：每日宏觀採集預設日期改以台北時間 `Asia/Taipei` 產生；入庫函式檢查 21 項數值欄位至少 1 項為有限數值（`Number.isFinite`）始執行 `UPSERT` 並回傳 `true`，全為空值時不寫入並回傳 `false`。
  - **Weekly 軌**：每週同步協調器對全部 5 項子任務套用統一成功判定契約——若回傳顯式 `ok === false` / `success === false`、`error` 非空，或 `savedCount === 0` 且未顯式標記 `cached` / `skipped` / `upToDate`，則標記該子項 `ok: false`；任一子項失敗時整份報告 `ok: false`，排程器禁止推進水位線與觸發滾動備份。
  - **US Daily 軌**：於門檻單一事實來源新增 `US_DAILY_MIN_SUCCESS_RATIO = 0.8`；美股同步與排程器共用有效完成率檢核（`totalTargets > 0` 且 `(successCount + skippedCount) / totalTargets >= 0.8`，且無熔斷／取消），未達標即回傳 `ok: false` 並禁止推進水位線。
- **決策 5（Calendar & Warrant Rule SSOT Convergence）**：
  - 防漏水稽核模組移除硬編碼 2026 台美休市集合，改委派共享交易日曆引擎判定交易日，維持既有 `isMarketTradingDay(date, market)` 匯出簽章相容。
  - 台股收盤行情解析與入庫模組保留所有既有匯出函式，於上櫃解析與批次寫庫入口接入共享櫃買權證濾除函式，阻斷權證寫入 `daily_candles`。

---

## Testing Decisions

所有測試嚴格鎖定公開介面縫隙（Test Seams），僅驗證外部可觀測行為、資料庫狀態與查詢計畫，不耦合私有實作細節：

- **Seam 1（SQLite 查詢計畫契約）**：透過資料庫初始化與市場新鮮度服務公開介面，針對 `tw_tdcc_distribution`、`tw_monthly_revenue`、`tw_valuation_daily`、`etf_daily_nav` 執行 `EXPLAIN QUERY PLAN` 斷言零全表 `SCAN`（皆為 `SEARCH` 或 `USING INDEX`），並驗證 `checkMarketFreshness` 結果無回歸。
- **Seam 2（持久化單一排程帳本與跨重啟契約）**：透過湖倉協調中樞與 NAS 自治排程器公開介面，以獨立暫存 SQLite 資料庫模擬容器重啟（銷毀舊排程器實例並以相同 `dbPath` 重新啟動），驗證水位線、當日 `retryCount`、冷卻期與 Phase 1 不耗 Phase 2 配額均完整持久化且零手動回扣異常；另驗證四軌獨立運作與舊版 `handlers.runDailySync` 100% 相容。
- **Seam 3（三軌假性成功攔截契約）**：
  - 宏觀入庫契約：注入全 `null` 載荷驗證拒絕寫入且回傳 `false`；注入單一有效欄位驗證成功入庫；驗證預設日期採用台北時區（跨越 UTC 午夜時段不偏移）。
  - 每週同步與排程契約：注入回傳 `{ savedCount: 0 }`（無快取標記）之子任務替身驗證回報失敗、不推進水位線且不觸發滾動備份；注入 `{ savedCount: 0, cached: true }` 驗證合法冪等放行。
  - 美股同步與排程契約：注入「10 檔僅成功 1 檔（10% < 80%）」驗證判定失敗不推進水位線；注入「10 檔成功 8 檔或成功 3 + 略過 5（80%）」驗證合法推進水位線。
- **Seam 4（日曆與櫃買權證規則一致契約）**：透過稽核模組公開 `isMarketTradingDay` 驗證 2026 新增休市日（如 10/23 颱風停市、10/26 光復節補假、12/25 行憲紀念日）與共享日曆 100% 一致；透過行情解析與寫庫公開介面驗證 6 碼以上上櫃權證被精確濾除，而合法 4~6 碼個股與債券／主動 ETF（如 `00679B`、`00411A`）完整保留。
- **既有測試參考（Prior Art）**：比照專案既有的後端同步測試（`npm run test:backend` 納管套件）與 Spec 0246 / 0247 整合契約測試撰寫，確保所有新增測試自動納入 `npm run test:backend` 並於全端 CI 綠燈通過。

---

## Out of Scope

- **Wave 2（`Spec 0249`）**：`Debt 0064`、`Debt 0067`（Card 01 / 01B 口徑收斂與 3 套重複技術指標歸一化）與 `Debt 0051`（未來現金流優先級與 TTM 殖利率動態學習）。
- **Wave 3（`Spec 0250`）**：`Debt 0063`（23 顆有效彈窗遷移）與 `Debt 0068`（幽靈 Tailwind 根除、`ModalShell` 強化與 E2EE 遮罩密碼彈窗）。
- **Wave 4（`Spec 0251`）**：`Debt 0046` 與 `Debt 0069`（獨立加密 `vault.db`、NAS 認證邊界、Web Crypto / SmartKeyRotator 接線、`React.lazy` 切分與儲存雙寫競態修復）。
- `tw_institutional_chips` 新增複合覆蓋索引（既有日期索引已滿足單日查詢，不在本規格範圍內）。

---

## Further Notes

- 關聯 GitHub Issue：`#611`；對應架構決策：[ADR 0248](../adr/0248-lakehouse-index-scheduler-ledger-and-watermark-guard.md)。
- 清償債務項目：[Debt 0065](../debts/0065-nas-scheduler-retry-ledger-and-decomposition.md) 與 [Debt 0066](../debts/0066-sqlite-date-indexes-and-scheduler-watermark-poisoning.md)（完成合併後於技術債看板標記為 `RESOLVED`）。
