# 12 — Zone 01–02 卡片精修 (Card 01 K 線 / Card 02 決策 / Card 03 雷達 / Card 04 熱區 / Card 05 風險蛛網)

**Parent:** #592 (Spec 0239)
**What to build:** 完整修復 Zone 01–02 五張核心卡片之圖表幾何、低價美股精度與契約缺陷：Card 01 (`KLineChartCard`) 實作自適應小數 Y 軸與游標標籤、修復右側徽章溢位與末兩日 X 軸重疊、重設鈕同步重設 `timeframe`/`showKeyLevels`、加入 Click-Outside/ESC 關閉選單、月 K 不足 26 根顯示誠實提示並統一 `colorTheme`；Card 02 (`AiDecisionCoreCard`) 傳入真實 `dayTradeRatio`、修正 `'1~4 級交易日日'` 錯字、過濾 `[0, 0]` 區間並支援美股術語；Card 03 (`MultiDimensionRadarCard`) 與 Card 05 (`RiskSpiderCard`) 調整 `viewBox` 防頂/側標籤裁切、全面改用 `useId()` 與 `NaN` 防護、Card 03 修正 `termId` 並依市場切軸標籤；Card 04 (`VolumeProfileCard`) 實作自適應小數刻度與索引 `key` 防碰撞、渲染 `bullBearFooterTag`、防 POC/真空帶平手重疊並全面 Zero-Mock。
**Blocked by:** 10 — [Expand] 全站 colorTheme/market 介面擴展、TaskViewsSwitcher 點擊死鎖修復與詞彙表補齊
**Status:** ready-for-agent

- [ ] 低價美股（如 `$2.10 ~ $2.50` 與 `$9.45`）在 Card 01 K 線 Y 軸、游標價格與 Card 04 `priceTicks` 皆顯示精確小數位，零重複整數刻度且零 React `key` 警告。
- [ ] Card 01 查價列與副圖響應 `colorTheme`、X 軸末兩日無重疊、重設視圖同時還原日 K 與關鍵價位開關、點選單外部或按 ESC 自動關閉；月 K 樣本不足時副圖呈現誠實提示。
- [ ] Card 02 與 Card 05 的 `diagnoseDayTradeRisk` 消費真實 `dayTradeRatio`（不再寫死 `50` 恆報高風險）；Card 02 無 `'交易日日'` 錯字且 `[0, 0]` 顯示待計算提示。
- [ ] Card 03 與 Card 05 雷達/蛛網圖所有頂點文字完全落於 `viewBox` 安全區內、`NaN` 不會破壞 `<polygon>`、漸層 ID 採 `useId()` 隔離、美股模式第 0 軸顯示「機構量能」。
- [ ] Card 04 無資料時顯示 Honest Empty State（不再渲染 `2400~1600` 假熱區），有資料時呈現 `bullBearFooterTag` 且平手桶不並存「大量峰 + 真空帶」。
