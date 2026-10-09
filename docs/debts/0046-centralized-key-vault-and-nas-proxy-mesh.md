# 技術債 0046：中央金鑰庫與私有雲全端代理架構 (Centralized Key Vault & NAS Proxy Mesh)

- **建立日期**：2026-10-09
- **狀態**：`OPEN`
- **關聯規格**：[Spec 0175](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docs/specs/0175-api-key-probe-csp-cors-and-endpoint-repair-spec.md)、[Spec 0168](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docs/specs/0168-zero-csv-dual-market-backfill-and-unified-api-key-console-spec.md)
- **嚴重性**：Medium (架構完整性與跨裝置體驗演進)

---

## 1. 現狀與架構痛點 (Problem Context)

目前「外部金融 API 整合控制台」採用純客戶端 LocalStorage 加密儲存金鑰，並由前端瀏覽器發起所有外部 API 請求。在 QNAP NAS 等私有雲部署場景下，暴露出以下結構性限制：

1. **跨裝置儲存隔離**：
   - 瀏覽器 LocalStorage 綁定單一 Origin（網域、IP 與 Port）。使用者在電腦設定金鑰後，用手機開啟或透過不同網址（如 LAN IP vs Tailscale IP）訪問 NAS，金鑰無法互通。
2. **前後端職責倒置與安全邊界**：
   - 前端發起請求受限於 W3C 禁止標頭規範（無法自訂 SEC EDGAR 所需的合規 `User-Agent`，存在家用 IP 遭封鎖風險）。
   - 金鑰在瀏覽器 Network 面板中以 Query Param 明文傳輸，未收斂至後端隔離。
3. **業務管線尚未深度接軌金鑰輪替池**：
   - 即時行情與財報抓取模組尚未全面接入 `SmartKeyRotator`，多金鑰輪替效果受限。

---

## 2. 建議改善目標 (Architecture Target)

1. **後端持久化金鑰庫 (Server-side Key Vault)**：
   - 在 NAS 容器既有的 SQLite 資料庫中建立 `api_key_vault` 實體表，儲存經伺服器端環境金鑰加密的 Provider Token。
   - 跨電腦、手機訪問同一個 NAS 實體時，自動繼承金鑰配置，徹底消滅 Origin 隔離問題。
2. **全端 API 轉發中介 (Server-side Reverse Proxy Mesh)**：
   - 由 NAS 容器 Node.js 伺服器代理所有外部連線，前端僅呼叫 `/api/proxy/financial/:provider`。
   - 伺服器端注入合規 `User-Agent`（解決 SEC 限制）與金鑰，並處理 429 限流輪替，金鑰永不暴露至前端。
3. **向下相容離線模式**：
   - 若使用者在純靜態（無後端伺服器）環境開啟，則平滑回退至現行 LocalStorage 模式。
