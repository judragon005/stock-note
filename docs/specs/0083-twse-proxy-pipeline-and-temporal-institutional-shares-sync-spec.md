# 0083: 證交所 TWSE 本地代理管線接入與時序影格三大法人張數動態跳動規範

- **狀態**：PROPOSED
- **建立日期**：2026-09-07
- **影響範圍**：`vite.config.ts`, `src/engine/priceFetcher.ts`, `src/types/stock.ts`, `src/engine/smartMoneyEngine.ts`, `src/components/ChipsWorkspace.tsx`, `src/components/SmartMoneyBubbleChart.tsx`, 相關測試組件

---

## 1. 背景與核心問題 (Background & Problems)

使用者在實測聰明錢流動視覺化（Smart Money Flow）時回報了兩項關鍵缺陷：
1. **上市股票（如 2330 台積電、0050 等）卡片三大法人外資、投信、自營商全部顯示為 0**：
   - 證交所 T86 三大法人日報官方網址為 `https://www.twse.com.tw/rwd/zh/fund/T86`。
   - `vite.config.ts` 僅代理了 `openapi.twse.com.tw` (`/api/twse`)，未代理 `www.twse.com.tw`。
   - `priceFetcher.ts` 缺乏對 `https://www.twse.com.tw` 的本地路由替換，在瀏覽器中發出直連請求時直接被 CORS 政策阻擋；外部公共 CORS 代理池亦因 TWSE 海外風控超時，導致 `twseData` 為空 `{}`。
2. **三大法人張數未隨 T-4、T-3、T-2、T-1 至 T 日期動態變化，死鎖在最後一天**：
   - `SmartMoneyBubbleData` 中的 `trail` 軌跡節點與 `SmartMoneyInputItem` 的 `historicalDailyFlows` 僅包含 `x, y, date, changePercent, flowScore`，缺乏每一天的 `foreignNetShares`、`trustNetShares`、`dealerNetShares` 與 `cmf`。
   - `getTemporalBubbleFrameData` 提取純函數未回傳當日法人張數。
   - `SmartMoneyBubbleChart.tsx` 的 Tooltip 底部明細文字直接傳入 `activeBubble` 根物件數值，使時間軸播放時法人張數文字鎖死在最新一日。

---

## 2. 系統架構與功能規範 (Functional Specifications)

### 2.1 TWSE 官方網域 Vite 本地代理路由接入
- 在 `vite.config.ts` 新增 `/api/twse-www` 代理規則，目標指向 `https://www.twse.com.tw`，設定 `changeOrigin: true`、重寫路徑並附加合法 `Referer` 與 `User-Agent` 請求頭。
- 在 `src/engine/priceFetcher.ts` 中，若 `targetUrl.startsWith('https://www.twse.com.tw')`，自動替換為本地開發代理 `/api/twse-www`，徹底根除瀏覽器端 CORS 阻擋。

### 2.2 歷史軌跡節點型別擴充
- 在 `src/types/stock.ts` 中擴充 `SmartMoneyBubbleData.trail` 與 `SmartMoneyInputItem.historicalDailyFlows`：
  ```ts
  foreignNetShares?: number;
  trustNetShares?: number;
  dealerNetShares?: number;
  cmf?: number;
  ```

### 2.3 歷史法人數據注入與影格計算純函數升級
- 在 `src/components/ChipsWorkspace.tsx` 生成 5 日歷史時序位移點時，依據時間推進比例動態推算並指派各交易日對應的 `foreignNetShares`、`trustNetShares`、`dealerNetShares`（美股則推算各日 `cmf`）。
- 在 `src/engine/smartMoneyEngine.ts` 中：
  - `calculateSmartMoneyFlowDynamics` 轉換 `trail` 時，同步映射各日的法人張數與 CMF 數據。
  - `getTemporalBubbleFrameData` 從當前影格的 `trailPoint` 中提取當日的 `foreignNetShares`、`trustNetShares`、`dealerNetShares`、`cmf`。
  - 大白話生活化診斷 `getBeginnerDiagnosis` 傳入當日淨流向金額，而非死鎖最新一天的 `bubble.netFlowAmount`。

### 2.4 Tooltip 浮窗即時連動當日法人明細
- `SmartMoneyBubbleChart.tsx` 中 `formatInstitutionalDetailText` 改為接收當前影格的數據物件（或傳入包含當日法人張數的資料），在時間軸前進（T-4 ➔ T-3 ➔ T-2 ➔ T-1 ➔ T）時，底部外資、投信、自營商張數即時隨影格動態跳動。

---

## 3. 測試與驗收標準 (Acceptance Criteria)

1. **代理路由單元測試**：
   - 驗證 `fetchWithCORSProxy` 能正確識別 `https://www.twse.com.tw` 並改寫為 `/api/twse-www`。
2. **時序影格法人張數跳動測試**：
   - 驗證給定含有 3 天時序資料的泡泡，`getTemporalBubbleFrameData(bubble, 0)` 與 `getTemporalBubbleFrameData(bubble, 2)` 回傳各自獨立的 `foreignNetShares`、`trustNetShares`、`dealerNetShares`。
   - 驗證 `formatInstitutionalDetailText` 在傳入不同影格時，產出對應天數的張數字串。
3. **全量測試與建置驗收**：
   - `npm test` 100% 通過。
   - `npm run build` TypeScript 0 錯誤。
