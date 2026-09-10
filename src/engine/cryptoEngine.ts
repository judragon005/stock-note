/**
 * Web Crypto 密碼學加密核心引擎與持久化遷移 (W3C Web Crypto Standard)
 * 零外部依賴，純原生 Web Crypto API (AES-GCM 256-bit + PBKDF2 100,000 次疊代)
 */

export interface EncryptedPayload {
  version: 1;
  algorithm: 'AES-GCM';
  salt: string;       // Base64 編碼之 16-byte 隨機 Salt
  iv: string;         // Base64 編碼之 12-byte 隨機 IV
  ciphertext: string; // Base64 編碼之 AES-GCM 密文 (含 Auth Tag)
}

export class CryptoDecryptionError extends Error {
  constructor(message = '解密失敗：主密碼錯誤或密文資料已遭竄改') {
    super(message);
    this.name = 'CryptoDecryptionError';
  }
}

const PBKDF2_ITERATIONS = 100_000;
const DEVICE_SEED_STORAGE_KEY = '__stock_note_device_seed__';

/**
 * 取得環境中的 Web Crypto SubtleCrypto 介面
 */
function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('當前環境不支援標準 Web Crypto API (window.crypto.subtle)');
}

/**
 * Uint8Array 與 Base64 互相轉換輔助工具
 */
function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * 取得或生成設備端唯一的透明隨機種子（當使用者未自訂主密碼時使用）
 */
function getOrCreateDeviceSeed(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      let seed = localStorage.getItem(DEVICE_SEED_STORAGE_KEY);
      if (!seed) {
        const randomBytes = new Uint8Array(32);
        if (globalThis.crypto?.getRandomValues) {
          globalThis.crypto.getRandomValues(randomBytes);
        } else {
          for (let i = 0; i < 32; i++) randomBytes[i] = Math.floor(Math.random() * 256);
        }
        seed = bufferToBase64(randomBytes);
        localStorage.setItem(DEVICE_SEED_STORAGE_KEY, seed);
      }
      return seed;
    }
  } catch {
    // 忽略 storage 訪問錯誤
  }
  return 'StockTracker-Default-Device-Entropy-Seed-2026';
}

/**
 * PBKDF2 密鑰衍生函式
 */
async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const enc = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 判斷目標物件是否為合規的 EncryptedPayload
 */
export function isEncryptedPayload(obj: unknown): obj is EncryptedPayload {
  if (!obj || typeof obj !== 'object') return false;
  const target = obj as Record<string, unknown>;
  return (
    target.version === 1 &&
    target.algorithm === 'AES-GCM' &&
    typeof target.salt === 'string' &&
    typeof target.iv === 'string' &&
    typeof target.ciphertext === 'string'
  );
}

/**
 * AES-GCM 256-bit 加密封裝
 */
export async function encryptPayload<T>(data: T, passphrase?: string): Promise<EncryptedPayload> {
  const subtle = getSubtleCrypto();
  const effectivePassphrase = passphrase && passphrase.trim() ? passphrase.trim() : getOrCreateDeviceSeed();

  // 1. 生成 16-byte random salt 與 12-byte random IV
  const salt = new Uint8Array(16);
  const iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(salt);
  globalThis.crypto.getRandomValues(iv);

  // 2. 衍生 AES-GCM 256-bit 金鑰
  const aesKey = await deriveAesKey(effectivePassphrase, salt);

  // 3. 序列化並加密
  const enc = new TextEncoder();
  const plainText = typeof data === 'string' ? data : JSON.stringify(data);
  const plainBuffer = enc.encode(plainText);

  const cipherBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    plainBuffer
  );

  return {
    version: 1,
    algorithm: 'AES-GCM',
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(new Uint8Array(cipherBuffer)),
  };
}

/**
 * AES-GCM 256-bit 解密還原
 */
export async function decryptPayload<T>(payload: EncryptedPayload, passphrase?: string): Promise<T> {
  if (!isEncryptedPayload(payload)) {
    throw new Error('傳入的不是合法的 EncryptedPayload 格式');
  }

  const subtle = getSubtleCrypto();
  const effectivePassphrase = passphrase && passphrase.trim() ? passphrase.trim() : getOrCreateDeviceSeed();

  try {
    const salt = base64ToBuffer(payload.salt);
    const iv = base64ToBuffer(payload.iv);
    const ciphertext = base64ToBuffer(payload.ciphertext);

    const aesKey = await deriveAesKey(effectivePassphrase, salt);

    const decryptedBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv: iv as any },
      aesKey,
      ciphertext as any
    );

    const dec = new TextDecoder();
    const jsonStr = dec.decode(decryptedBuffer);

    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      return jsonStr as unknown as T;
    }
  } catch (err) {
    if (err instanceof CryptoDecryptionError) throw err;
    throw new CryptoDecryptionError(
      `解密失敗：主密碼錯誤或密文資料已遭竄改 (${err instanceof Error ? err.message : String(err)})`
    );
  }
}

/**
 * 敏感金鑰原地自動遷移 (Auto-Migration)
 * 若輸入為傳統明文物件，無痛升級為 EncryptedPayload
 */
export async function migrateApiKeysConfig(
  configOrPayload: unknown,
  passphrase?: string
): Promise<{ payload: EncryptedPayload; migrated: boolean }> {
  if (isEncryptedPayload(configOrPayload)) {
    return { payload: configOrPayload, migrated: false };
  }

  // 明文或一般物件，執行加密升級
  const payload = await encryptPayload(configOrPayload, passphrase);
  return { payload, migrated: true };
}
