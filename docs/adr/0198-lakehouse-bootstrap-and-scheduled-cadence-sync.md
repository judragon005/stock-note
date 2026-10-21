# 0198: 湖倉全量注水補全、定時排程節奏化與戰情室卡片視覺優化

- **日期**：2026-10-21
- **狀態**：已採納 (Accepted)
- **關聯規格**：[docs/specs/0198-lakehouse-full-bootstrap-and-scheduled-cadence-sync-spec.md](../specs/0198-lakehouse-full-bootstrap-and-scheduled-cadence-sync-spec.md)
- **關聯 Issue**：[#304](https://github.com/judragon005/stock-note/issues/304)

---

## 背景與問題陳述 (Context & Problem Statement)

1. **戰情室卡片 21（估值矩陣）資料缺失**：
   使用者測試個股 `1217`（愛之味）時，卡片 21 顯示無數據。經排查，前端與中介層已具備 `ORDER BY date DESC LIMIT 1` 前一日降級機制，但 SQLite 數據庫 `tw_valuation_daily` 僅有 TPEx 890 檔上櫃數據，TWSE 1,084 檔上市股票並未注水入庫。
2. **視覺高度過窄與卡片編號標示不適**：
   戰情室 Layer 6（卡片 10/13、12、21、19、20）卡片容器鎖定為 `250px`，內容過於擁擠；卡片編號如 `[CARD 10]` 帶有冗餘英文字，使用者期望移除 `CARD` 純保留數字 `[10]`，並放大卡片視覺高度，嚴禁縮小字體。
3. **除權息行事曆端點失效**：
   TWSE 除權息預告舊端點 (`openapi.twse.com.tw`) 已廢棄並返回 404，導致官方宣告除權息行事曆未能同步寫入 `corporate_action_calendar`。
4. **定時排程覆蓋面不完整與過度工程化風險**：
   董監質押（每月申報一次）與除權息（每日宣告）等重要數據先前未被納入自動排程；且須避免引入過度工程化的微服務常駐排程。

---

## 決策項目 (Decision Drivers)

- **KISS 原則**：不建立新的常駐 daemon 或複雜微服務，直接將動態更新順路附掛於現行排程腳本中。
- **無人值守與自適應頻率 (Cadence-Aware)**：
  - 每日盤後（15:00 後）：更新上市櫃估值、即時除權息預告（TWSE/TPEx）。
  - 每週五（18:30 後）：順路附掛 TDCC 集保股權分散表。
  - 每月 1~11 號：順路附掛上市櫃月營收。
  - 美股盤後（05:00 後）：順路附掛 10Y 美債、VIX、CNN 恐懼貪婪指數至 `macro_sentiment_daily`。
- **一次性全量注水 (Full Bootstrap)**：建立獨立腳本一次性將 TWSE 1,084 檔估值、董監事質押與宏觀情緒全數灌入 SQLite 湖倉。
- **UI 視覺放大與編號極簡**：
  - 放寬容器高度至 `295px`，卡片本體採 `height: 100%`。
  - 統一將 `CARD XX` 轉化為純數字徽章 `[XX]`。

---

## 決策結果 (Decision Outcome)

1. **修復 TWSE 除權息端點**：
   - 將 API 遷移至官方 RWD 端點：`https://www.twse.com.tw/rwd/zh/exRight/TWT48U?response=json`。
   - 解析民國年月日為標準 ISO 日期，存入 `corporate_action_calendar`。
2. **全量注水工具**：
   - 實作 `scripts/market-sync/bootstrap-lakehouse-full.cjs`，支援上市估值、宏觀情緒、董監質押全量寫入。
   - 愛之味 `1217` 已成功取得 PE 14.92 / PB 0.63 / 殖利率 2.54%，卡片 21 正常呈現。
3. **日常增量排程整合**：
   - 在 `sync-tw-market.cjs` 與 `sync-us-market.cjs` 內增添節奏自適應檢查，輕量化每日自動帶回最新動態數據。

---

## 驗證與測試 (Verification & Testing)

- **單元測試**：
  - `src/engine/ingestTwCorporateActions.test.ts`
  - `src/engine/bootstrapLakehouseFull.test.ts`
  - `src/engine/cadenceScheduledSync.test.ts`
  - `src/components/aiForceDashboard/cards/ValuationMetricsCard.test.ts`
  - `src/components/aiForceDashboard/cards/EnergySentimentTwinCard.test.ts`
- **全量測試結果**：240 個測試檔案、1,786 個測試案例全數 100% 綠燈。
- **專案建置**：`tsc && vite build` 0 錯誤通過。
