import { describe, it, expect } from 'vitest';
import {
  exportE2EEEncryptedBackup,
  decryptE2EEBackup,
  isE2EEBackupPayload,
} from './e2eeBackupEngine';

describe('E2EE Backup Engine (Seam: 零知識主密碼端對端加密備份)', () => {
  const sampleDatabaseJson = JSON.stringify({
    version: 1,
    exportedAt: '2026-10-02T09:00:00.000Z',
    data: {
      trades: [
        {
          id: 'trade-secret-1',
          symbol: '2330',
          shares: 5000,
          price: 980,
          date: '2026-10-01',
        },
      ],
      brokerAccounts: [{ id: 'acc-1', name: '主要證券帳戶' }],
    },
  });

  const masterPassphrase = 'MyStrongMasterPassword!2026';

  describe('Ticket 09: exportE2EEEncryptedBackup (密文封包導出)', () => {
    it('應產出標準格式之 E2EE 封包，且密文中不含任何明文字串', async () => {
      const encryptedJson = await exportE2EEEncryptedBackup(sampleDatabaseJson, masterPassphrase);
      expect(typeof encryptedJson).toBe('string');

      // 檢查密文中絕不包含敏感明文字串
      expect(encryptedJson).not.toContain('trade-secret-1');
      expect(encryptedJson).not.toContain('2330');
      expect(encryptedJson).not.toContain('主要證券帳戶');

      const parsed = JSON.parse(encryptedJson);
      expect(isE2EEBackupPayload(parsed)).toBe(true);
      expect(parsed.format).toBe('STOCK_TRACKER_E2EE_BACKUP');
      expect(parsed.version).toBe(1);
      expect(parsed.crypto.algorithm).toBe('AES-GCM');
      expect(parsed.crypto.iterations).toBe(100_000);
      expect(typeof parsed.crypto.salt).toBe('string');
      expect(typeof parsed.crypto.iv).toBe('string');
      expect(typeof parsed.ciphertext).toBe('string');
    });

    it('空密碼時應安全拋出驗證錯誤', async () => {
      await expect(exportE2EEEncryptedBackup(sampleDatabaseJson, '')).rejects.toThrow(
        '主密碼不可為空'
      );
    });
  });

  describe('Ticket 10: decryptE2EEBackup (密文備份解密與驗證)', () => {
    it('使用正確主密碼時應 100% 完整還原原始資料庫 JSON 字串', async () => {
      const encryptedJson = await exportE2EEEncryptedBackup(sampleDatabaseJson, masterPassphrase);
      const decrypted = await decryptE2EEBackup(encryptedJson, masterPassphrase);

      expect(JSON.parse(decrypted)).toEqual(JSON.parse(sampleDatabaseJson));
      const parsedDecrypted = JSON.parse(decrypted);
      expect(parsedDecrypted.data.trades[0].symbol).toBe('2330');
      expect(parsedDecrypted.data.trades[0].shares).toBe(5000);
    });

    it('使用錯誤主密碼時應拋出明確解密異常，且阻斷垃圾外洩', async () => {
      const encryptedJson = await exportE2EEEncryptedBackup(sampleDatabaseJson, masterPassphrase);
      await expect(decryptE2EEBackup(encryptedJson, 'WrongPassword123')).rejects.toThrow(
        '解密失敗'
      );
    });

    it('面對格式畸形或非 E2EE 封包時應主動拒絕', async () => {
      await expect(decryptE2EEBackup('{"not": "e2ee"}', masterPassphrase)).rejects.toThrow(
        '無效的 E2EE 備份檔案格式'
      );
    });
  });
});
