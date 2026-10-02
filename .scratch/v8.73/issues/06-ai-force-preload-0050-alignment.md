# 06 — 主力戰情室預載標的切換為 0050 (元大台灣50)

**What to build:** 使用者進入主力戰情室時，預設顯示標的由個股 2360 切換為台股市場標竿指數 ETF 0050，全景頂部看板、主 K 線圖與主力分析卡片均預設呈現 0050 真實數據。

**Blocked by:** 01 — 執行全市場歷史 CSV 全量回補至 SQLite 本機湖倉, 04 — 日 K 線圖單一真實來源 (SSOT) 防斷層自適應縫合與防拼裝

**Status:** done

- [x] 修改 `App.tsx` 預設選中標的為 `0050`
- [x] 修改 `AiForceDashboardView.tsx` 與 `HeaderMarketBar.tsx` 預設查詢常數為 `0050`
- [x] 修改 `aiForceDashboardEngine.ts` 預設代碼為 `0050`
- [x] 單元與 E2E 測試驗證預載 0050 正確渲染
