import { describe, it, expect } from 'vitest';
import { BrokerAccount } from '../types/stock';
import { getEffectiveAccountIdForMarket } from './TradeModal';

describe('TradeModal BrokerAccount Alignment & Dynamic Sync (Ticket 02)', () => {
  const mockAccounts: BrokerAccount[] = [
    {
      id: 'broker-tw-cathay',
      name: '國泰證券 (2.8折)',
      market: 'TW',
      feeRate: 0.001425,
      discountRate: 0.28,
      minFee: 1,
      taxRate: 0.003,
      isDefault: true,
      color: '#10b981',
    },
    {
      id: 'broker-tw-sinopac',
      name: '永豐大戶投 (2折)',
      market: 'TW',
      feeRate: 0.001425,
      discountRate: 0.2,
      minFee: 1,
      taxRate: 0.003,
      isDefault: false,
      color: '#3b82f6',
    },
    {
      id: 'broker-us-schwab',
      name: '嘉信理財 (免手續費)',
      market: 'US',
      feeRate: 0,
      discountRate: 0,
      minFee: 0,
      taxRate: 0,
      usFeeType: 'ZERO_COMMISSION',
      isDefault: true,
      color: '#38bdf8',
    },
    {
      id: 'broker-us-firstrade',
      name: '第一證券 Firstrade',
      market: 'US',
      feeRate: 0,
      discountRate: 0,
      minFee: 0,
      taxRate: 0,
      usFeeType: 'ZERO_COMMISSION',
      isDefault: false,
      color: '#6366f1',
    },
  ];

  it('當傳入有效且符合目標市場的 candidateAccountId 時，應優先採用', () => {
    const result = getEffectiveAccountIdForMarket('TW', 'broker-tw-sinopac', mockAccounts);
    expect(result).toBe('broker-tw-sinopac');

    const resultUS = getEffectiveAccountIdForMarket('US', 'broker-us-firstrade', mockAccounts);
    expect(resultUS).toBe('broker-us-firstrade');
  });

  it('當 candidateAccountId 與目標市場不相符時，應自動切換至該市場的預設帳戶 (isDefault)', () => {
    // 傳入美股嘉信，但切換至台股 ➔ 應取得國泰證券
    const resultTW = getEffectiveAccountIdForMarket('TW', 'broker-us-schwab', mockAccounts);
    expect(resultTW).toBe('broker-tw-cathay');

    // 傳入台股永豐，但切換至美股 ➔ 應取得嘉信理財
    const resultUS = getEffectiveAccountIdForMarket('US', 'broker-tw-sinopac', mockAccounts);
    expect(resultUS).toBe('broker-us-schwab');
  });

  it('若未傳入 candidateAccountId，應回傳該市場之預設帳戶', () => {
    expect(getEffectiveAccountIdForMarket('TW', undefined, mockAccounts)).toBe('broker-tw-cathay');
    expect(getEffectiveAccountIdForMarket('US', undefined, mockAccounts)).toBe('broker-us-schwab');
  });

  it('當無符合市場帳戶時，應安全回退至 system fallback default ID', () => {
    expect(getEffectiveAccountIdForMarket('TW', undefined, [])).toBe('broker-tw-default');
    expect(getEffectiveAccountIdForMarket('US', undefined, [])).toBe('broker-us-default');
  });

  describe('TradeModal Smart Autocomplete & Stock Suggestions (Ticket 03)', () => {
    it('輸入台股代碼 2330 應能解析為台積電，輸入 0050 應解析為元大台灣50', async () => {
      const { resolveOfficialSecurityName } = await import('../engine/stockNameResolver');
      expect(resolveOfficialSecurityName('2330')).toBe('台積電');
      expect(resolveOfficialSecurityName('0050')).toBe('元大台灣50');
    });

    it('輸入美股代碼 AAPL 應解析為蘋果，NVDA 應解析為輝達', async () => {
      const { resolveOfficialSecurityName } = await import('../engine/stockNameResolver');
      expect(resolveOfficialSecurityName('AAPL')).toBe('蘋果');
      expect(resolveOfficialSecurityName('NVDA')).toBe('輝達');
    });

    it('雙向搜尋：輸入中文關鍵字能正確檢索出代碼與繁體中文建議', async () => {
      const { searchStockSuggestions } = await import('../engine/stockNameResolver');
      const results = searchStockSuggestions('台積', 'TW');
      expect(results[0].symbol).toBe('2330');
      expect(results[0].name).toBe('台積電');

      const usResults = searchStockSuggestions('微軟', 'US');
      expect(usResults[0].symbol).toBe('MSFT');
      expect(usResults[0].name).toBe('微軟');
    });
  });
});
