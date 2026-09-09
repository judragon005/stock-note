# PRD 規格書：肌肉書僮真實日 K 單一真實來源 (SSOT) 與偽造行情機制徹底廢除

- **版本**：v8.23.0
- **日期**：2026-09-09
- **狀態**：APPROVED
- **關聯 ADR**：[`docs/adr/0104-muscle-booker-ssot-real-candles-and-synthetic-removal.md`](docs/adr/0104-muscle-booker-ssot-real-candles-and-synthetic-removal.md)
- **問題簡述**：同一檔股票（如 4763 材料*-KY），手動連線診斷時顯示「建議賣出·跌破箱底」，但在自訂觀察池內卻因無日 K 線而退回 `generateSyntheticCandles` 偽造假行情，誤判為「建議買進·突破箱頂」。

---

## 1. 核心目標 (Objectives)

1. **徹底根除偽造行情 (Eliminate Synthetic Candles)**：
   - 堅決廢除 `generateSyntheticCandles` 的偽造機制。在真實金融操盤雷達中，杜絕任何以 ASCII Hash 偽造漲跌破的幻覺行為。
   - 當標的尚未取得真實日 K 線（< 5 根）時，明確標記為 `isDataPending: true`，動作保守歸為 `AVOID`（觀望/等待數據），絕不給出錯誤的「建議買進」或「建議賣出」誤導決策。
2. **建立真實日 K 單一真實來源快取 (SSOT Real Candles Cache)**：
   - `MuscleBookerWorkspace` 導入 `cachedCandlesMap: Record<string, DailyCandle[]>` 狀態，優先由 IndexedDB（`getSymbolOhlcv`）批次非同步加載已快取之 30~60 根真實日 K 線。
   - 手動診斷（Ad-hoc Scan）成功抓取的真實日 K 線，即刻寫入 `cachedCandlesMap`，使全工作區共享。
3. **自訂觀察清單與池內標的自動背景回補 (Auto-Backfill & Reactivity)**：
   - 當使用者切換至「自訂觀察清單」或任何標的池時，若發現某些標的尚未擁有真實日 K，在背景發起非同步受控回補，回補成功後自動更新 `cachedCandlesMap` 並觸發畫面重算，達成強一致性。

---

## 2. 驗收標準 (Acceptance Criteria)

- [x] **AC-1 (偽造機制歸零)**：`muscleBookerEngine.ts` 中 `scanMuscleBookerItem` 在未提供足夠真實日 K 線時，不呼叫任何偽造假 K 線，其動作決策標註為 `AVOID`，原因為「數據回補中或歷史日K不足」。
- [x] **AC-2 (同標的結果絕對一致)**：在手動連線診斷輸入 `4763`，與在自訂觀察名單中檢視 `4763`，兩者動作訊號、達瓦斯箱頂底、布林帶寬與停損價位 100% 相同，絕不存在一邊買進、一邊賣出之矛盾。
- [x] **AC-3 (自動連動 IndexedDB)**：已透過連線診斷抓取過的標的，下次進站或加入觀察清單時，直接命中 IndexedDB 本地快取，無須重複向外部 API 發出請求。
- [x] **AC-4 (測試防禦與型別健全)**：全專案 57+ 個測試套件 100% 通過，新增真實 K 線 SSOT 測試，`npm run build` 0 型別錯誤。
