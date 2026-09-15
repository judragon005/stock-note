# 0134. 全市場全歷史數據回補與四層容錯修復架構 (Full-Market History Backfill & Reconciliation Pipeline ADR)

- **狀態**：Accepted
- **日期**：2026-09-15
- **負責 Agent**：Antigravity Agent
- **對應規格**：[Spec 0134](../specs/0134-full-market-history-backfill-and-reconciliation-pipeline-spec.md)
- **對應 Issue**：[#73](https://github.com/judragon005/stock-note/issues/73)

---

## 1. 背景與脈絡 (Context)

在系統冷啟動或使用者需進行長期量化指標回測、均線分析（MA60/MA120/MA240）與法人籌碼長線觀察時，單靠每日 16:00 的單日增量排程無法滿足全量歷史數據的需求。
若直接透過網路爬蟲逐檔對 2,200+ 檔標的發起請求，會立即遭遇 TWSE/TPEx 的 IP 速率封鎖 (HTTP 429)。因此需要確立以本機現有歷史數據庫為主力來源、四層容錯防禦與雙目的地沉澱之回補架構。

---

## 2. 架構決策 (Architectural Decisions)

### 2.1 大盤基準交易日曆 (TAIEX Calendar as SSOT)
- 以加權指數歷史日曆（7,158 個交易日）為全市場交易日序列的唯一事實來源。
- 凡個股生命週期介於其上市日與最後交易日間，皆對齊此日曆進行連續性檢驗。

### 2.2 四層容錯修復機制 (Four-Tier Reconciliation)
1. **第一層（差距稽核）**：比對個股與大盤日曆，精確抓出落後或中斷日期，記錄至 `backfill_gaps_audit.json`。
2. **第二層（停牌判定與前值填補）**：個股若於特定交易日停牌或成交量為 0，開高低收沿用前一日收盤價，成交量與三大法人買賣超填補為 0，並標記 `isHalted: true`，杜絕技術指標數列出現 `NaN` 斷裂。
3. **第三層（按日單次批次補漏）**：若全市場歷史日期缺漏，禁止逐檔請求，統一呼叫交易所全市場單日總表 API（單日僅 4 次請求），零 429 封鎖風險。
4. **第四層（邊緣隔離）**：下市或已除檔標的（404）自動歸入黑名單隔離清單，終止無效重試。

### 2.3 雙目的地沉澱架構 (Dual Persistence)
- **目的地 1（前端秒讀快取與 IndexedDB）**：
  - `public/market-cache/tw_market_summary.json`（1.26MB，全市場秒讀總表，供首頁打開瞬間熱載入）。
  - `public/market-cache/tw_market_ohlcv_compact.json`（16.7MB，緊湊日 K 數列，供前端背景非同步寫入 IndexedDB）。
- **目的地 2（本地數據庫更新）**：
  - 補齊完成後輸出審計報告 `backfill_audit_report.json`，統計成功處理檔數與停牌填補筆數。

---

## 3. 影響與效益 (Consequences)

1. **零網路封鎖與高吞吐**：2 分鐘內完成全市場 2,359 檔標的歷史數據導入與日曆對齊。
2. **極致秒讀**：1.26MB 總表讓使用者打開瀏覽器即刻秒讀全市場 2,359 檔最新收盤與籌碼指標。
3. **數據零遺漏**：全自動填補停牌前值 4,266 筆，指標連續無 NaN。
