# 04-key-pool-local-storage-encryption-store

## Description
實作客戶端 API Key 安全儲存層，使用瀏覽器 Web Crypto API 或專案既有 `e2eeBackupEngine.ts` 對金鑰進行本地加密持久化，並提供對外遮罩安全函式（Masking），杜絕金鑰在 UI 或控制台以明文形式洩漏。

## Target Files
- `src/engine/apiKeyStorage.ts`
- `src/engine/apiKeyStorage.test.ts`

## Acceptance Criteria
- [x] 實作 `saveEncryptedKeyPool(keys: ApiKeyItem[]): Promise<void>` 與 `loadEncryptedKeyPool(): Promise<ApiKeyItem[]>`。
- [x] 儲存時使用本地裝置衍生密鑰（Web Crypto PBKDF2/AES-GCM）進行加密，確保 `localStorage` 中不留明文。
- [x] 實作 `maskApiKey(key: string): string` 函式，例如 `fm_live_abcdef123456` 轉換為 `fm_live_****3456`，中間一律以星號隱匿。
- [x] 實作「清除全域金鑰」的安全抹除（Zeroize）功能。
- [x] 單元測試驗證加解密的一致性、非法密文還原時的防禦容錯、以及遮罩輸出格式。

## Status
- [x] done
