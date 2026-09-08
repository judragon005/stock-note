# Ticket #2: 斷頭臨界價格逆推求解器與逃生救生圈計算器 (Liquidation & Escape Solvers)

- **狀態**：`CLOSED`
- **標籤**：`ready-for-agent` · `Risk` · `Margin` · `Liquidation` · `EscapeSolver`
- **關聯 PRD**：[docs/specs/0093-black-swan-margin-stress-matrix-spec.md](../../../docs/specs/0093-black-swan-margin-stress-matrix-spec.md)
- **優先級**：`P1`

---

## 1. 任務目標
實作單一與多標的斷頭臨界價格逆推以及逃生指引求解器：
1. 針對各質押擔保品，逆推觸及 130% 斷頭追繳、140% 警戒預警與 166% 健康水位之臨界價格。
2. 計算最大耐受跌幅，若標的歸零整戶仍安全則標記 `isImmuneToLiquidation`。
3. 實作 `calculateEmergencyEscapePlan`，支援指定目標維持率（如 166%、200%），輸出償還本金、補進現金擔保品、以及加質指定標的股數之精確逃生方案。

## 2. 驗收標準
- [ ] 定義 `LiquidationThresholdItem`、`EmergencyEscapePlan` 型別。
- [ ] 實作 `solveLiquidationThresholds` 與 `calculateEmergencyEscapePlan`。
- [ ] 撰寫單元測試覆蓋斷頭價格解析解、免疫標的判定、以及各逃生方案數值檢驗。
