/**
 * 零憑證安全邊界路由閘門與 SSRF 內網防禦 (Zero-Credential Router & SSRF Guard)
 * 嚴格阻斷敏感 API 金鑰外流至第三方公共代理池，並杜絕惡意內網/雲端 Metadata 探測
 */

export class SecurityCredentialRoutingError extends Error {
  constructor(message = '偵測到請求含有敏感憑證，已阻斷外發至公共代理池以防洩漏') {
    super(message);
    this.name = 'SecurityCredentialRoutingError';
  }
}

export interface CredentialInspectionResult {
  hasCredentials: boolean;
  detectedKeyWords: string[];
}

export interface ProxyRouteOptions {
  customProxyUrl?: string;
  allowPublicCorsFallback?: boolean;
  requireSafeBoundary?: boolean;
  forcePublicProxy?: boolean;
}

export interface ProxyValidationResult {
  valid: boolean;
  error?: string;
}

const SENSITIVE_KEYWORDS = [
  'token',
  'apikey',
  'api_key',
  'key',
  'secret',
  'authorization',
  'bearer',
];

const PUBLIC_CORS_PROXY_DOMAINS = [
  'corsproxy.io',
  'allorigins.win',
  'codetabs.com',
  'api.allorigins.win',
];

/**
 * 檢測目標 URL 與標頭中是否包含敏感 API Token 或授權憑證
 */
export function inspectRequestForCredentials(
  rawUrl: string,
  headers?: Record<string, string>
): CredentialInspectionResult {
  const detected = new Set<string>();

  try {
    const parsed = new URL(rawUrl);
    // 1. 檢查 URL 查詢參數名稱
    parsed.searchParams.forEach((_, key) => {
      const lowerKey = key.toLowerCase();
      for (const kw of SENSITIVE_KEYWORDS) {
        if (lowerKey === kw || lowerKey.includes(kw)) {
          detected.add(kw);
        }
      }
    });

    // 2. 檢查 URL 查詢參數值中的特徵 (例如 token=...)
    const fullSearch = parsed.search.toLowerCase();
    for (const kw of SENSITIVE_KEYWORDS) {
      if (fullSearch.includes(`${kw}=`)) {
        detected.add(kw);
      }
    }
  } catch {
    // 若非標準 URL 格式，以字串比對 fallback
    const lower = rawUrl.toLowerCase();
    for (const kw of SENSITIVE_KEYWORDS) {
      if (lower.includes(`${kw}=`) || lower.includes(`/${kw}/`)) {
        detected.add(kw);
      }
    }
  }

  // 3. 檢查 HTTP Headers
  if (headers && typeof headers === 'object') {
    for (const [headerKey, headerVal] of Object.entries(headers)) {
      const lowerHeader = headerKey.toLowerCase();
      if (
        lowerHeader === 'authorization' ||
        lowerHeader.includes('token') ||
        lowerHeader.includes('apikey')
      ) {
        detected.add(lowerHeader);
      }
      if (headerVal && typeof headerVal === 'string') {
        const lowerVal = headerVal.toLowerCase();
        if (lowerVal.startsWith('bearer ') || lowerVal.includes('token ')) {
          detected.add('bearer');
        }
      }
    }
  }

  return {
    hasCredentials: detected.size > 0,
    detectedKeyWords: Array.from(detected),
  };
}

/**
 * 判斷 IP 是否為私有 IPv4 保留段 (RFC 1918) 或 Link-Local/Loopback
 */
function isPrivateOrLoopbackIp(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) return false;

  const [a, b] = parts;

  // 127.0.0.0/8 Loopback
  if (a === 127) return true;
  // 10.0.0.0/8 Private
  if (a === 10) return true;
  // 172.16.0.0/12 Private (172.16 - 172.31)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 Private
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 Link-Local / Cloud Metadata
  if (a === 169 && b === 254) return true;
  // 0.0.0.0
  if (a === 0) return true;

  return false;
}

/**
 * 驗證自訂 Proxy 網址的合法性與安全性 (防 SSRF)
 */
export function validateCustomProxyUrl(
  rawUrl: string,
  allowLocalhost = false
): ProxyValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'Proxy 網址不可為空' };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Proxy 網址格式不正確' };
  }

  // 1. 強制協定檢查 (必須為 https:)
  if (parsed.protocol !== 'https:') {
    if (allowLocalhost && parsed.protocol === 'http:' && parsed.hostname === 'localhost') {
      // 開發環境例外放行
    } else {
      return { valid: false, error: 'Proxy 網址必須採用安全的 HTTPS 協定' };
    }
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. 檢查 localhost 與 loopback
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    if (!allowLocalhost) {
      return { valid: false, error: '基於資安防護，禁止將 Proxy 指向本地端 (localhost)' };
    }
  }

  // 3. 檢查私有 IPv4 或 Cloud Metadata (169.254.169.254)
  if (isPrivateOrLoopbackIp(hostname)) {
    return { valid: false, error: '禁止將 Proxy 指向私有內網或雲端 Metadata 位址 (SSRF 防禦)' };
  }

  return { valid: true };
}

/**
 * 取得安全可靠的代理節點鏈路
 * 若含有敏感金鑰，絕不允許公共代理節點；僅允許直連與合法的自訂 HTTPS 代理
 */
export function getSafeProxyUrlChain(
  targetUrl: string,
  options: ProxyRouteOptions = {}
): string[] {
  const inspection = inspectRequestForCredentials(targetUrl);
  const chain: string[] = [];

  // 1. 處理自訂代理
  if (options.customProxyUrl && options.customProxyUrl.trim()) {
    const custom = options.customProxyUrl.trim();
    const validation = validateCustomProxyUrl(custom);
    if (validation.valid) {
      // 確保自訂代理不是惡意的公共代理網域名稱
      const isPublic = PUBLIC_CORS_PROXY_DOMAINS.some((d) => custom.toLowerCase().includes(d));
      if (!isPublic || !inspection.hasCredentials) {
        const separator = custom.includes('?') ? (custom.endsWith('=') || custom.endsWith('&') ? '' : '&url=') : '?url=';
        chain.push(`${custom}${separator}${encodeURIComponent(targetUrl)}`);
      }
    }
  }

  // 2. 直連 (Direct Fetch) 作為基礎路徑
  chain.push(targetUrl);

  // 3. 敏感憑證硬性防禦
  if (inspection.hasCredentials) {
    if (options.forcePublicProxy) {
      throw new SecurityCredentialRoutingError(
        `請求中包含敏感憑證 [${inspection.detectedKeyWords.join(', ')}]，嚴禁透過公共代理外發！`
      );
    }
    // 有憑證時，絕對不追加任何公共代理節點
    return chain;
  }

  // 4. 純公開數據無憑證時，允許追加公共 CORS 代理池降級
  if (options.allowPublicCorsFallback !== false) {
    chain.push(`https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`);
    chain.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
    chain.push(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`);
  }

  return chain;
}
