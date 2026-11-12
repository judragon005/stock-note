# ADR-0223: Zavy 慢富週期與配置新手白話導覽、零造輪子 TermTooltip 整合與既有引擎 12 項漏接欄位全貫通架構決策

* **狀態 (Status)**：`ACCEPTED`
* **日期 (Date)**：2026-11-10
* **關聯規格 (Spec)**：[`docs/specs/0223-zavy-slow-wealth-beginner-guide-and-ui-completion-spec.md`](file:///d:/APP/股票紀錄/docs/specs/0223-zavy-slow-wealth-beginner-guide-and-ui-completion-spec.md)
* **關聯 Issue**：[#494](https://github.com/judragon005/stock-note/issues/494)

---

## 1. 背景與問題 (Context and Problem Statement)

在 Spec 0221 與 Spec 0222 完成 Zavy 慢富工作區的全鏈路真實數據驅動與引擎統一後，針對「投資新手小白（Retail Beginner）」進行認知負荷與 UI/UX 審查，發現四大核心問題：
1. **硬核術語缺乏白話轉譯與英文枚舉裸露**：畫面遍布 `OAS`、`CCC 垃圾債利差`、`融資去槓桿比率 >= 1.0`、`取交集極小值`、`Coast-FIRE` 等專業術語，且部分欄位直接輸出 `【EXPANSION】` 與 `IN_RANGE_4_TO_5_5` 英文枚舉，初學者難以理解「這代表什麼？對我有什麼影響？我現在該怎麼做？」。
2. **既有引擎算出的 12 項高價值決策欄位在 UI 被漏接或閒置**：`zavySlowWealthEngine.ts`、`rebalancingEngine.ts` 與 `monteCarloFireEngine.ts` 早已精算出 `tidal.narrative`、`bottomingChecklist.guidanceText`、`interpretation.fallbackIndicator`、`trackA.currentEquityWeightPercent`（實際持股 vs 建議上限）、`trackA.debtRepaymentSummary`（負債即負向債券之質押還款建議）、`trackB.srrRiskReductionPercent`（前 10 年報酬順序風險：100% 純股破產率 vs 穿防彈衣破產率對比）、`targetCapital30xTwd` 等關鍵指標，且 `ZavyDualTrackDecisionCard.tsx` 接收了 `onUpdateTolerance` 卻命名為 `_onUpdateTolerance` 閒置未綁定。
3. **官方 PMI 為 `--` 時缺乏免費真實替代硬數據並列引導**：ISM 與台灣官方 PMI 為商業封閉調查數據，當未提供時僅顯示 `--`，未將本機 SQLite 與 FRED 免 Key 管線已算好的「美國製造業新訂單減存貨利差」與「台股上市櫃月營收擴散指數（實質營收 PMI）」透明並列展示。
4. **若直接將長篇解釋塞入卡片，將破壞機構級金融終端的高密度排版**：需要在不膨脹日常看盤版面、不重複造輪子的前提下提供完整新手引導。

---

## 2. 決策結果 (Decision Outcome)

我們決定採取 **「三層漸進式揭露 (3-Tier Progressive Disclosure) × 100% 複用既有 `TermTooltip` × 既有引擎 12 項漏接欄位全貫通」** 架構：

1. **零重複造輪子，100% 複用 `TermTooltip.tsx` 與 `GlossaryEntry`**：
   - 嚴禁新建自訂 Popover 或引導套件。新增單一純資料字典 `src/constants/zavyGlossary.ts`（收錄 M01~T08 共 18 項 Zavy 語氣 DNA 白話詞條），直接掛載於三大鏡頭指標標題之 `<TermTooltip showIcon underline>`，提供「💡 白話比喻 / 📊 指標含義 / 🎯 買賣操作指引 / ⚡ 當前即時診斷」四段式浮動解讀。
2. **頂部可收合「📖 新手 30 秒慢富導覽」與反恐慌色彩心理學**：
   - 於工作區頂部提供可一鍵展開/收合的「看天氣（鏡頭一）➔ 量體溫（鏡頭二）➔ 穿防彈衣（鏡頭三）」三步驟導覽橫幅；日常收合時 0 版面佔用。
   - 製造業上行期遇上 `20MA 寬度 < 20%` 時，採用祖母綠機會色（`#10b981`）與「波浪回檔黃金買點，勿對漣漪起反應」安定微文案，防止散戶恐慌砍在阿呆谷。
3. **誠實空狀態引導 + 自動並列 SQLite 免費真實替代硬數據**：
   - 保留官方 PMI 無資料時顯示 `--` 的誠實原則，同時於同格自動並列顯示本機 SQLite 實時計算之「美新訂單-存貨利差」與「台股上市櫃月營收擴散指數 / 全市場營收 YoY」，並修復 `vite-market-middleware.cjs` 15 分鐘快取分支確保 `twRevenue` 恆定回傳。
4. **零修改引擎底層公式，全數接通 12 項現成欄位與 5 檔風險耐受度 Pills**：
   - 打通 `_onUpdateTolerance`，渲染 `[10% 保守 | 15% 穩健 | 20% 平衡 | 25% 積極 | 30% 進取]` 五檔直覺切換 Pills，並將 A/B 軌及三大鏡頭所有漏接欄位全數綁定至 UI。

---

## 3. 權衡與影響 (Consequences)

* **優點 (Positive)**：
  - **老手與新手雙贏**：老手維持 0 膨脹的 3 秒高密度看盤體驗；新手透過 30 秒頂部導覽與 `TermTooltip` 四段式白話卡 3 秒秒懂 Zavy 慢富精髓。
  - **極致 KISS 與 DRY**：0 新增基礎 UI 輪子、0 修改核心財務模型公式，將既有引擎算出的蒙地卡羅順序風險（SRR）破產率與質押還款建議 100% 發揮價值。
* **缺點與緩解 (Negative & Mitigation)**：
  - 詞條內容較豐富；透過集中管理於單一純資料常數檔 `src/constants/zavyGlossary.ts`，保持 UI 組件精簡高內聚。

