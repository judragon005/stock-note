# 13 — 主力戰情室端到端消費、盤中定錨、處置警示與白話文 XAI (AI Force UI Integration & XAI)

**What to build:**
重構 `src/components/aiForceDashboard/HeaderMarketBar.tsx` 與 `src/engine/aiForceDashboardEngine.ts`。
1. 接入 250 天 SQLite 歷史真實日 K，提供全 9 大卡片完整的計算依據。
2. 盤中與盤後雙軌定錨：16:30 後 (台股) 或 08:00 後 (美股) 直讀 SQLite 結算日 K，標記 `isSettled: true`；盤中則取即時報價動態拼接為第 251 根日 K，標記 `isSettled: false`。
3. 頂部資訊列：
   - 增加注意/處置股票警示徽章（`ATTENTION` 顯示黃色注意標籤、`DISPOSITION` 顯示紅色處置標籤）。
   - 幣別與單位嚴格區分：美股顯示 `USD` 與成交「股」，台股顯示 `TWD` 與成交「張」。
4. 白話文因果 XAI：在 AI 決策核心卡片中，依據三大法人或量價微觀演算法結果，自動輸出 1~2 句白話文因果判讀文案。

**Blocked by:** 06 — 台股借券賣出 SBL、信用交易與當沖資料入庫, 07 — 台股注意股票與處置股票狀態標記管線, 11 — 前端 marketCacheLoader 接入本地 API 與離線降級, 12 — 美股微觀量價主力替代演算法

**Status:** ready-for-agent

- [ ] 戰情室完整以 250 天真實歷史數據渲染主 K 線、Volume Profile、均線系統與六維雷達。
- [ ] 處置股票頂部正確亮起「處置股票 (分盤撮合)」警示燈，注意股票亮起「注意股票」標籤。
- [ ] 美股與台股單位與幣別切換正確（USD vs TWD，股 vs 張）。
- [ ] 盤中與盤後定錨時點正確切換 `isSettled` 狀態。
- [ ] 產出清晰易懂之白話文 XAI 判讀文案。
- [ ] 單元與組件整合測試 `src/components/aiForceDashboard/HeaderMarketBar.test.tsx` 與 `src/engine/aiForceDashboardEngine.test.ts` 100% 綠燈。
