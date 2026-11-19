# 11 — Header 導覽列全量美股搜尋、中文股名防呆與非同步 PNG/HTML 匯出修復

**Parent:** #592 (Spec 0239)
**What to build:** 修復頂部導覽與匯出列所有缺損：`HeaderMarketBar` 解決 `nowrap` 中小螢幕水平溢位、為 `intradayQuote.changePercent` 補齊 `Number.isFinite` 防禦、對齊 `symbol + market` 持倉匹配、接入全量美股搜尋字典（取代僅 4 檔硬編碼）、處理 `.US` 後綴並攔截直接輸入中文股名按 Enter 誤判為 `US`；`HeaderExportBar` 與 `exportReportPipeline` 確實 `await` 非同步 PNG/Blob 下載後才回報成功、統一為獨立 SVG 補寬高防裁切並依 `colorTheme` 呈現匯出報表；整理 `HeaderQueryBar` 冗餘狀態與硬編碼日期。
**Blocked by:** 02 — 單一權威資產分類器 (resolveAssetClass)、名稱解析參數校正與雙市場結算時區引擎, 10 — [Expand] 全站 colorTheme/market 介面擴展、TaskViewsSwitcher 點擊死鎖修復與詞彙表補齊
**Status:** ready-for-agent

- [ ] 在 `HeaderMarketBar` 搜尋常見美股（如 `VT`, `SPY`, `AMD`, `BRK.B`）於離線或 API 異常時仍可命中完整美股候選清單；輸入中文股名直按 Enter 自動解析為對應台股代碼或阻斷誤送 `US`。
- [ ] `HeaderMarketBar` 於中小螢幕同時呈現處置/注意徽章時不水平裁切；`intradayQuote` 缺少 `changePercent` 時不拋例外；美股載入/待命態正確顯示 `USD` 與 `股`。
- [ ] `HeaderExportBar` 點擊全盤 PNG 或全部圖表 PNG 匯出時確實 `await` 完成後才顯示成功提示，失敗時回報錯誤；HTML 摘要匯出依 `colorTheme` 顯示正確漲跌色，且預設來源字串不再硬寫台股 TWSE/FinMind。
