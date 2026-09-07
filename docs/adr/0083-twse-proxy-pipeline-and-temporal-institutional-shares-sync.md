# 0083. 證交所 TWSE 本地代理管線接入與時序影格三大法人張數動態跳動架構決策

- **日期**：2026-09-07
- **狀態**：ACCEPTED
- **關聯 PRD / Spec**：[0083-twse-proxy-pipeline-and-temporal-institutional-shares-sync-spec.md](../specs/0083-twse-proxy-pipeline-and-temporal-institutional-shares-sync-spec.md)

---

## 背景與問題脈絡 (Context)

在實作聰明錢流動視覺化中：
1. 證交所 T86 法人日報在 `www.twse.com.tw`，前端 Vite 開發伺服器缺少對應的反向代理，導致瀏覽器發起請求時遭 CORS 政策攔截，上市股票法人買賣超全為 0。
2. 歷史時序軌跡節點型別缺乏各日獨立法人張數欄位，時序播放器推進時 Tooltip 底部的「外資/投信/自營商」文字死鎖在最後一天。

---

## 決策內容 (Decisions)

1. **增設 `/api/twse-www` Vite 代理**：
   - 目標對準 `https://www.twse.com.tw`，解決前端同源政策限制。
   - `priceFetcher.ts` 接入 `startsWith('https://www.twse.com.tw')` 改寫。
2. **時序影格法人明細全鏈路同步**：
   - 擴充 `trail` 節點與 `historicalDailyFlows`：包含 `foreignNetShares`、`trustNetShares`、`dealerNetShares`、`cmf`。
   - `getTemporalBubbleFrameData` 抽取出當日的法人張數與 CMF。
   - `formatInstitutionalDetailText` 改為接收影格法人數據，使 Tooltip 底部文字隨日期播放即時動態變化。

---

## 影響評估與後續考量 (Consequences)

### 正向影響 (Positive)
- 上市股票（TWSE）法人數據 100% 透過 Vite 本地代理穩定獲取，杜絕 CORS 阻擋。
- 時序播放器推進時，外資、投信、自營商張數隨 T-4、T-3、T-2、T-1、T 真實跳動，達到完整的時空動態連續性。
