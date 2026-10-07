import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  UnifiedApiKeyManager,
  PROVIDER_CONFIGS,
  DISPLAYED_PROVIDERS,
} from './UnifiedApiKeyManager';
import { probeApiKey } from '../engine/apiKeyHealthProbe';
import { createDefaultApiKeyItem } from '../engine/apiKeyPoolTypes';
import { maskApiKey } from '../engine/apiKeyStorage';

describe('UnifiedApiKeyManager - 統一金融 API 金鑰控制台 (Spec 0168 / Ticket 05)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. 供應商配置規格檢驗 (PROVIDER_CONFIGS & DISPLAYED_PROVIDERS)', () => {
    it('應正確涵蓋 6 大核心金融與總經供應商', () => {
      expect(DISPLAYED_PROVIDERS).toContain('finmind');
      expect(DISPLAYED_PROVIDERS).toContain('finnhub');
      expect(DISPLAYED_PROVIDERS).toContain('fmp');
      expect(DISPLAYED_PROVIDERS).toContain('fred');
      expect(DISPLAYED_PROVIDERS).toContain('coingecko');
      expect(DISPLAYED_PROVIDERS).toContain('sec');
    });

    it('各核心供應商配置應具備正確中文標籤與預設配額', () => {
      expect(PROVIDER_CONFIGS.finmind.label).toBe('FinMind');
      expect(PROVIDER_CONFIGS.finmind.defaultQuota).toBe(300);
      expect(PROVIDER_CONFIGS.finmind.keyName).toBe('finmindToken');

      expect(PROVIDER_CONFIGS.fmp.label).toContain('FMP');
      expect(PROVIDER_CONFIGS.fmp.defaultQuota).toBe(250);
      expect(PROVIDER_CONFIGS.fmp.keyName).toBe('fmpApiKey');

      expect(PROVIDER_CONFIGS.sec.defaultQuota).toBe(-1); // 免費無限制
      expect(PROVIDER_CONFIGS.sec.keyName).toBeNull(); // 免 Key
    });
  });

  describe('2. UI 渲染與 Dark Glassmorphism 現代金融介面驗證', () => {
    it('初次渲染應展示標題、256-bit 加密安全指示與自訂 Proxy 輸入框', () => {
      const html = renderToStaticMarkup(
        <UnifiedApiKeyManager
          initialApiKeys={{
            finmindToken: 'token_alpha_123456789',
            customProxyUrl: 'https://proxy.example.workers.dev',
          }}
        />
      );

      // 驗證標題與 256-bit 安全指示
      expect(html).toContain('外部金融 API 整合控制台');
      expect(html).toContain('Web Crypto 256-bit 保護中');

      // 驗證自訂代理伺服器端點配置
      expect(html).toContain('自訂代理伺服器端點 (Proxy URL):');
      expect(html).toContain('https://proxy.example.workers.dev');

      // 驗證 6 大供應商 Tabs 均在 HTML 中渲染
      expect(html).toContain('data-testid="tab-provider-finmind"');
      expect(html).toContain('data-testid="tab-provider-finnhub"');
      expect(html).toContain('data-testid="tab-provider-fmp"');
      expect(html).toContain('data-testid="tab-provider-fred"');
      expect(html).toContain('data-testid="tab-provider-coingecko"');
      expect(html).toContain('data-testid="tab-provider-sec"');

      // 驗證當前預設選中之 FinMind 卡片
      expect(html).toContain('data-testid="card-provider-finmind"');
      expect(html).toContain('當前主要作用金鑰 (Primary Active Key)');
      expect(html).toContain('token_alpha_123456789');

      // 驗證輪替備援表單
      expect(html).toContain('新增備援金鑰至輪替池');
    });

    it('套用暗黑毛玻璃樣式，絕不出現原生白色未修飾 input 容器', () => {
      const html = renderToStaticMarkup(<UnifiedApiKeyManager />);

      expect(html).toContain('data-testid="unified-api-key-manager"');
      // 驗證毛玻璃深藍暗底
      expect(html).toContain('rgba(15, 23, 42');
      // 驗證隱私保護保證提示
      expect(html).toContain('隱私保護保證：所有外部 API 金鑰均儲存在您瀏覽器的本機 LocalStorage 與 IndexedDB 加密儲存區中');
    });
  });

  describe('3. 金鑰遮罩與健康探針 (Health Probe) 跨供應商連動', () => {
    it('maskApiKey 應正確對 Token 中段敏感資訊進行遮蔽', () => {
      expect(maskApiKey('fm_live_abcdef123456')).toBe('fm_live_****3456');
      expect(maskApiKey('sk-1234567890')).toBe('sk-1****7890');
      expect(maskApiKey('short')).toBe('s***t');
    });

    it('createDefaultApiKeyItem 應具備正確之 provider 與預設防護屬性', () => {
      const item = createDefaultApiKeyItem('fmp', 'fmp_secret_token_abc', {
        alias: '美股專用帳號',
        dailyQuotaLimit: 500,
      });

      expect(item.provider).toBe('fmp');
      expect(item.key).toBe('fmp_secret_token_abc');
      expect(item.alias).toBe('美股專用帳號');
      expect(item.dailyQuotaLimit).toBe(500);
      expect(item.totalRequestsToday).toBe(0);
      expect(item.isBlacklisted).toBe(false);
    });

    it('probeApiKey 能正確映射 FMP 與 FinMind 等供應商端點發起探針', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({
        status: 200,
      } as Response);

      const fmpRes = await probeApiKey('fmp', 'test_fmp_key_123', mockFetcher);
      expect(mockFetcher).toHaveBeenCalledWith(
        expect.stringContaining('financialmodelingprep.com/api/v3/profile/AAPL?apikey=test_fmp_key_123'),
        expect.anything()
      );
      expect(fmpRes.status).toBe('HEALTHY');
      expect(fmpRes.httpStatus).toBe(200);

      const finmindRes = await probeApiKey('finmind', 'test_fm_token_456', mockFetcher);
      expect(mockFetcher).toHaveBeenCalledWith(
        expect.stringContaining('api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo&token=test_fm_token_456'),
        expect.anything()
      );
      expect(finmindRes.status).toBe('HEALTHY');
    });
  });
});
