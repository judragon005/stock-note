# ADR 0094: 宏觀戰情室、全球流動性監控與 AI 智慧每日操作決策儀表板 (Market War Room, Macro Liquidity & AI Strategy Advisor)

## 狀態 (Status)
- **日期**：2026-09-08
- **狀態**：`ACCEPTED`
- **關聯 PRD**：[docs/specs/0094-macro-war-room-and-ai-advisor-spec.md](../specs/0094-macro-war-room-and-ai-advisor-spec.md)
- **關聯技術債**：[docs/debts/0020-market-war-room-macro-liquidity-and-ai-advisor.md](../debts/0020-market-war-room-macro-liquidity-and-ai-advisor.md)

---

## 背景與痛點 (Context & Problem Statement)
系統在微觀個人資產會計層面已高度精確，但缺乏總體經濟巨觀景氣、全球資金流動性水位、跨資產風險偏好與市場極端恐慌度之整合戰情室。投資人在面臨行情波動時，容易缺乏客觀紀律指引而陷入追高殺跌。此外，純仰賴外部 LLM 生成投資建議存在幻覺、網路延遲與資費消耗風險。

---

## 決策與架構 (Decisions & Architecture)

1. **宏觀指標模型與個人防護盾體系 (Macro Indicators & Portfolio Shield)**：
   - 統整 10Y/2Y 美債殖利率與倒掛利差、VIX 恐慌位階、CNN 恐慌貪婪指數、黃金/原油/美元指數與 M2 貨幣成長率。
   - 計算個人組合防護盾：實質現金購買力比率（緊繃/適中/充裕）、質押借貸槓桿維持率健康度（安全/警戒/追繳/無借款）與資產配置最大偏離度。

2. **雙軌制 AI 智慧作戰方針引擎 (Dual-Track AI Strategy Advisor Engine)**：
   - **軌道一：100% 離線確定性專家規則系統 (Deterministic Expert Matrix)**：
     - 基於「市場情緒環境 × 個人現金彈藥 × 質押維持率 × 配置失衡度」四維交叉矩陣，輸出四字定調（如 `【防禦蓄勢・分批低接】`、`【獲利調節・拉高現金】`、`【極端避險・嚴守防線】`、`【安全巡航・維持紀律】`）與客觀執行要點，保證零幻覺、零網路依賴、毫秒級響應。
   - **軌道二：結構化 LLM 提示詞載荷生成 (Structured Prompt Payload)**：
     - 匯總宏觀、個人防護盾與重大財經催化劑日曆，輸出語法嚴謹的 JSON Payload，供外部 LLM (Gemini/Claude) 進行深度客製化解析。

3. **關鍵財經事件倒數 (Upcoming Catalysts)**：
   - 內建重磅事件日曆，精確計算距基準日倒數天數，提前預警市場波動外溢。

---

## 影響與驗證 (Consequences & Verification)

- **正面效益**：
  - 補足系統在總體經濟視角上的最後一塊拼圖，形成「總經宏觀戰情 ➔ 個人資產配置 ➔ 交易紀律覆盤」的完整量化決策閉環。
  - 兼顧離線確定性安全與未來 LLM 擴展性。
- **驗證指標**：
  - [src/engine/macroAdvisorEngine.test.ts](../../src/engine/macroAdvisorEngine.test.ts) 8 個單元測試 100% 通過。
  - 全工程 55 個測試套件、603 個測試全數通過，`npm run build` 零錯誤。
