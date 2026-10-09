import { describe, it, expect } from 'vitest';
import {
  generateCspMetaContent,
  generateCspHeaderValue,
  isAllowedConnectUrl,
  WHITELISTED_CONNECT_DOMAINS,
} from './cspSecurity';

describe('CSP Security Engine (Seam: 內容安全策略與連線白名單)', () => {
  describe('Ticket 04: CSP 字串生成與規格檢驗', () => {
    it('產出的 CSP Meta 字串應包含必要的指令限制 (default-src, script-src, style-src, connect-src)', () => {
      const metaCsp = generateCspMetaContent();
      expect(metaCsp).toContain("default-src 'self'");
      expect(metaCsp).toContain("script-src 'self'");
      expect(metaCsp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
      expect(metaCsp).toContain("font-src 'self' https://fonts.gstatic.com data:");
      expect(metaCsp).toContain("img-src 'self' data: https: blob:");
      expect(metaCsp).toContain("worker-src 'self' blob:");
      expect(metaCsp).toContain("manifest-src 'self'");
      expect(metaCsp).toContain("base-uri 'self'");
      expect(metaCsp).toContain("form-action 'self'");
    });

    it('產出的 CSP Header 字串應包含 frame-ancestors none 防點擊劫持', () => {
      const headerCsp = generateCspHeaderValue();
      expect(headerCsp).toContain("frame-ancestors 'none'");
    });

    it('所有官方與第三方金融 API 網址應完整包含在白名單中', () => {
      const expectedDomains = [
        'https://query1.finance.yahoo.com',
        'https://openapi.twse.com.tw',
        'https://www.twse.com.tw',
        'https://www.tpex.org.tw',
        'https://api.finmindtrade.com',
        'https://financialmodelingprep.com',
        'https://www.alphavantage.co',
        'https://corsproxy.io',
        'https://api.allorigins.win',
        'https://api.codetabs.com',
        'https://finnhub.io',
        'https://api.stlouisfed.org',
        'https://api.polygon.io',
        'https://api.coingecko.com',
        'https://data.sec.gov',
      ];

      for (const domain of expectedDomains) {
        expect(WHITELISTED_CONNECT_DOMAINS).toContain(domain);
      }
    });

    it('isAllowedConnectUrl 應正確識別白名單 API、本機自連與惡意資料外洩連線', () => {
      // 合法官方與第三方 API
      expect(isAllowedConnectUrl('https://query1.finance.yahoo.com/v8/finance/chart/2330.TW')).toBe(true);
      expect(isAllowedConnectUrl('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL')).toBe(true);
      expect(isAllowedConnectUrl('https://corsproxy.io/?url=...')).toBe(true);
      expect(isAllowedConnectUrl('http://localhost:3000/api/yahoo/test')).toBe(true);
      expect(isAllowedConnectUrl('/api/twse/test')).toBe(true);

      // 非法攻擊外發連線
      expect(isAllowedConnectUrl('https://malicious-exfiltrator.com/steal')).toBe(false);
      expect(isAllowedConnectUrl('http://attacker.org:8080/log')).toBe(false);
      expect(isAllowedConnectUrl('javascript:alert(1)')).toBe(false);
    });
  });
});
