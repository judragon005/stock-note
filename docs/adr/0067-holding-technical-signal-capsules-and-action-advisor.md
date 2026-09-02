# ADR 0067: 持股技術指標警示膠囊與智慧操作建議架構 (Holding Technical Signal Capsules & Action Advisor)

- **狀態**：`ACCEPTED`
- **日期**：2026-09-02
- **決策者**：AI Pair Programmer & User
- **關聯 PRD/Spec**：[docs/specs/0067-holding-technical-signal-capsules-and-action-advisor-spec.md](../specs/0067-holding-technical-signal-capsules-and-action-advisor-spec.md)

---

## 1. 背景與脈絡 (Context)

使用者在檢視持股（如 00924 復華S&P500成長）時，需要一目瞭然的技術與籌碼警示膠囊（如 `昨日量能注意`、`9日K大幅拉升`、`5日線之下`、`月線之下`、`半年線之上`、`創單週新低`），並自動區分多空與注意顏色，提供紀律性操作建議（如加碼、減碼、觀望、停損）。

---

## 2. 決策考量與評估 (Decision Drivers)

1. **零外部依賴與即時性 (Zero-Dependency & Offline First)**：
   - 拒絕每檔持股頻繁呼叫收費外部指標 API，避免頻控斷流與延遲。
   - 採用純前端 TypeScript 算法直接對本地儲存之日 K 線進行滾動視窗計算（MA、KD、MACD、Volume Surge、Price Extremes）。
2. **多維色彩視覺階梯 (Multi-Dimensional Color System)**：
   - 多頭訊號（綠色）、空頭跌破（紅色）、量能異動與指標注意（琥珀黃）、均線結構（藍紫）。
3. **雙軌決策架構 (Dual-Track Advisor Architecture)**：
   - 底層確定性規則專家矩陣 (Deterministic Rule Engine)：100% 離線即時輸出四字定調與操作指引。
   - 頂層可選 AI 深度解讀 (Optional LLM Integration)：預留結構化 Prompt Payload 接口。

---

## 3. 採納決策 (Adopted Decisions)

1. **核心模組劃分**：
   - `src/types/signal.ts`：定義訊號、指標與操作建議之標準介面。
   - `src/engine/technicalIndicatorEngine.ts`：專責量化技術指標計算與訊號標籤萃取。
   - `src/engine/holdingAdvisorEngine.ts`：專責訊號評分加權矩陣與操作建議文字生成。
   - `src/components/common/HoldingSignalCapsules.tsx`：專責膠囊標籤 UI 與 Tooltip 渲染。
2. **與現有系統之無縫整合**：
   - 在 `HoldingsTable.tsx` 股票名稱代碼欄位下方嵌入 `HoldingSignalCapsules` 元件。

---

## 4. 效益與後續影響 (Consequences)

### 正面效益 (Positive)
- **高可讀性**：投資人可在持股列第一時間洞悉所有均線與指標異動。
- **紀律性決策**：自動輸出具備客觀防禦性的操作指引，降低情緒化操作。
- **高效能**：利用純前端數學運算，運算時間小於 1ms/標的。

### 潛在限制與防禦 (Mitigations)
- 若標的為新上市股票（歷史資料不足 5 天或 20 天），自動停用高階指標（如季線/半年線/月極值），僅顯示有效之短線指標。
