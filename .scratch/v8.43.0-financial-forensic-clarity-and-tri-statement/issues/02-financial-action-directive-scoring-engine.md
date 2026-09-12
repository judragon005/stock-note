# 02 — Financial Action Directive Scoring Engine

**What to build:**
升級 `src/engine/financialScoringEngine.ts`。
徹底移除與體質燈號互相衝突的無腦平穩兜底邏輯，導入【風格 A：資深操盤手風格】：

1. **【操盤定調】**：依據評分與風險維度判定（`【強勢造血·長線續抱】`、`【體質穩健·逢回布局】`、`【體質承壓·防守觀望】`、`【重大風險·嚴格戒備】`）。
2. **【核心矛盾】**：精準點出問題所在（如：「帳面淨利成長但 CFO 負流出，警惕紙上富貴與塞貨風險」或「毛利率受通膨侵蝕連續收縮」）。
3. **【操盤方針】**：提供清晰的操作動作指引（如：「暫緩追高加碼，嚴設均線跌破停損點，靜待營運現金流改善」）。
4. 升級型別契約或在 `executiveSummary` 整合輸出結構化內容。
5. 單元測試 `financialScoringEngine.test.ts` 驗證各維度下結論語意邏輯一致無衝突。

**Blocked by:** 01-taiwan-tri-statement-pipeline-aggregation.md

**Status:** done

- [x] 移除衝突的 fallback 兜底字句
- [x] 導入【操盤定調】、【核心矛盾】與【操盤方針】結構化診斷
- [x] 單元測試 `financialScoringEngine.test.ts` 綠燈
