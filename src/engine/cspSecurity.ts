/**
 * 系統白名單允許之外部官方與第三方金融 API / 代理節點
 */
export const WHITELISTED_CONNECT_DOMAINS = [
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

/**
 * 產出符合 W3C 標準之 index.html Meta CSP 字串
 */
export function generateCspMetaContent(): string {
  const connectSrcList = [
    "'self'",
    ...WHITELISTED_CONNECT_DOMAINS,
    'ws://localhost:*',
    'ws://127.0.0.1:*',
    'http://localhost:*',
    'http://127.0.0.1:*',
  ].join(' ');

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    `connect-src ${connectSrcList}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/**
 * 產出伺服器端 HTTP Content-Security-Policy 標頭（包含 frame-ancestors 防點擊劫持）
 */
export function generateCspHeaderValue(): string {
  const metaContent = generateCspMetaContent();
  return `${metaContent}; frame-ancestors 'none'`;
}

/**
 * 判定連線 URL 是否屬於合法之 CSP 白名單
 */
export function isAllowedConnectUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  // 相對路徑或自身同源
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return true;
  }

  try {
    const parsed = new URL(url);

    // 本機開發伺服器
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return true;
    }

    const origin = parsed.origin;
    return WHITELISTED_CONNECT_DOMAINS.includes(origin);
  } catch {
    return false;
  }
}
