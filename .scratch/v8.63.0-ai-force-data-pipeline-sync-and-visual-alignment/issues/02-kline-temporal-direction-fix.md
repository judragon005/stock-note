# 02 — 01 主力 K 線時間方向校正 (K-Line Temporal Direction Fix)

**What to build:**
校正「01 主力 K 線」的繪製順序，確保無論是傳入真實歷史日 K 或示範數列，數列皆依日期嚴格按升冪（舊 ➔ 新）排列。
SVG 畫布最左側固定為歷史（離今天最遠），最右側固定為最新交易日（離今天最近），完全符合金融技術分析閱讀直覺。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] 重構 `KLineChartCard` 內的示範數列產生邏輯：由 `09/01` 生成至 `09/30`（升冪順序）
- [x] 增加蠟燭數列防禦檢查：若傳入數列未排序，自動按 `date` 進行升冪排序
- [x] 驗證 X 軸時間標籤渲染：左側為歷史、右側為最新交易日
- [x] 單元測試：驗證 `KLineChartCard` 渲染後首根蠟燭與末根蠟燭之時間關係正確
