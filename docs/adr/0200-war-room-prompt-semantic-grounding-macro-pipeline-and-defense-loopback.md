# ADR 0200: 戰情室外聯提示詞語意防護、宏觀資券穿透與實戰裁決釘選回流架構

## 狀態 (Status)
已採納 (Accepted) - 2026-10-21

## 脈絡 (Context)
在先前版本中，使用者將「主力戰情室」個股（如 2344 華邦電）透過「一鍵複製 AI 戰情提示詞」匯出至外部前沿 AI（如 Claude 3.5 Sonnet、ChatGPT-4o、Gemini 1.5 Pro）進行推論診斷時，外部 AI 常出現以下問題：
1. **語意縮寫混淆與成本洩漏**：`period="20d"` 常被誤讀為 20 天日曆日而非 20 個交易日；官方本益比（PE 48.06）採 TTM 四季滾動口徑，但外部 AI 易與單季 EPS 換算口徑衝突；在脫敏模式下仍洩漏具體買進平均成本（`exact_cost_basis: 158.21`），危及個人隱私安全。
2. **數據天窗與孤島**：盤中或盤後官方資券尚未發布時，數值為 null，造成外部 AI 以為融資券為 0；總經宏觀資料在 Vite 中介層未附掛，外部提示詞標記為 N/A。
3. **無實戰決策閉環**：外部 AI 產出冗長分析後，使用者必須自行肉眼手動摘錄關鍵點位，且缺乏盤中觸價警報機制，亦無法評估各模型歷史勝率。

## 決策 (Decision)
1. **中介層順路附掛與非 null 資券回溯 (KISS 原則)**：
   - 在 `scripts/market-sync/vite-market-middleware.cjs` 的 `/api/market/history/:symbol` 順路連帶查詢 `macro_market_daily` 最新一筆宏觀紀錄回傳。
   - 在 `src/engine/marketCacheLoader.ts` 中，若最新日資券為 null，向前回溯最近一個非 null 的有效資券交易日，並明確標記 `marginAsOfDate`。
2. **提示詞語意防護與絕對脫敏守門員**：
   - XML 屬性標記為 `period="LAST_20_TRADING_DAYS"` 與 `calculation_basis="TRAILING_TWELVE_MONTHS_TTM"`。
   - 60 日區間改名為 `swing_range_60d_resistance` / `swing_range_60d_support`。
   - 脫敏模式 (`desensitized: true`) 徹底遮蔽 `exact_cost_basis` 與 `breakeven_line`，僅輸出百分比，但保留停損價位算術值。
   - 注入 `<external_audit_contract>` 與 `<loopback_protocol_directive>`，要求外部 AI 文末輸出標準 JSON 代碼區塊。
3. **外部 AI 裁決回流協議引擎 (strategyPinEngine)**：
   - 透過正則表達式秒級從長篇 Markdown 分析文中提純標準 JSON。
   - 防呆清洗「元」、「$」、逗點與空白，嚴格轉為精準數字。
   - 支援 5 天時效倒數，過期標註提醒。
   - 盤中即時評估是否跌破停損線、達到停利目標或突破翻多點位。
4. **戰情室策略釘選列與智囊團實戰勝率榜**：
   - 一鍵讀取剪貼簿或展開手動貼入輸入框。
   - 高對比度觸價警報橫幅，附帶「我已知悉」防疲勞機制。
   - 結案記錄（WIN / LOSS / EXPIRED），以 LocalStorage 維護上限 20 筆戰績，自動統計勝率榜。

## 後果與效益 (Consequences & Benefits)
- **零數據天窗與偽矛盾**：華邦電盤後資券與總經宏觀數據 100% 穿透，消滅 N/A。
- **真脫敏隱私安全**：徹底切斷個人真實買進成本洩漏風險。
- **實戰決策極速閉環**：複製貼上一鍵搞定，點位釘選、盤中觸價警報與模型勝率全自動化，且完全基於純前端 LocalStorage，零後端伺服器負擔。
