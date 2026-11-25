/**
 * ssrf-origin-guard.cjs
 * 統一 SSRF 來源安全守衛核心 (Unified SSRF Origin Guard — Spec 0247 T01)
 *
 * 供 NAS 生產伺服器 (/api/proxy) 與市場同步中介層 (/api/market/probe-key) 共同消費：
 * 1. 強制僅允許 https: 協定
 * 2. 禁止網址內嵌憑證 (userinfo)
 * 3. 嚴格阻斷本機迴圈、RFC1918 私網、鏈路本地、Cloud Metadata 與 IPv6 內部地址
 * 4. 強制精確命中官方金融與測活供應商主機白名單
 * 5. 提供統一 3xx 重導向狀態識別以阻斷 Open Redirect 繞過
 */

const ALLOWED_OUTBOUND_HOSTS = new Set([
  'api.stlouisfed.org',
  'finnhub.io',
  'financialmodelingprep.com',
  'api.finmindtrade.com',
  'www.alphavantage.co',
  'api.polygon.io',
  'api.coingecko.com',
  'data.sec.gov',
  'api.tiingo.com',
]);

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

/**
 * 檢查主機名稱是否屬於本機、私網、保留位址或雲端中繼資料服務
 * @param {string} rawHostname
 * @returns {boolean}
 */
function isPrivateOrReservedHost(rawHostname) {
  if (!rawHostname || typeof rawHostname !== 'string') return true;
  // 剝除 IPv6 方括號與 DNS 尾點（防 localhost. 繞過）
  const host = rawHostname.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.+$/, '');
  if (!host) return true;

  // 本機與內網常見保留尾綴
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '0.0.0.0' ||
    host === '::' ||
    host === '::1'
  ) {
    return true;
  }

  // 一切裸 IPv6 皆阻斷（官方金融白名單均為標準 FQDN）
  if (host.includes(':')) {
    return true;
  }

  // 攔截非標準數字 IPv4 表示法（十進位整數、十六進位 0x7f000001、八進位 0177.0.0.1、短格式 127.1）
  const numericParts = host.split('.');
  const isAllNumericSegments =
    numericParts.length >= 1 &&
    numericParts.length <= 4 &&
    numericParts.every((seg) => /^(?:0x[0-9a-f]+|\d+)$/i.test(seg));
  if (isAllNumericSegments) {
    // 若非標準四段十進位（含前導零八進位、0x 十六進位或少於四段）一律視為可疑位址阻斷
    const isCanonicalIpv4 =
      numericParts.length === 4 && numericParts.every((seg) => /^(?:0|[1-9]\d{0,2})$/.test(seg));
    if (!isCanonicalIpv4) return true;

    const octets = numericParts.map((seg) => Number(seg));
    if (octets.some((n) => n < 0 || n > 255)) return true;
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // Cloud Metadata / Link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT / Tailscale
    if (a >= 224) return true; // Multicast / Reserved
  }

  return false;
}

/**
 * 驗證對外轉發／探測目標網址是否符合 SSRF 安全護欄
 * @param {string} rawUrl
 * @param {{ allowedHosts?: Set<string> }} [options]
 * @returns {{ ok: true, normalizedUrl: URL } | { ok: false, code: string, message: string }}
 */
function validateOutboundTargetUrl(rawUrl, options = {}) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { ok: false, code: 'INVALID_URL', message: '缺少有效的目標網址' };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, code: 'INVALID_URL', message: '目標網址格式無效' };
  }

  if (parsed.protocol !== 'https:') {
    return {
      ok: false,
      code: 'UNSUPPORTED_PROTOCOL',
      message: `僅允許 HTTPS 協定，已阻斷協定: ${parsed.protocol}`,
    };
  }

  if (parsed.username || parsed.password) {
    return {
      ok: false,
      code: 'CREDENTIALS_IN_URL_BLOCKED',
      message: '禁止於目標網址內嵌使用者憑證 (SSRF Guard)',
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.+$/, '');
  if (isPrivateOrReservedHost(hostname)) {
    return {
      ok: false,
      code: 'PRIVATE_HOST_BLOCKED',
      message: `禁止存取本機或私網位址: ${hostname} (SSRF Guard)`,
    };
  }

  // 僅允許預設 HTTPS 埠口 (443)
  if (parsed.port && parsed.port !== '443') {
    return {
      ok: false,
      code: 'PORT_NOT_ALLOWED',
      message: `僅允許標準 HTTPS 443 埠口，已阻斷埠口: ${parsed.port} (SSRF Guard)`,
    };
  }

  const allowedHosts = options.allowedHosts instanceof Set ? options.allowedHosts : ALLOWED_OUTBOUND_HOSTS;
  if (!allowedHosts.has(hostname)) {
    return {
      ok: false,
      code: 'HOST_NOT_ALLOWED',
      message: `目標主機不在允許的金融白名單內: ${hostname} (SSRF Guard)`,
    };
  }

  return { ok: true, normalizedUrl: parsed };
}

/**
 * 判斷 HTTP 狀態碼是否為重導向 (防 Open Redirect SSRF 繞過)
 * @param {number} status
 * @returns {boolean}
 */
function isRedirectResponseStatus(status) {
  return REDIRECT_STATUS_CODES.has(Number(status));
}

module.exports = {
  ALLOWED_OUTBOUND_HOSTS,
  REDIRECT_STATUS_CODES,
  isPrivateOrReservedHost,
  validateOutboundTargetUrl,
  isRedirectResponseStatus,
};
