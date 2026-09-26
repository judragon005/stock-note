# 03 — 底部 5 大任務視圖與真實日 K/指標資料全景連動

**What to build:** 將 AI 主力戰情室底部 5 大任務視圖（Task Views）全面由寫死範例升級為真實歷史日 K 與多維指標驅動：
1. **任務一（綜合分析報告）**：維持 Bento Grid 18 張卡片完整呈現。
2. **任務二（技術警示報告 TechnicalAlertsView）**：動態依據最新日 K、均線位置、RSI 與主力成本掃描真實警示事件（均線排列、乖離警戒、動能過熱/超跌、量價背離），顯示真實數值。
3. **任務三（KD + MA 視圖 KdMaView）**：頂部 KPI 綁定最新真實 K、D、MA20 與交叉狀態，並以原生 SVG 繪製 KD 軌跡與 MA 走勢。
4. **任務四（MACD 視圖 MacdView）**：頂部 KPI 綁定最新真實 DIF、MACD、OSC 數值，並繪製雙線與紅綠柱狀動能圖。
5. **任務五（原始資料表 RawDataView）**：顯示完整歷史日 K 數列（含 OHLCV 與關鍵指標），支援分頁檢視（每頁 10 筆）與多欄位數值格式化。

**Blocked by:** None — can start immediately

**Status:** completed

- [x] 任務二依據真實日 K 條件動態生成警示項目，不出現寫死的致茂常數。
- [x] 任務三與任務四 KPI 數值與最新日 K (OHLCV) 之指標計算完全一致（SSOT）。
- [x] 任務三與任務四具備原生 SVG 走勢繪製，不依賴第三方重型圖表套件。
- [x] 任務五支援完整歷史日 K 表格呈現與簡易客戶端分頁切換。
- [x] 單元測試 100% 綠燈，TypeScript 0 錯誤。
