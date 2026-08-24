# Ticket #1: [Infra/Transport] Vite 本地開發代理配置與傳輸層平滑降級

- **狀態**: Completed
- **規格書**: [SPEC-0015](../../../docs/specs/0015-corporate-action-dual-pipeline-and-rate-limiting.md)
- **架構決策**: [ADR-0015](../../../docs/adr/0015-corporate-action-dual-pipeline-and-rate-limiting.md)

---

## 任務目標 (Objective)
在 `vite.config.ts` 中建立本地開發代理轉發路由，徹底消除瀏覽器連線 Yahoo Finance 與 TWSE 時的 CORS 跨域阻擋；並在前端傳輸層實作「優先本地代理 ➔ 失敗降級外部 CORS 代理池」之雙層機制。

---

## 實作範圍 (Scope)
1. **Vite 配置 (`vite.config.ts`)**：
   - 增加 `/api/yahoo` 轉發至 `https://query1.finance.yahoo.com`。
   - 增加 `/api/twse` 轉發至 `https://openapi.twse.com.tw`。
2. **傳輸層適配 (`src/engine/corporateActionScanner.ts` & `src/engine/priceFetcher.ts`)**：
   - 升級 `fetchWithCORSProxy` 優先發送本地代理請求。
   - 若本地代理回傳 404（表示處於靜態生產環境），平滑降級至外部 CORS 代理池。

---

## 驗收條件 (Acceptance Criteria)
- [ ] 瀏覽器發起 Yahoo Finance 與 TWSE 請求不再被 CORS 攔截。
- [ ] 在 `npm run dev` 環境下能秒級抓取外部端點資料。
