# 10 — 台積電法說/NVDA 財報催化劑、大盤除息蒸發點數提示與外部 AI 宏觀戰略釘選回環 (Semiconductor Catalysts, Ex-Dividend Evaporation Points & Macro AI Strategy Pin Loopback)

**What to build:**
擴充 `periodicCatalystEngine` 與 `Finnhub/FMP` 財報日曆，自動納入「台積電 (`2330`) 季法說會 / 季除息日」與「輝達 (`NVDA`) 財報日」；接通閒置的 `estimateExDividendIndexImpactPoints` 於台股視角顯示除息蒸發點數防假跌破提示；升級晨會簡報 LLM Prompt 並實作頂部「📌 AI 宏觀戰略釘選列 (`MacroStrategyPinBar`)」，支援一鍵貼回外部 AI 建議之「目標股票上限 %、費半/台股關鍵防守位、波段戰術摘要」並持久化釘選。

**Blocked by:** 03 — 已配置加密 API 金鑰池自動水合與 /api/market/macro 多源權威總經接線, 06 — 「長線總經配置 × 短線波段戰術」雙溫度計與全球/台股/美股三視角分流連動

**Status:** ready-for-agent

- [x] `periodicCatalystEngine` 自動生成台積電季法說會（1/4/7/10 月中旬）、台積電季除息與輝達 (`NVDA`) 財報催化劑事件
- [x] 台股視角接通 `estimateExDividendIndexImpactPoints` 呈現權值股除息預估蒸發大盤點數提示
- [x] 晨會簡報 Prompt 附帶宏觀回環 JSON 規格，`MacroStrategyPinBar` 支援解析貼回之外部 AI 宏觀策略並持久化釘選於頂部

