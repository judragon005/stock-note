# 02 — Zero-Mock 假數據拔除、國際黃金現貨 (GC=F) 正名與真實時間戳狀態徽章 (Zero-Mock Purge, Spot Gold GC=F Renaming & As-Of Freshness Badge)

**What to build:**
徹底刪除 `macroPulseStorage` 的 `Math.sin`/`Math.cos` 30 天假歷史產生器 (`generateSampleHistoricalMacroData`)、拔除戰情室「重新整理數據」按鈕的 `Math.random()` 造假邏輯，並清除後端同步腳本寫死的 `4.12 / 18.25 / 54.0` 假常數；將黃金卡片正名為「國際黃金現貨/期貨 (`GC=F`, USD/oz，正確顯示 3,000~4,000+ 區間)」並與雙動能的 `GLD` ETF 解耦；於戰情室頂部顯示真實 `As-Of 資料基準時間戳` 與 `🟢 線上最新 / 🟡 本地快取 / ⚪ 手動校準` 狀態徽章。

**Blocked by:** 01 — 戰情室元件預重構與台美紅綠漲跌主題色全面對齊

**Status:** ready-for-agent

- [x] `macroPulseStorage` 與 `WarRoomWorkspace` 100% 不含 `Math.sin`、`Math.cos`、`Math.random` 等假數據產生邏輯
- [x] 黃金現貨/期貨正名為 `GC=F` (`USD/oz`)，正確反映 3,000~4,000+ 國際金價區間，不再誤標為 `GLD`
- [x] 戰情室頂部顯示真實資料基準時間戳 (`asOfTimestamp`) 與來源狀態徽章 (`LIVE` / `CACHED` / `CALIBRATED`)

