# Debt 0069: 獨立 Vault 加密隔離、NAS 認證邊界與前端 Code-Splitting／儲存競態瘦身 (Wave 4)

- **優先級 (Priority)**: `P2`
- **狀態 (Status)**: `OPEN`
- **發現來源**: Spec 0247 五路正交法醫審計 (Issue `#609`)
- **標籤**: `Security` · `Architecture` · `Performance` · `Storage` · `Wave4`
- **預計觸發時機**: Wave 4（規劃為 `Spec 0251`，與 [Debt 0046](0046-centralized-key-vault-and-nas-proxy-mesh.md) 一併清償）

---

## 背景與現況

1. **NAS 零認證暴露、假 XOR 加密與 `vault.db` 隔離需求**：
   - `nas-server.cjs` 綁定 `0.0.0.0:3000` 無認證邊界且 `/api/proxy` 設 `Access-Control-Allow-Origin: *`；`Dockerfile` 以 `root` 執行容器進程。
   - 前端 `STOCK_TRACKER_API_KEYS_V1` 為明文、`apiKeyStorage.ts` 為固定鹽值 XOR 混淆卻宣稱 Web Crypto 256-bit、`SmartKeyRotator.executeWithRotation()` 生產調用 0 次；5 處外部業務 API Key 仍放 URL Query Param；CSP 含 `'unsafe-eval'` 且未於 HTTP 回應標頭注入 `frame-ancestors 'none'`。
   - 依 Debt 0046 演進中央金鑰庫時，**嚴禁與公開 `market_history.db` 共庫**（避免每週 `VACUUM INTO` 滾動備份外洩金鑰），須隔離至獨立 `vault.db`（獨立非快取目錄、`0600` 權限、AES-256-GCM 加密）。
2. **前端零 Code-Splitting 與 LocalStorage/IndexedDB 儲存雙雷**：
   - 全站 `React.lazy()` = 0，首屏同步 JS > 2.1 MB（含 308 KB `stockDictionary.ts` 與全部工作區）；
   - `src/utils/storage.ts` 全量同步寫入 5MB 受限 `localStorage` 並同時觸發未 `await` 的 `dbClear().then(() => dbBatchPut())` 異步覆寫競態；`src/utils/db.ts` `exportFullDatabaseJSON` 同時於 `payload` 與 `data` 雙份序列化全量資料與快照。

## 建議演進方向

1. 配合 Debt 0046 實作獨立 `vault.db` + 伺服器端代注憑證 + 選配 `NAS_ACCESS_TOKEN` / Same-Origin 寫入守衛 + 收緊 CORS 與 HTTP CSP Header + `Dockerfile` 切 `USER node` + 離線模式真正接線 Web Crypto 與 `SmartKeyRotator`。
2. 針對 `App.tsx` 12 工作區與重型字典導入 `React.lazy` 動態載入，修復 `storage.ts` 非同步清空競態並消除 `db.ts` 雙倍冗餘序列化。
