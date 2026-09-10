import { describe, it, expect } from 'vitest';
import {
  encryptPayload,
  decryptPayload,
  isEncryptedPayload,
  migrateApiKeysConfig,
  CryptoDecryptionError,
  type EncryptedPayload,
} from './cryptoEngine';
import type { ApiKeysConfig } from '../types/stock';

describe('Web Crypto Engine (密碼學加密核心引擎與持久化遷移)', () => {
  const sampleData: ApiKeysConfig = {
    finmindToken: 'finmind_super_secret_token_12345',
    fmpApiKey: 'fmp_key_abcdef67890',
    alphaVantageKey: 'av_key_xyz987',
    customProxyUrl: 'https://proxy.myinvest.internal',
  };

  const masterPassphrase = 'MyStrongPassphrase!2026';

  describe('1. 密文封裝結構與隨機熵 (Salt & IV Entropy)', () => {
    it('應正確產出符合規格之 EncryptedPayload (version: 1, algorithm: AES-GCM, salt, iv, ciphertext)', async () => {
      const encrypted = await encryptPayload(sampleData, masterPassphrase);

      expect(encrypted).toBeDefined();
      expect(encrypted.version).toBe(1);
      expect(encrypted.algorithm).toBe('AES-GCM');
      expect(typeof encrypted.salt).toBe('string');
      expect(typeof encrypted.iv).toBe('string');
      expect(typeof encrypted.ciphertext).toBe('string');
      expect(encrypted.salt.length).toBeGreaterThan(10);
      expect(encrypted.iv.length).toBeGreaterThan(10);
      expect(encrypted.ciphertext.length).toBeGreaterThan(10);
    });

    it('連續兩次加密相同內容，Salt, IV 與 Ciphertext 必須因隨機熵而完全不同', async () => {
      const enc1 = await encryptPayload(sampleData, masterPassphrase);
      const enc2 = await encryptPayload(sampleData, masterPassphrase);

      expect(enc1.salt).not.toBe(enc2.salt);
      expect(enc1.iv).not.toBe(enc2.iv);
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    });

    it('isEncryptedPayload 能精確識別物件是否為合規之密文封裝', async () => {
      const valid = await encryptPayload(sampleData, masterPassphrase);
      expect(isEncryptedPayload(valid)).toBe(true);

      expect(isEncryptedPayload(null)).toBe(false);
      expect(isEncryptedPayload({})).toBe(false);
      expect(isEncryptedPayload({ version: 2, algorithm: 'AES-CBC' })).toBe(false);
      expect(isEncryptedPayload('plain-text-string')).toBe(false);
      expect(isEncryptedPayload(sampleData)).toBe(false);
    });
  });

  describe('2. 加解密往返與抗篡改防禦 (Roundtrip & Error Handling)', () => {
    it('使用正確主密碼解密，應 100% 無損還原原始資料物件', async () => {
      const encrypted = await encryptPayload(sampleData, masterPassphrase);
      const decrypted = await decryptPayload<ApiKeysConfig>(encrypted, masterPassphrase);

      expect(decrypted).toEqual(sampleData);
      expect(decrypted.finmindToken).toBe(sampleData.finmindToken);
      expect(decrypted.fmpApiKey).toBe(sampleData.fmpApiKey);
    });

    it('使用錯誤主密碼解密，必須拋出 CryptoDecryptionError，杜絕垃圾資料洩漏', async () => {
      const encrypted = await encryptPayload(sampleData, masterPassphrase);

      await expect(
        decryptPayload<ApiKeysConfig>(encrypted, 'WrongPassword123!')
      ).rejects.toThrow(CryptoDecryptionError);
    });

    it('密文遭惡意篡改時，AES-GCM Auth Tag 驗證失敗必須拋出異常', async () => {
      const encrypted = await encryptPayload(sampleData, masterPassphrase);
      // 篡改 ciphertext
      const tampered: EncryptedPayload = {
        ...encrypted,
        ciphertext: 'TamperedCiphertext==' + encrypted.ciphertext.slice(20),
      };

      await expect(
        decryptPayload<ApiKeysConfig>(tampered, masterPassphrase)
      ).rejects.toThrow();
    });
  });

  describe('3. 明文金鑰原地平滑升級 (Auto-Migration)', () => {
    it('若輸入為傳統明文 ApiKeysConfig，應自動遷移並加密返回密文封裝', async () => {
      const legacyRaw: ApiKeysConfig = {
        finmindToken: 'legacy-token-abc',
        fmpApiKey: 'legacy-fmp-xyz',
      };

      const result = await migrateApiKeysConfig(legacyRaw, masterPassphrase);
      expect(result.migrated).toBe(true);
      expect(isEncryptedPayload(result.payload)).toBe(true);

      // 解密驗證
      const restored = await decryptPayload<ApiKeysConfig>(result.payload, masterPassphrase);
      expect(restored.finmindToken).toBe('legacy-token-abc');
      expect(restored.fmpApiKey).toBe('legacy-fmp-xyz');
    });

    it('若輸入已經是 EncryptedPayload，migrated 應為 false 且保持原狀', async () => {
      const alreadyEncrypted = await encryptPayload(sampleData, masterPassphrase);
      const result = await migrateApiKeysConfig(alreadyEncrypted, masterPassphrase);

      expect(result.migrated).toBe(false);
      expect(result.payload).toEqual(alreadyEncrypted);
    });

    it('若未提供自訂主密碼，系統能自動使用裝置安全金鑰進行透明加解密', async () => {
      const encrypted = await encryptPayload(sampleData);
      expect(isEncryptedPayload(encrypted)).toBe(true);

      const restored = await decryptPayload<ApiKeysConfig>(encrypted);
      expect(restored).toEqual(sampleData);
    });
  });
});
