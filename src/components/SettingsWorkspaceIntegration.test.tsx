import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsWorkspace } from './SettingsWorkspace';
import { ApiKeysConfig, BrokerAccount, FrictionSummary } from '../types/stock';

const mockAccounts: BrokerAccount[] = [
  {
    id: 'acc-1',
    name: '國泰證券',
    market: 'TW',
    feeRate: 0.001425,
    discountRate: 0.28,
    minFee: 20,
    taxRate: 0.003,
    color: '#10b981',
  },
];

const mockFriction: FrictionSummary = {
  totalBuyFee: 100,
  totalSellFee: 100,
  totalSellTax: 300,
  totalFeeSavedByDiscount: 250,
  totalRealizedFriction: 500,
  totalEstimatedFutureTax: 0,
  totalEstimatedFutureFee: 0,
  totalEstimatedFutureFriction: 0,
  frictionImpactPercent: 1.5,
  totalTWDividendTax: 0,
  totalUSDividendTax: 0,
  totalUSDividendTaxInTWD: 0,
};

const mockApiKeys: ApiKeysConfig = {
  finmindToken: 'fm_token_123',
  fmpApiKey: 'fmp_key_456',
  customProxyUrl: 'https://proxy.test.com',
};

describe('SettingsWorkspace Integration - 金鑰控制台整併驗證 (Spec 0168 / Ticket 06)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. SettingsWorkspace 應掛載 UnifiedApiKeyManager，並徹底移除舊版重複之單一金鑰區塊與獨立金鑰池標籤', () => {
    const html = renderToStaticMarkup(
      <SettingsWorkspace
        trades={[]}
        accounts={mockAccounts}
        cashTransactions={[]}
        loanRecords={[]}
        frictionSummary={mockFriction}
        apiKeys={mockApiKeys}
        onUpdateAccounts={vi.fn()}
        onUpdateFrictionSummary={vi.fn()}
        onUpdateApiKeys={vi.fn()}
      />
    );

    // 1. 必須掛載全新的統一金鑰管理控制台
    expect(html).toContain('data-testid="unified-api-key-manager"');
    expect(html).toContain('外部金融 API 整合控制台');
    expect(html).toContain('Web Crypto 256-bit 保護中');

    // 2. 徹底移除舊版重複之單一金鑰標題與舊版金鑰池獨立區塊
    expect(html).not.toContain('🔑 外部金融資料 API 金鑰管理 (API Keys Configuration)');
    expect(html).not.toContain('id="api-key-pool-section"');

    // 3. 確保設定頁面其餘區塊（手續費、資料庫、字典、盤後排程）依然健在
    expect(html).toContain('券商帳戶與費率管理');
    expect(html).toContain('交易摩擦成本深度分析');
    expect(html).toContain('全市場每日盤後自動化');
  });
});
