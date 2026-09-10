# 05 — 自訂 Proxy 網址協定校驗與 SSRF 內網防禦 (Custom Proxy Validation & SSRF Defense)

**What to build:**
在自訂代理伺服器（Custom Proxy）的配置與驗證層實作嚴格的安全邊界檢查函數 `validateCustomProxyUrl`。針對使用者在設定工作區填寫的 Proxy URL，嚴格校驗傳輸協定（必須為 `https:`，拒絕不安全的明文 `http:`、`ftp:`、`javascript:` 等協定）；同時阻斷指向本機或私有內網 IPv4 網段（`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`）與雲端 Metadata 位址（`169.254.169.254`），從源頭消除伺服器端請求偽造 (SSRF) 與內網探測攻擊面。

**Blocked by:** 04 — Zero-Credential Proxy Router Guard

**Status:** complete

- [x] 實作 `validateCustomProxyUrl` 檢核函數，回傳 `{ valid: boolean; error?: string }`
- [x] 強制校驗 URL Scheme 為 `https:`（開發環境允許配置特定的 localhost 測試例外）
- [x] 解析 Hostname / IP，阻斷所有私有 RFC 1918 網段與 Link-Local、Loopback 位址
- [x] 整合至 `SettingsWorkspace` 的 Proxy 設定介面，即時提供紅字警示並禁止儲存非法代理
- [x] 單元測試驗證各類合法外網 HTTPS 代理、明文 HTTP 代理與內網 IP 攻擊模式之攔截正確性
