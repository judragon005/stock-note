# 08 — Forensic Fraud & "The Unspoken" Contrarian Radar

**What to build:**
實作六大逆向鑑識與防雷規則模組 `src/engine/forensicRadarEngine.ts`。嚴格檢查：
1. 塞貨與庫存積壓背離（營收增但 DSO/DIO 飆升）
2. 紙上富貴（淨利大增但 CFO 為負或比率 < 0.6）
3. 借債配息（股利支出 > FCF 1.5 倍且負債上升）
4. 業外美化（本業利益衰退但靠業外收益灌水 EPS）
5. 美股 SBC 股權稀釋（SBC / 營收 > 15%）
6. 會計師查核意見異常（非無保留意見、頻繁換所）

**Blocked by:** 05-financial-profitability-and-dupont-engine.md, 06-financial-safety-and-liquidity-engine.md, 07-financial-turnover-efficiency-and-ccc-engine.md

**Status:** ready-for-agent

- [x] 實作六大鑑識規則的純前端數學邏輯判定
- [x] 輸出結構化的 `ForensicAnomaly` 陣列（含嚴重度、白話真相解讀與數據佐證）
- [x] 支援無異常時輸出「財務體質扎實，未檢出結構性背離」
- [x] 單元測試針對地雷股案例（紙上富貴、借債發高息、塞貨）進行 100% 覆蓋驗證
