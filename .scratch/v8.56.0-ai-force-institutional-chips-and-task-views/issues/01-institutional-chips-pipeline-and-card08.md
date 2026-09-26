# 01 — 三大法人真實歷史進出管線與 08/15 法人籌碼卡動態化

**What to build:** 串接 TWSE / TPEx 三大法人歷史買賣超日報管線，將當前標的歷史外資、投信、自營商買賣超張數注入 AI 主力戰情室生成引擎。08 法人行為計量卡動態呈現每日三大法人柱狀圖與累積折線、近 3 日張數表與 20日/5日總結；15 籌碼異動摘要同步更新最新交易日張數、10~20日 Sparkline 走勢與法人標籤。美股或無資料時安全降級為成交量多空模型。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] 在 `aiForceDashboardEngine.ts` 建立 `RawInstitutionalRecord` 與純函式 `buildInstitutionalFlow`。
- [x] `generateAiForceReportFromCandles` 支援接收真實法人記錄並動態連動 Card 08 與 Card 15。
- [x] 提供美股與離線無資料之成交量多空代理降級模型，確保 SVG 圖表永不崩潰。
- [x] 在 `AiForceDashboardView.tsx` 整合 `fetchRecentTwseReports(20)` 快取注入。
- [x] 單元測試 100% 綠燈，全專案無型別錯誤與 regressions。
