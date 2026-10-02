import { encryptPayload, decryptPayload, EncryptedPayload, CryptoDecryptionError } from './cryptoEngine';

export interface E2EEBackupPayload {
  format: 'STOCK_TRACKER_E2EE_BACKUP';
  version: 1;
  createdAt: string;
  crypto: {
    algorithm: 'AES-GCM';
    keyDerivation: 'PBKDF2';
    iterations: number;
    salt: string;
    iv: string;
  };
  ciphertext: string;
}

/**
 * 檢查傳入物件是否為合規之 E2EE 加密備份封包
 */
export function isE2EEBackupPayload(payload: unknown): payload is E2EEBackupPayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Partial<E2EEBackupPayload>;
  return (
    p.format === 'STOCK_TRACKER_E2EE_BACKUP' &&
    p.version === 1 &&
    typeof p.ciphertext === 'string' &&
    p.crypto?.algorithm === 'AES-GCM' &&
    typeof p.crypto?.salt === 'string' &&
    typeof p.crypto?.iv === 'string'
  );
}

/**
 * 使用主密碼將原始資料庫 JSON 字串加密為標準 E2EE 封包
 */
export async function exportE2EEEncryptedBackup(
  databaseJson: string,
  passphrase: string
): Promise<string> {
  if (!passphrase || passphrase.trim() === '') {
    throw new Error('主密碼不可為空');
  }

  const rawEncrypted: EncryptedPayload = await encryptPayload<string>(databaseJson, passphrase.trim());

  const backupPackage: E2EEBackupPayload = {
    format: 'STOCK_TRACKER_E2EE_BACKUP',
    version: 1,
    createdAt: new Date().toISOString(),
    crypto: {
      algorithm: 'AES-GCM',
      keyDerivation: 'PBKDF2',
      iterations: 100_000,
      salt: rawEncrypted.salt,
      iv: rawEncrypted.iv,
    },
    ciphertext: rawEncrypted.ciphertext,
  };

  return JSON.stringify(backupPackage, null, 2);
}

/**
 * 使用主密碼解密 E2EE 加密備份封包，還原出原始資料庫 JSON 字串
 */
export async function decryptE2EEBackup(
  encryptedJson: string,
  passphrase: string
): Promise<string> {
  if (!passphrase || passphrase.trim() === '') {
    throw new Error('主密碼不可為空');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(encryptedJson);
  } catch {
    throw new Error('無效的 E2EE 備份檔案格式：非有效 JSON');
  }

  if (!isE2EEBackupPayload(parsed)) {
    throw new Error('無效的 E2EE 備份檔案格式：缺少必要標頭或演算法不符');
  }

  const payload: EncryptedPayload = {
    version: 1,
    algorithm: 'AES-GCM',
    salt: parsed.crypto.salt,
    iv: parsed.crypto.iv,
    ciphertext: parsed.ciphertext,
  };

  try {
    const result = await decryptPayload<unknown>(payload, passphrase.trim());
    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch (err) {
    if (err instanceof CryptoDecryptionError) {
      throw new Error('解密失敗：主密碼錯誤或密文資料已遭竄改');
    }
    throw err;
  }
}
