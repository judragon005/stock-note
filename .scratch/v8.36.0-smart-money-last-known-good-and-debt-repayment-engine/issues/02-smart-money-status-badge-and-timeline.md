# 02 — 聰明錢星圖資料狀態指示器與真實交易日時間軸 (Smart Money Status Badge & Timeline)

**What to build:**
升級 `ChipsWorkspace.tsx` 與 `SmartMoneyBubbleChart.tsx` 前端介面呈現：
1. **資料狀態與來源透明化標籤**：於聰明錢星圖頂部及右上角展示清楚的同步狀態徽章。在盤中（未公布最新日報前）標示 `🕒 盤中模式：顯示 09/10 盤後籌碼 (今日預計 15:30 公布)`；在盤後公布後標示 `🟢 已同步：2026-09-11 盤後籌碼 (共 1,280 檔)`。
2. **時間軸真實交易日化**：將底部時序播放控制器（Timeline Player）之可用日期陣列，由寫死的抽象字串 `['T-4', 'T-3', 'T-2', 'T-1', reportDate]` 全面替換為對齊 TWSE 真實交易日的西元/民國字串（如 `09/04 ➔ 09/05 ➔ 09/08 ➔ 09/09 ➔ 09/10`）。
3. **無資料標的友善標註**：若特定持倉標的確實查無盤後法人進出，Tooltip 與生活化診斷改為標註「此標的無盤後法人數據」，取代原先「外資 +0 張 / 三大法人進出平穩」之誤導性描述。

**Blocked by:** Ticket 01

**Status:** complete

- [x] 升級 `ChipsWorkspace.tsx` 接收 `InstitutionalReportResult` 並維護籌碼日期與狀態
- [x] 在星圖頂部新增視覺化狀態徽章（盤中前一日模式 / 最新已同步模式 / 涵蓋檔數）
- [x] 改造 `availableDates` 為真實 5 交易日日期串，並同步於時序滑桿上精準展示
- [x] 在 `SmartMoneyBubbleChart.tsx` 調整 Tooltip 與時序影格診斷，杜絕將無資料誤診為「法人買賣超為 0 張」
- [x] 於 `src/components/SmartMoneyBubbleChart.test.ts` 驗證真實日期對齊與無資料標的友善提示
