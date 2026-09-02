import { describe, it, expect } from 'vitest';
import { calculateMarginStress } from './marginStressEngine';
import { HoldingPosition, LoanRecord } from '../types/stock';

describe('質押維持率極端壓力測試與追繳逆運算引擎 (marginStressEngine)', () => {
  const mockPledgedHoldings: HoldingPosition[] = [
    {
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      currency: 'TWD',
      shares: 2000,
      avgCost: 800,
      totalCostBasis: 1600000,
      adjustedCostBasis: 1600000,
      currentPrice: 1000,
      marketValue: 2000000,
      grossMarketValue: 2000000,
      estimatedSellTax: 6000,
      estimatedSellFee: 2850,
      netMarketValue: 1991150,
      unrealizedPnL: 400000,
      unrealizedPnLPercent: 25,
      unrealizedPnLBroker: 391150,
      unrealizedPnLBrokerPercent: 24.45,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
      totalStockDividendsShares: 0,
      totalReturnPnL: 400000,
      totalReturnPercent: 25,
      yieldOnCostPercent: 0,
      lots: [],
    },
  ];

  const mockLoans: LoanRecord[] = [
    {
      id: 'loan-1',
      name: '元大台積電股票質押',
      loanType: 'PLEDGE',
      currency: 'TWD',
      principal: 1000000, // 借款本金 100 萬
      pledgedCollateral: [
        { symbol: '2330', shares: 2000 },
      ],
      createdAt: 1000,
    },
  ];

  it('場景 1: 無借款時安全防禦回傳', () => {
    const res = calculateMarginStress({
      holdings: mockPledgedHoldings,
      loans: [],
      usdToTwdRate: 32,
    });

    expect(res.hasLoans).toBe(false);
    expect(res.totalLoanDebtTWD).toBe(0);
    expect(res.currentMaintenanceRatio).toBe(0);
    expect(res.maxDropTolerancePercent).toBe(1); // 100%
    expect(res.requiredCashFor130TWD).toBe(0);
  });

  it('場景 2: 基準狀態 (擔保品 200 萬 / 借款 100 萬 = 200% 維持率，HEALTHY 水位)', () => {
    const res = calculateMarginStress({
      holdings: mockPledgedHoldings,
      loans: mockLoans,
      usdToTwdRate: 32,
      generalMarketDropPercent: 0, // 0% 跌幅
    });

    expect(res.hasLoans).toBe(true);
    expect(res.totalLoanDebtTWD).toBe(1000000);
    expect(res.currentCollateralValueTWD).toBe(2000000);
    expect(res.currentMaintenanceRatio).toBe(200);
    expect(res.currentStatusInfo.status).toBe('HEALTHY'); // 200% 邊界
    // 最大耐受跌幅 = 1 - (1.30 * 1,000,000 / 2,000,000) = 1 - 0.65 = 0.35 (35%)
    expect(res.maxDropTolerancePercent).toBeCloseTo(0.35, 4);
    expect(res.pointsToMarginCall).toBe(70); // 200% - 130% = 70%
    expect(res.requiredCashFor130TWD).toBe(0);
    expect(res.requiredCashFor160TWD).toBe(0);
  });

  it('場景 3: 壓力測試模擬下跌 20% (擔保品 160 萬，維持率降至 160%)', () => {
    const res = calculateMarginStress({
      holdings: mockPledgedHoldings,
      loans: mockLoans,
      usdToTwdRate: 32,
      generalMarketDropPercent: 0.20, // 下跌 20%
    });

    expect(res.stressedCollateralValueTWD).toBe(1600000);
    expect(res.stressedMaintenanceRatio).toBe(160);
    expect(res.stressedStatusInfo.status).toBe('HEALTHY');
    expect(res.requiredCashFor130TWD).toBe(0);
    expect(res.requiredCashFor160TWD).toBe(0);
  });

  it('場景 4: 壓力測試模擬暴跌 40% (擔保品 120 萬，維持率降至 120%，跌破 130% 斷頭追繳線)', () => {
    const res = calculateMarginStress({
      holdings: mockPledgedHoldings,
      loans: mockLoans,
      usdToTwdRate: 32,
      generalMarketDropPercent: 0.40, // 下跌 40%
    });

    expect(res.stressedCollateralValueTWD).toBe(1200000);
    expect(res.stressedMaintenanceRatio).toBe(120);
    expect(res.stressedStatusInfo.status).toBe('MARGIN_CALL');
    
    // 補繳現金逆運算：
    // 恢復至 130% 需要：1,000,000 * 1.30 - 1,200,000 = 100,000 元
    expect(res.requiredCashFor130TWD).toBe(100000);
    expect(res.requiredStockValueFor130TWD).toBe(100000);

    // 恢復至 160% 安全水位需要：1,000,000 * 1.60 - 1,200,000 = 400,000 元
    expect(res.requiredCashFor160TWD).toBe(400000);
    expect(res.requiredStockValueFor160TWD).toBe(400000);
  });

  it('場景 5: 個股獨立自訂壓力測試 (Custom individual price drops)', () => {
    const customHoldings: HoldingPosition[] = [
      {
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        shares: 1000,
        avgCost: 800,
        totalCostBasis: 800000,
        adjustedCostBasis: 800000,
        currentPrice: 1000,
        marketValue: 1000000,
        grossMarketValue: 1000000,
        estimatedSellTax: 3000,
        estimatedSellFee: 1425,
        netMarketValue: 995575,
        unrealizedPnL: 200000,
        unrealizedPnLPercent: 25,
        unrealizedPnLBroker: 195575,
        unrealizedPnLBrokerPercent: 24.45,
        realizedPnL: 0,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
        totalReturnPnL: 200000,
        totalReturnPercent: 25,
        yieldOnCostPercent: 0,
        lots: [],
      },
      {
        symbol: '0050',
        name: '元大台灣50',
        market: 'TW',
        currency: 'TWD',
        shares: 5000,
        avgCost: 160,
        totalCostBasis: 800000,
        adjustedCostBasis: 800000,
        currentPrice: 200,
        marketValue: 1000000,
        grossMarketValue: 1000000,
        estimatedSellTax: 1000,
        estimatedSellFee: 1425,
        netMarketValue: 997575,
        unrealizedPnL: 200000,
        unrealizedPnLPercent: 25,
        unrealizedPnLBroker: 197575,
        unrealizedPnLBrokerPercent: 24.7,
        realizedPnL: 0,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
        totalReturnPnL: 200000,
        totalReturnPercent: 25,
        yieldOnCostPercent: 0,
        lots: [],
      },
    ];

    const multiLoans: LoanRecord[] = [
      {
        id: 'loan-1',
        name: '台積電與0050質押',
        loanType: 'PLEDGE',
        currency: 'TWD',
        principal: 1000000,
        pledgedCollateral: [
          { symbol: '2330', shares: 1000 },
          { symbol: '0050', shares: 5000 },
        ],
        createdAt: 1000,
      },
    ];

    // 設定台積電單獨下跌 30%，0050 下跌 10%
    const res = calculateMarginStress({
      holdings: customHoldings,
      loans: multiLoans,
      usdToTwdRate: 32,
      generalMarketDropPercent: 0,
      customDropPercents: {
        '2330': 0.30,
        '0050': 0.10,
      },
    });

    // 總擔保品市值 = 1,600,000
    // 維持率 = 1,600,000 / 1,000,000 = 160%
    expect(res.stressedCollateralValueTWD).toBe(1600000);
    expect(res.stressedMaintenanceRatio).toBe(160);
  });

  describe('Ticket #010: 質押擔保品股票庫存動態連動（賣出時即時預警與維持率扣減）', () => {
    it('當在席持股已被賣出小於質押設定股數時，應自動以實際在庫股數計算擔保品市值，杜絕虛擬幽靈擔保品', () => {
      // 質押合約登記 2,000 股台積電
      const pledgedLoans: LoanRecord[] = [
        {
          id: 'loan-sold',
          name: '台積電質押',
          loanType: 'PLEDGE',
          currency: 'TWD',
          principal: 1000000, // 借 100 萬
          pledgedCollateral: [
            { symbol: '2330', shares: 2000 },
          ],
          createdAt: 1000,
        },
      ];

      // 但實際在庫持股已經全數賣出 (0 股) 或只剩 500 股
      const actualHoldings: HoldingPosition[] = [
        {
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          shares: 500, // 實際只剩 500 股
          avgCost: 800,
          totalCostBasis: 400000,
          adjustedCostBasis: 400000,
          currentPrice: 1000,
          marketValue: 500000,
          grossMarketValue: 500000,
          estimatedSellTax: 1500,
          estimatedSellFee: 712,
          netMarketValue: 497788,
          unrealizedPnL: 100000,
          unrealizedPnLPercent: 25,
          unrealizedPnLBroker: 97788,
          unrealizedPnLBrokerPercent: 24.45,
          realizedPnL: 0,
          totalDividends: 0,
          totalCapitalReturned: 0,
          totalStockDividendsShares: 0,
          totalReturnPnL: 100000,
          totalReturnPercent: 25,
          yieldOnCostPercent: 0,
          lots: [],
        },
      ];

      const res = calculateMarginStress({
        holdings: actualHoldings,
        loans: pledgedLoans,
        usdToTwdRate: 32,
        generalMarketDropPercent: 0,
      });

      // 實際擔保品市值應為 500 股 * 1000 = 500,000 元（而非 2000 股 * 1000 = 2,000,000）
      expect(res.currentCollateralValueTWD).toBe(500000);
      // 維持率 = 500,000 / 1,000,000 = 50% (跌破 130% 斷頭追繳門檻)
      expect(res.currentMaintenanceRatio).toBe(50);
      expect(res.currentStatusInfo.status).toBe('MARGIN_CALL');
    });
  });
});

