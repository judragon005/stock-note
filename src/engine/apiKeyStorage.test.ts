import { describe, it, expect, beforeEach } from 'vitest';
import {
  maskApiKey,
  saveEncryptedKeyPool,
  loadEncryptedKeyPool,
  clearKeyPoolStorage,
  getRawStorageValue,
} from './apiKeyStorage';
import { createDefaultApiKeyItem } from './apiKeyPoolTypes';

describe('Ticket 04: Key Pool Local Storage Encryption Store', () => {
  beforeEach(() => {
    clearKeyPoolStorage();
  });

  it('1. maskApiKey 應正確遮蔽金鑰敏感資訊', () => {
    expect(maskApiKey('fm_live_abcdef123456')).toBe('fm_live_****3456');
    expect(maskApiKey('sk-1234567890')).toBe('sk-1****7890');
    expect(maskApiKey('short')).toBe('s***t');
    expect(maskApiKey('')).toBe('****');
  });

  it('2. saveEncryptedKeyPool 與 loadEncryptedKeyPool 應可完整加解密往返存取', async () => {
    const item1 = createDefaultApiKeyItem('finmind', 'fm_secret_key_1', { alias: '主帳號' });
    const item2 = createDefaultApiKeyItem('fred', 'fred_secret_token_2', { alias: '備用' });

    await saveEncryptedKeyPool([item1, item2]);

    // 驗證底層儲存的內容絕非明文
    const rawStored = getRawStorageValue();
    expect(rawStored).toBeTruthy();
    expect(rawStored?.includes('fm_secret_key_1')).toBe(false);
    expect(rawStored?.includes('fred_secret_token_2')).toBe(false);

    // 讀回並解密
    const restored = await loadEncryptedKeyPool();
    expect(restored.length).toBe(2);
    expect(restored[0].key).toBe('fm_secret_key_1');
    expect(restored[0].alias).toBe('主帳號');
    expect(restored[1].key).toBe('fred_secret_token_2');
    expect(restored[1].alias).toBe('備用');
  });

  it('3. clearKeyPoolStorage 應徹底抹除本地儲存', async () => {
    const item = createDefaultApiKeyItem('finnhub', 'token_xyz');
    await saveEncryptedKeyPool([item]);
    expect(getRawStorageValue()).toBeTruthy();

    clearKeyPoolStorage();
    expect(getRawStorageValue()).toBeNull();
    const loaded = await loadEncryptedKeyPool();
    expect(loaded).toEqual([]);
  });
});
