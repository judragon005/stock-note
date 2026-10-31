# 08 — ETF 真實穿透半導體曝險 (lookThroughEngine) × 費半 (^SOX) 波動壓力測試 (True Look-Through Semiconductor/TSMC Exposure & SOX Beta Stress Test)

**What to build:**
拔除原本寫死檢查 4 檔代號 (`0050/00923/009816/2330`) 的假穿透邏輯，直接接入 `lookThroughEngine.ts` 跨全帳戶 ETF（含 `00403A`, `00981A`, `00924` 等）與個股精算出「真實台積電 (`2330`+`TSM`) 穿透總權重 (%)」與「廣義半導體/AI 硬體穿透總權重 (%)」，並提供「費半 (`^SOX`) 波動 ±3% 對組合之台幣損益敏感度試算 (ΔTWD)」。

**Blocked by:** 04 — 台美費城半導體 (^SOX)、台積電 ADR (TSM) 溢折價率與四大指數波段乖離傳導鏈, 07 — 實質淨值 (effectiveNavTWD)、真·自由可動用子彈（扣 T+2 交割與 7 日 DCA）與質押/再平衡/匯差護欄貫通

**Status:** ready-for-agent

- [x] 戰情室呼叫 `calculateLookThroughExposure` 計算跨 ETF 與個股之真實台積電 (`2330`/`TSM`) 與半導體穿透總權重 (%)
- [x] 即時呈現費半 (`^SOX`) 波動 ±3% 時對穿透後半導體部位之預估台幣損益衝擊金額
- [x] 晨會簡報與行動要點根據真實穿透權重（而非寫死的 4 檔代號）產生集中度風險提示

