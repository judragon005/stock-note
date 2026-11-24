# ADR 0245: 全域視口傳送彈窗原語、Card 01B 主 K 四維量價動能共鳴解碼卡暨台股 TDCC 集保斷層自癒管線

- **狀態 (Status)**: Accepted
- **日期 (Date)**: 2026-11-24
- **關聯規格與 Issue**: [Spec 0245](../specs/0245-portal-modal-kline-resonance-and-tdcc-gap-healing-spec.md) / GitHub Issue `#605` / 關聯技術債 [Debt 0063](../debts/0063-legacy-modals-portal-shell-migration.md)、[Debt 0064](../debts/0064-war-room-resonance-and-tdcc-smells-consolidation.md)

## 背景 (Context)

實戰巡檢發現三項跨層結構性缺陷，皆源於底層不變量缺位：
1. **系統全態 JSON 匯出對話框下沉至頁底**：`ExportDatabaseModal` 引用專案 CSS 未定義之 `.modal-backdrop` 類別，退化為一般文檔流塊級元素；全站 15 顆彈窗亦呈現 0/15 Portal 掛載與 4 種定位寫法碎片化，暴露於毛玻璃 `backdrop-filter` 層疊上下文劫持風險。
2. **主 K 線圖缺乏體制閘控四維解碼且受盤中零量污染**：主 K 副圖僅四選一互斥且無 `J` 值與 `RSI(6)`，切換週／月 K 採 $O(N^2)$ 重算；盤中未結算時縫合之 `volume = 0` 虛擬 K 棒混入均量與擺盪計算導致假警報；主圖正下方 `executive-verdict-strip` 與置頂 `Card 18` 高度重疊。
3. **台股 TDCC 集保 80%+ 週次遭自毀丟棄且 4 週變動失真**：TDCC 官方 `qryStock` 於無「差異數調整」週次時將「合 計」列序號編為 **`16`** 而非 **`17`**，硬編碼 `lvl === 17` 導致靜默丟棄；中介層 `length < 4` 與早退 `size >= 8` 皆不檢查內部斷層，且迴圈結束才寫庫易因 15 秒超時全滅；`under10Ratio` 誤計入 4~5 級距（10~20 張）；前端以 `history[len - 4]` 陣列盲減將 11 週變動偽標為「近 4 週大戶變動」。

## 決策 (Decision)

1. **Viewport-Portaled Modal Shell (`ModalShell`) 與靜態守門**：
   - 建立零依賴 `src/components/common/ModalShell.tsx`，於瀏覽器透過 `createPortal(..., document.body)` 掛載，統一套用 `.modal-overlay` + `glass-card modal-content`、`role="dialog"`、`aria-modal="true"`、`Escape`/遮罩點擊關閉、`closeLocked` 防中斷鎖與 `body` scroll-lock（SSR 安全直出）。
   - 將 `ExportDatabaseModal` 遷移至 `ModalShell`（綁定 `closeLocked={isExporting}`）；於 `architecturalFitnessGuard.test.ts` 新增不變量 6，CI 永久禁止 `.modal-backdrop`。其餘 14 顆既有彈窗登記於 [Debt 0063](../debts/0063-legacy-modals-portal-shell-migration.md) 漸進遷移。
2. **Regime-Gated Technical Resonance (`Card 01B`) 與單趟 $O(N)$ 盤中零量隔離**：
   - 新增 `klineOscillatorEngine.ts`（單趟 $O(N)$ 產出 `K/D/J=3K-2D`、`MACD`、Wilder `RSI(14/6)` 及 `resolveVolumeAnchorCandles` 盤中零量前收定錨）與 `technicalResonanceEngine.ts`（複用 ADX/布林體制狀態機、OBV、頂底背離偵測與 250D 同訊號 10 日勝率）。
   - 於 `Card 01` 補齊 `J` 折線與可選受控時框／副圖介面；於 ZONE 01 `Card 01` 正下方原地升級 `executive-verdict-strip` 槽位為互動式 `Card 01B (TechnicalResonanceCard)`，達成 `Card 01 ⇄ Card 01B` 時框與四宮格副圖雙向同步，完整保留 ADR 0244 佈局與 `WAR_ROOM_TYPOGRAPHY_FLOOR` 守門。
3. **Calendar-Anchored TDCC Gap Healing 與 10 張散戶單一口徑收斂**：
   - `parseTdccQryResultHtml` 改以第 2 欄文字語意匹配「合計」（`16/17` 雙通吃）與「差異數」，並於 `parseTdccRecords` 補 1~15 級加總保底；全鏈路 `under10Ratio` 嚴格收斂為官方級距 `1~3`（1~10 張）。
   - 新增 `hasTdccSeriesGap`（預設 `< 10` 週、戰情室按需查詢與回補呼叫端皆對齊目標 `12` 週；相鄰間隔 `> 11` 天或落後最新發布日 `> 7` 天即判為缺口），取代中介層 `length < 4` 與早退 `size >= 8`，改採官方發布日曆差集重播 + 逐週即時 Upsert 寫庫 + 單週退避重試與 Cookie/Token 續期。
   - `buildTdccDistribution` 改以真實 `28 ± 7` 天日曆窗計算大戶變動（無點時動態輸出真實跨度標籤 `compareLabel`），`TdccDistributionCard` 對超過 11 天斷層區段改繪虛線段 (`data-testid="tdcc-gap-segment"`) 與缺口圖例。

## 後果 (Consequences)

- **正向效益**：零新增第三方套件（0 KB 外部增量）；JSON 匯出對話框徹底視口居中與鍵盤無障礙化；主 K 線四維指標一屏融合、盤中零量不誤報、週/月 K 重算由 $O(N^2)$ 降至 $O(N)$；TDCC 官方免費 51 週歷史解析率由 ~20% 躍升至 100%，核心持股與 `2344` 均達 12 週連續零斷層且 10 張散戶口徑跨源完全對齊。
- **權衡**：既有多筆舊歷史週次之 `under_10_ratio` 需透過核心持股 12 週強制重刷與每週快照自然覆寫逐步對齊新 `1~3` 級距口徑；未列入核心持股之冷門股首次查詢將觸發 2~3 秒背景非阻塞差集自癒並永久落盤。
