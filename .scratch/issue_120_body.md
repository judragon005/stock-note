## 規格與背景說明

依據 [Spec 0120: 台美雙市場全量籌碼與聰明錢動能零遺漏、原子性合流與真實入庫規格書](docs/specs/0120-dual-market-smart-money-zero-loss-and-atomic-resilience-spec.md)，本次迭代落實台美雙市場籌碼與量價動能全量真實捕獲與原子性防禦：

1. **Vite 代理順序修復與重試機制 (解決 TWSE 404 與 9/10, 9/11 資料空白)**：
   - 修正 `vite.config.ts` 反向代理規則順序，將 `/api/twse-www` 移至 `/api/twse` 之前，終結 Prefix Shadowing 導致 TWSE 上市數據 100% 報 404 的致命缺陷。
   - 封裝 `fetchWithRetry` 支援指數退避重試（Retry 3 次），阻斷網路瞬斷導致整日跳過。
2. **台股雙市場雙哨兵與原子性合流引擎 (Atomic All-or-Nothing)**：
   - 杜絕只有上櫃或只有上市時之偏頗日報合流，TWSE（上市）與 TPEx（上櫃）必須同時成功才予合流。
   - 金融級雙哨兵：上市必須包含 `2330` 台積電（$\ge 1,000$ 檔）、上櫃必須包含 `8299` 群聯（$\ge 700$ 檔）、全市場總數 $\ge 1,800$ 檔且主力買賣超非 0，未通過者嚴禁寫入快取。
3. **美股真實日 K 全量入庫與標準 20D CMF 資金流計算**：
   - 全面拔除 `ChipsWorkspace.tsx` 中的 `Array.from` 虛擬日 K 合成代碼。
   - 在庫持倉美股與全市場核心焦點 Top 25 標的，一律經由 Yahoo Finance Chart API 抓取真實 20~60 根日 K（含 Open, High, Low, Close, Volume）寫入 IndexedDB `ohlcvStore`，以真實量價結構計算標準 20 日 CMF（佳慶資金流向）。
4. **歷史 5 日快取自動洗滌 (Cache Wash & Auto-Backfill)**：
   - 啟動時自動檢查並作廢過去未通過雙哨兵之殘缺日報，重新拉取覆蓋，確保 1D / 3D / 5D 波段動能累計計算 100% 正確。
5. **雙市場透明度健康看板 (HUD) 與全量重新同步**：
   - 前端呈現台股（上市櫃各檔數）與美股（真實 20D CMF 入庫狀態）雙軌健康度徽章，並提供「🔄 雙市場全量重新同步」按鈕。

## 驗收標準 (Acceptance Criteria)

- [ ] 本地 `/api/twse-www/rwd/zh/fund/T86?...` 成功取得 200 與 1,330+ 檔上市數據。
- [ ] 若 TWSE 或 TPEx 任一市場為空，合流日報必須為空，嚴禁產出只有單邊市場的日報。
- [ ] `isInstitutionalReportComplete` 雙哨兵嚴格驗證上市（含 2330 且 $\ge 1000$ 檔）與上櫃（含 8299 且 $\ge 700$ 檔），未達標絕不寫入快取。
- [ ] 美股 CMF 100% 由真實 20D 日 K（OHLCV）計算並入庫，專案內零虛擬合成日 K 程式碼。
- [ ] 歷史 5 日快取自動洗滌無殘缺，1D/3D/5D 累計買賣超計算正確。
- [ ] `npm test` 零錯誤，`npm run build` TypeScript 0 報錯。
