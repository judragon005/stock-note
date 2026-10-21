# Ticket 02: 提示詞語意防護、真脫敏修復與 XML 純淨修剪

- **狀態**：`ready-for-agent`
- **關聯 Spec**：[Spec 0200](../../../docs/specs/0200-war-room-prompt-semantic-grounding-macro-pipeline-and-defense-loopback-spec.md)
- **關聯 Issue**：#312

## 任務目標
1. 重構 `src/engine/strategicPromptEngine.ts` 與 `src/engine/aiForcePromptAdapter.ts`：
   - 將容易被誤判為單日的 `20d` 標籤改為顯式標籤 `<foreign_net_shares_cumulative period="LAST_20_TRADING_DAYS">`。
   - 修復 `buildPrecalculatedPivotsXml` 的假脫敏漏洞：當 `options.desensitized === true` 時，嚴格隱匿具體成本價格，改輸出相對百分比階梯防線。
   - 官方 PE 補齊 `calculation_basis="TRAILING_TWELVE_MONTHS_TTM"` 屬性說明。
   - 注入台股 10% 跌停無流動性鎖死極限情境與外聯查核邊界契約。
   - 修剪所有未定義的 `N/A` 空節點，降低 30% Token 消耗。
2. 撰寫 `strategicPromptEngine.test.ts` 單元測試，確保語意標籤與真脫敏 100% 綠燈。
