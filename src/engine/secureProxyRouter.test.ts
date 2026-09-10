import { describe, it, expect } from 'vitest';
import {
  inspectRequestForCredentials,
  getSafeProxyUrlChain,
  validateCustomProxyUrl,
  SecurityCredentialRoutingError,
} from './secureProxyRouter';

describe('Secure Proxy Router & SSRF Guard (安全網路路由閘門與 SSRF 防禦)', () => {
  describe('1. 敏感憑證檢測 (inspectRequestForCredentials)', () => {
    it('應能精確識別含有 token 查詢參數之 URL', () => {
      const result = inspectRequestForCredentials('https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&token=secret_abc_123');
      expect(result.hasCredentials).toBe(true);
      expect(result.detectedKeyWords).toContain('token');
    });

    it('應能精確識別含有 apikey 或 api_key 查詢參數之 URL', () => {
      const r1 = inspectRequestForCredentials('https://financialmodelingprep.com/api/v3/profile/AAPL?apikey=my_fmp_api_key');
      expect(r1.hasCredentials).toBe(true);
      expect(r1.detectedKeyWords).toContain('apikey');

      const r2 = inspectRequestForCredentials('https://api.example.com/data?api_key=secret456');
      expect(r2.hasCredentials).toBe(true);
      expect(r2.detectedKeyWords).toContain('api_key');
    });

    it('應能識別 HTTP 標頭中的 Authorization 或 Bearer 權杖', () => {
      const headers = { Authorization: 'Bearer eyJhbGciOiJIUzI1Ni...' };
      const result = inspectRequestForCredentials('https://api.example.com/profile', headers);
      expect(result.hasCredentials).toBe(true);
      expect(result.detectedKeyWords).toContain('authorization');
    });

    it('對於純公開、無金鑰之行情查詢，應判定為無憑證', () => {
      const result = inspectRequestForCredentials('https://query1.finance.yahoo.com/v8/finance/chart/2330.TW?interval=1d&range=1mo');
      expect(result.hasCredentials).toBe(false);
      expect(result.detectedKeyWords.length).toBe(0);
    });
  });

  describe('2. 零憑證外發安全邊界 (getSafeProxyUrlChain)', () => {
    const rawUrlWithToken = 'https://api.finmindtrade.com/api/v4/data?token=my_secret_token';
    const rawPublicUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL';

    it('當 URL 含有敏感憑證時，絕對不包含任何公共 CORS 代理節點 (corsproxy, allorigins, codetabs)', () => {
      const chain = getSafeProxyUrlChain(rawUrlWithToken, {
        customProxyUrl: 'https://my-secure-proxy.corp.com/proxy?url=',
      });

      // 檢查候選節點中絕不出現公共代理
      chain.forEach((proxyUrl) => {
        expect(proxyUrl).not.toContain('corsproxy.io');
        expect(proxyUrl).not.toContain('allorigins.win');
        expect(proxyUrl).not.toContain('codetabs.com');
      });

      // 應優先包含直連或自訂受信任代理
      expect(chain.length).toBeGreaterThan(0);
    });

    it('若含有憑證但未提供合法受信任代理且強制使用公共代理時，應拋出 SecurityCredentialRoutingError 終止請求', () => {
      expect(() => {
        getSafeProxyUrlChain(rawUrlWithToken, {
          allowPublicCorsFallback: false,
          requireSafeBoundary: true,
          forcePublicProxy: true,
        });
      }).toThrow(SecurityCredentialRoutingError);
    });

    it('當 URL 為純公開數據時，允許向後相容配置公共 CORS 代理鏈路進行降級重試', () => {
      const chain = getSafeProxyUrlChain(rawPublicUrl, {
        allowPublicCorsFallback: true,
      });

      const hasPublicNode = chain.some(
        (url) => url.includes('corsproxy.io') || url.includes('allorigins.win') || url.includes('codetabs.com')
      );
      expect(hasPublicNode).toBe(true);
    });
  });

  describe('3. 自訂 Proxy 網址校驗與 SSRF 內網防禦 (validateCustomProxyUrl)', () => {
    it('允許合法的公網 HTTPS 代理網址', () => {
      const res = validateCustomProxyUrl('https://my-proxy.vercel.app/api?url=');
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('拒絕不安全的明文 HTTP、FTP 與 JavaScript 偽協定', () => {
      expect(validateCustomProxyUrl('http://my-proxy.com').valid).toBe(false);
      expect(validateCustomProxyUrl('ftp://proxy.internal').valid).toBe(false);
      expect(validateCustomProxyUrl('javascript:alert(1)').valid).toBe(false);
    });

    it('嚴格阻斷本機與私有內網 IPv4 網段 (SSRF 防禦)', () => {
      // 127.0.0.0/8 Loopback
      expect(validateCustomProxyUrl('https://127.0.0.1:8080').valid).toBe(false);
      expect(validateCustomProxyUrl('https://localhost:3000').valid).toBe(false);

      // 10.0.0.0/8 Private
      expect(validateCustomProxyUrl('https://10.0.0.1/proxy').valid).toBe(false);

      // 172.16.0.0/12 Private
      expect(validateCustomProxyUrl('https://172.16.0.1/proxy').valid).toBe(false);
      expect(validateCustomProxyUrl('https://172.31.255.255/proxy').valid).toBe(false);

      // 192.168.0.0/16 Private
      expect(validateCustomProxyUrl('https://192.168.1.1/proxy').valid).toBe(false);

      // 169.254.169.254 AWS/GCP Cloud Metadata Service
      expect(validateCustomProxyUrl('https://169.254.169.254/latest/meta-data/').valid).toBe(false);
    });
  });
});
