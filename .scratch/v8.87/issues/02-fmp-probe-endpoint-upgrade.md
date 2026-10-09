# Ticket 02: FMP 探針相容端點升級與 403 友善提示

## 關聯規格
- Spec: `docs/specs/0175-api-key-probe-csp-cors-and-endpoint-repair-spec.md` (3.2)
- Issue: #209

## 問題背景
FMP 近期調整 API 政策並全面推廣 `/stable/` 架構，舊版 `/api/v3/profile/AAPL` 被標記為受限端點，新註冊或既有免費金鑰存取時會回傳 `403 Forbidden`。探針先前使用該舊端點，導致有效金鑰被誤判為無效或未獲授權。

## 任務細節
1. 修改 `src/engine/apiKeyHealthProbe.ts`：
   - 將 FMP 測試端點遷移至免費方案相容的 `https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=${key}`。
   - 優化 HTTP 403 錯誤提示為：`金鑰無效、未獲授權或當前方案無權存取該端點 (403 Forbidden)`。
2. 更新單元測試：
   - `src/engine/apiKeyHealthProbe.test.ts`：驗證 FMP 探針發送至 stable quote 端點。
   - `src/components/UnifiedApiKeyManager.test.tsx`：同步更新預期 URL 斷言。

## 驗收標準
- [x] 單元測試通過，FMP 探針斷言正確對齊 stable quote。
- [x] 免費有效金鑰測試不再因 Special Endpoint 限制回傳 403。
