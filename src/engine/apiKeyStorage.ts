/**
 * API 金鑰本地加密儲存與遮罩模組 (Spec 0167 / Ticket 04)
 * Client-Side API Key Encryption Storage
 */

import { ApiKeyItem } from './apiKeyPoolTypes';
import { logger } from '../utils/logger';

const STORAGE_KEY = '__stock_tracker_api_keys_v1__';
const OBFUSCATION_SALT = 'StockTracker_Salt_2026_Secure_Key_Pool';

// 記憶體備援（供 Node / SSR 環境使用）
let memoryStore: Record<string, string> = {};

function getStorageItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return memoryStore[key] ?? null;
}

function setStorageItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  } else {
    memoryStore[key] = value;
  }
}

function removeStorageItem(key: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  } else {
    delete memoryStore[key];
  }
}

export function getRawStorageValue(): string | null {
  return getStorageItem(STORAGE_KEY);
}

/**
 * 遮蔽敏感金鑰（保留前綴與末 4 碼，中間遮蔽）
 */
export function maskApiKey(key: string): string {
  if (!key || key.length === 0) return '****';
  if (key.length <= 4) return '****';
  if (key.length <= 8) {
    return `${key.charAt(0)}***${key.charAt(key.length - 1)}`;
  }
  // 若包含常見的底線前綴 (如 fm_live_xxx 或 sk_live_xxx)，保留完整前綴
  const lastUnderscoreIndex = key.lastIndexOf('_');
  if (lastUnderscoreIndex >= 2 && lastUnderscoreIndex < key.length - 4) {
    const prefix = key.slice(0, lastUnderscoreIndex + 1);
    const suffix = key.slice(key.length - 4);
    return `${prefix}****${suffix}`;
  }
  const prefix = key.slice(0, 4);
  const suffix = key.slice(key.length - 4);
  return `${prefix}****${suffix}`;
}

/**
 * 簡易可逆混淆加密（基於 XOR + 滾動鹽值 + Base64）
 * 適用於瀏覽器環境下快速加密保存金鑰，防止明文檢索
 */
function obfuscateText(plainText: string): string {
  const chars: string[] = [];
  for (let i = 0; i < plainText.length; i++) {
    const charCode = plainText.charCodeAt(i) ^ OBFUSCATION_SALT.charCodeAt(i % OBFUSCATION_SALT.length);
    chars.push(String.fromCharCode(charCode));
  }
  return btoa(encodeURIComponent(chars.join('')));
}

function deobfuscateText(cipherText: string): string {
  try {
    const raw = decodeURIComponent(atob(cipherText));
    const chars: string[] = [];
    for (let i = 0; i < raw.length; i++) {
      const charCode = raw.charCodeAt(i) ^ OBFUSCATION_SALT.charCodeAt(i % OBFUSCATION_SALT.length);
      chars.push(String.fromCharCode(charCode));
    }
    return chars.join('');
  } catch (err: any) {
    logger.warn('[ApiKeyStorage] 解密失敗或密文格式損毀', err);
    return '';
  }
}

/**
 * 加密保存金鑰池陣列至 LocalStorage
 */
export async function saveEncryptedKeyPool(keys: ApiKeyItem[]): Promise<void> {
  try {
    const jsonStr = JSON.stringify(keys);
    const encrypted = obfuscateText(jsonStr);
    setStorageItem(STORAGE_KEY, encrypted);
  } catch (err: any) {
    logger.error('[ApiKeyStorage] 保存金鑰失敗', err);
    throw err;
  }
}

/**
 * 自 LocalStorage 讀取並解密金鑰池陣列
 */
export async function loadEncryptedKeyPool(): Promise<ApiKeyItem[]> {
  try {
    const raw = getStorageItem(STORAGE_KEY);
    if (!raw) return [];
    const decrypted = deobfuscateText(raw);
    if (!decrypted) return [];
    return JSON.parse(decrypted);
  } catch (err: any) {
    logger.error('[ApiKeyStorage] 讀取金鑰失敗', err);
    return [];
  }
}

/**
 * 清除本地保存之所有金鑰
 */
export function clearKeyPoolStorage(): void {
  removeStorageItem(STORAGE_KEY);
}
