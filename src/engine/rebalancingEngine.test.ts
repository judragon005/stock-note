import { describe, it, expect } from 'vitest';
import {
  calculateAllocationDrift,
  generateCashInRebalancePlan,
  generateFullRebalancePlan,
  convertAmountToOrderUnits,
  estimateTransactionFriction,
  classifyZavyAssetClass,
  validateEtfNavPremium,
  calculateAssetClassRebalancePlan,
} from './rebalancingEngine';
import { TargetAllocationConfig } from '../types/allocation';
import { HoldingPosition } from '../types/stock';

describe('Rebalancing Engine (再平衡運算引擎)', () => {
  const sampleHoldings: HoldingPosition[] = [
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
    },
    {
      symbol: '0050',
      name: '元大台灣50',
      market: 'TW',
      currency: 'TWD',
      shares: 2000,
      avgCost: 150,
      totalCostBasis: 300000,
      adjustedCostBasis: 300000,
      currentPrice: 180,
      marketValue: 360000,
      grossMarketValue: 360000,
      estimatedSellTax: 360,
      estimatedSellFee: 513,
      netMarketValue: 359127,
      unrealizedPnL: 60000,
      unrealizedPnLPercent: 20,
      unrealizedPnLBroker: 59127,
      unrealizedPnLBrokerPercent: 19.7,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
      totalStockDividendsShares: 0,
      totalReturnPnL: 60000,
      totalReturnPercent: 20,
      yieldOnCostPercent: 0,
    },
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      market: 'US',
      currency: 'USD',
      shares: 50,
      avgCost: 200,
      totalCostBasis: 10000,
      adjustedCostBasis: 10000,
      currentPrice: 220,
      marketValue: 11000, // 11,000 USD * 32 = 352,000 TWD
      grossMarketValue: 11000,
      estimatedSellTax: 0,
      estimatedSellFee: 0,
      netMarketValue: 11000,
      unrealizedPnL: 1000,
      unrealizedPnLPercent: 10,
      unrealizedPnLBroker: 1000,
      unrealizedPnLBrokerPercent: 10,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
      totalStockDividendsShares: 0,
      totalReturnPnL: 1000,
      totalReturnPercent: 10,
      yieldOnCostPercent: 0,
    },
  ];

  const usdToTwdRate = 32;
  const cashBalanceTwd = 288000; // 總淨值 = 1,000,000 + 360,000 + 352,000 + 288,000 = 2,000,000 TWD

  describe('1. 偏離度分析 (calculateAllocationDrift)', () => {
    it('市場層級 (TW / US / CASH) 應精準計算實際佔比與偏離度', () => {
      // 總市值 = 2,000,000 TWD
      // TW: 1,360,000 (68%)
      // US: 352,000 (17.6%)
      // CASH: 288,000 (14.4%)
      const config: TargetAllocationConfig = {
        id: 'test-market',
        type: 'MARKET',
        name: '測試市場配置',
        items: [
          { key: 'TW', name: '台股部位', targetPercent: 50 },
          { key: 'US', name: '美股部位', targetPercent: 30 },
          { key: 'CASH', name: '現金儲備', targetPercent: 20 },
        ],
        toleranceBandPercent: 5.0,
        updatedAt: Date.now(),
      };

      const driftItems = calculateAllocationDrift(config, sampleHoldings, cashBalanceTwd, usdToTwdRate);

      expect(driftItems.length).toBe(3);

      const twItem = driftItems.find((i) => i.key === 'TW')!;
      expect(twItem.currentPercent).toBeCloseTo(68.0, 1);
      expect(twItem.targetPercent).toBe(50);
      expect(twItem.driftPercent).toBeCloseTo(18.0, 1); // +18% 超配
      expect(twItem.status).toBe('SEVERE_DRIFT'); // > 2 * 5%

      const usItem = driftItems.find((i) => i.key === 'US')!;
      expect(usItem.currentPercent).toBeCloseTo(17.6, 1);
      expect(usItem.targetPercent).toBe(30);
      expect(usItem.driftPercent).toBeCloseTo(-12.4, 1); // -12.4% 低配
      expect(usItem.status).toBe('SEVERE_DRIFT');

      const cashItem = driftItems.find((i) => i.key === 'CASH')!;
      expect(cashItem.currentPercent).toBeCloseTo(14.4, 1);
      expect(cashItem.targetPercent).toBe(20);
      expect(cashItem.driftPercent).toBeCloseTo(-5.6, 1);
      expect(cashItem.status).toBe('MILD_DRIFT'); // 5% < 5.6% <= 10%
    });

    it('個股層級 (Symbol-level) 應精確計算個別標的佔比與狀態', () => {
      // 總市值 = 2,000,000 TWD
      // 2330: 1,000,000 (50%)
      // 0050: 360,000 (18%)
      // AAPL: 352,000 (17.6%)
      const config: TargetAllocationConfig = {
        id: 'test-symbols',
        type: 'SYMBOL',
        name: '測試個股配置',
        items: [
          { key: '2330', name: '台積電', targetPercent: 48 }, // 偏離 +2% -> BALANCED
          { key: '0050', name: '元大台灣50', targetPercent: 25 }, // 偏離 -7% -> MILD_DRIFT
          { key: 'AAPL', name: '蘋果', targetPercent: 27 }, // 偏離 -9.4% -> MILD_DRIFT
        ],
        toleranceBandPercent: 5.0,
        updatedAt: Date.now(),
      };

      const driftItems = calculateAllocationDrift(config, sampleHoldings, cashBalanceTwd, usdToTwdRate);

      const tsmc = driftItems.find((i) => i.key === '2330')!;
      expect(tsmc.driftPercent).toBeCloseTo(2.0, 1);
      expect(tsmc.status).toBe('BALANCED');

      const t0050 = driftItems.find((i) => i.key === '0050')!;
      expect(t0050.driftPercent).toBeCloseTo(-7.0, 1);
      expect(t0050.status).toBe('MILD_DRIFT');
    });
  });

  describe('2. 定期注水加碼再平衡 (generateCashInRebalancePlan)', () => {
    it('注水資金優先分配給低配標的，絕不產生賣出動作', () => {
      const config: TargetAllocationConfig = {
        id: 'test-cashin',
        type: 'SYMBOL',
        name: '個股注水加碼',
        items: [
          { key: '2330', name: '台積電', targetPercent: 40 }, // 現值 100萬 (58.4%)
          { key: '0050', name: '元大台灣50', targetPercent: 30 }, // 現值 36萬 (21.0%)
          { key: 'AAPL', name: '蘋果', targetPercent: 30 }, // 現值 35.2萬 (20.6%)
        ],
        toleranceBandPercent: 5.0,
        updatedAt: Date.now(),
      };

      // 總股票市值 = 1,712,000 TWD，注水加碼 288,000 TWD ➔ 新總值 = 2,000,000 TWD
      // 目標值：2330 = 80萬, 0050 = 60萬, AAPL = 60萬
      // 缺口：0050 缺 240,000 TWD, AAPL 缺 248,000 TWD，合計缺口 488,000 TWD
      // 可注水 288,000 TWD < 488,000 TWD ➔ 依缺口比例分配給 0050 與 AAPL，2330 為 0
      const plan = generateCashInRebalancePlan(config, sampleHoldings, 288000, cashBalanceTwd, usdToTwdRate);

      expect(plan.mode).toBe('CASH_IN');
      expect(plan.cashInflowTwd).toBe(288000);
      expect(plan.summary.totalSellAmountTwd).toBe(0); // 絕不賣出

      const tsmc = plan.recommendations.find((r) => r.key === '2330')!;
      expect(tsmc.action).toBe('HOLD');
      expect(tsmc.recommendedAmountTwd).toBe(0);

      const t0050 = plan.recommendations.find((r) => r.key === '0050')!;
      expect(t0050.action).toBe('BUY');
      expect(t0050.recommendedAmountTwd).toBeGreaterThan(0);

      const aapl = plan.recommendations.find((r) => r.key === 'AAPL')!;
      expect(aapl.action).toBe('BUY');
      expect(aapl.recommendedAmountTwd).toBeGreaterThan(0);

      // 總買入金額應等於注水金額
      expect(plan.summary.totalBuyAmountTwd).toBeCloseTo(288000, -1);
    });
  });

  describe('3. 全量買賣再平衡 (generateFullRebalancePlan)', () => {
    it('超配標的賣出、低配標的加碼，且買賣總金額平衡', () => {
      const config: TargetAllocationConfig = {
        id: 'test-full',
        type: 'SYMBOL',
        name: '全量再平衡',
        items: [
          { key: '2330', name: '台積電', targetPercent: 40 }, // 目標 40% (80萬) ➔ 賣出 20萬
          { key: '0050', name: '元大台灣50', targetPercent: 30 }, // 目標 30% (60萬) ➔ 買進 24萬
          { key: 'AAPL', name: '蘋果', targetPercent: 30 }, // 目標 30% (60萬) ➔ 買進 24.8萬 (扣除現金差額)
        ],
        toleranceBandPercent: 5.0,
        updatedAt: Date.now(),
      };

      const plan = generateFullRebalancePlan(config, sampleHoldings, cashBalanceTwd, usdToTwdRate);

      expect(plan.mode).toBe('FULL_REBALANCE');

      const tsmc = plan.recommendations.find((r) => r.key === '2330')!;
      expect(tsmc.action).toBe('SELL');
      expect(tsmc.recommendedAmountTwd).toBeCloseTo(200000, -2);

      const t0050 = plan.recommendations.find((r) => r.key === '0050')!;
      expect(t0050.action).toBe('BUY');
      expect(t0050.recommendedAmountTwd).toBeCloseTo(240000, -2);

      const aapl = plan.recommendations.find((r) => r.key === 'AAPL')!;
      expect(aapl.action).toBe('BUY');
      expect(aapl.recommendedAmountTwd).toBeCloseTo(248000, -2);
      expect(aapl.recommendedAmountOriginal).toBeCloseTo(248000 / 32, 1);
    });
  });

  describe('4. 下單顆粒度與摩擦成本試算 (convertAmountToOrderUnits & friction)', () => {
    it('台股應正確拆解整張與零股', () => {
      // 建議買進 250,000 元，單價 100 元 ➔ 2,500 股 ➔ 2 張 + 500 股
      const units = convertAmountToOrderUnits('TW', 100, 250000, 'TWD', 32);
      expect(units.shares).toBe(2500);
      expect(units.lotsSummary).toBe('2 張 + 500 股');
    });

    it('美股應支援小數點碎股精算', () => {
      // 建議買進 1,000 USD，單價 300 USD ➔ 3.333 股
      const units = convertAmountToOrderUnits('US', 300, 32000, 'USD', 32);
      expect(units.shares).toBe(3.333);
      expect(units.lotsSummary).toBe('3.333 股');
    });

    it('摩擦成本估算應考量台股 0.1425% 買費與 0.3% 賣稅', () => {
      const frictionBuy = estimateTransactionFriction('TW', 'BUY', 100000);
      expect(frictionBuy).toBe(Math.round(100000 * 0.001425));

      const frictionSell = estimateTransactionFriction('TW', 'SELL', 100000);
      expect(frictionSell).toBe(Math.round(100000 * (0.001425 + 0.003)));
    });
  });

  describe('5. Zavy 慢富大類資產分類器 (classifyZavyAssetClass)', () => {
    it('應精準識別長天期政府公債 (BOND_GOV_LONG) 為真避險防彈衣', () => {
      const twLongBonds = ['00679B', '00687B', '00795B', '00764B'];
      twLongBonds.forEach((sym) => {
        const res = classifyZavyAssetClass(sym);
        expect(res.category).toBe('BOND_GOV');
        expect(res.subCategory).toBe('BOND_GOV_LONG');
        expect(res.isTrueDefensive).toBe(true);
        expect(res.isExcluded).toBe(false);
      });

      const usLongBond = classifyZavyAssetClass({ symbol: 'TLT', name: 'iShares 20+ Year Treasury' });
      expect(usLongBond.category).toBe('BOND_GOV');
      expect(usLongBond.subCategory).toBe('BOND_GOV_LONG');
      expect(usLongBond.isTrueDefensive).toBe(true);
    });

    it('應精準識別中天期與短天期/國庫券公債 (BOND_GOV_MID / BOND_GOV_SHORT)', () => {
      const midBond = classifyZavyAssetClass('00697B');
      expect(midBond.category).toBe('BOND_GOV');
      expect(midBond.subCategory).toBe('BOND_GOV_MID');
      expect(midBond.isTrueDefensive).toBe(true);

      const usMidBond = classifyZavyAssetClass('IEF');
      expect(usMidBond.category).toBe('BOND_GOV');
      expect(usMidBond.subCategory).toBe('BOND_GOV_MID');

      const shortBondTW = classifyZavyAssetClass('00719B');
      expect(shortBondTW.category).toBe('BOND_GOV');
      expect(shortBondTW.subCategory).toBe('BOND_GOV_SHORT');

      const usShortBonds = ['SHY', 'SGOV', 'BIL'];
      usShortBonds.forEach((sym) => {
        const res = classifyZavyAssetClass(sym);
        expect(res.category).toBe('BOND_GOV');
        expect(res.subCategory).toBe('BOND_GOV_SHORT');
        expect(res.isTrueDefensive).toBe(true);
      });

      const broadGovBond = classifyZavyAssetClass('BNDW');
      expect(broadGovBond.category).toBe('BOND_GOV');
      expect(broadGovBond.isTrueDefensive).toBe(true);
    });

    it('應識別投資級公司債 (BOND_CORP_IG) 為防禦性風險資產 (非純防彈衣)', () => {
      const igBonds = ['00720B', '00725B', '00751B', '00772B', '00937B', 'LQD', 'VCIT'];
      igBonds.forEach((sym) => {
        const res = classifyZavyAssetClass(sym);
        expect(res.category).toBe('BOND_CORP_IG');
        expect(res.subCategory).toBe('BOND_CORP_IG');
        expect(res.isTrueDefensive).toBe(false); // 包含信用利差風險，非真避險防彈衣
        expect(res.isExcluded).toBe(false);
      });
    });

    it('應精準識別黃金 (GOLD) 為真避險防彈衣', () => {
      const golds = ['00635U', 'GLD', 'IAU'];
      golds.forEach((sym) => {
        const res = classifyZavyAssetClass(sym);
        expect(res.category).toBe('GOLD');
        expect(res.subCategory).toBe('GOLD');
        expect(res.isTrueDefensive).toBe(true);
      });
    });

    it('應分流權益型 REITs 與剔除抵押權型 mREITs (00712 / NLY)', () => {
      const equityReits = classifyZavyAssetClass('VNQ');
      expect(equityReits.category).toBe('REITS');
      expect(equityReits.subCategory).toBe('REITS_EQUITY');
      expect(equityReits.isExcluded).toBe(false);

      const mortgageReitTW = classifyZavyAssetClass({ symbol: '00712', name: '復華富時不動產' });
      expect(mortgageReitTW.category).toBe('REITS');
      expect(mortgageReitTW.subCategory).toBe('EXCLUDED');
      expect(mortgageReitTW.isExcluded).toBe(true);
      expect(mortgageReitTW.exclusionReason).toBe('MORTGAGE_REIT');
      expect(mortgageReitTW.warningMessage).toBeDefined();

      const mortgageReitUS = classifyZavyAssetClass('NLY');
      expect(mortgageReitUS.isExcluded).toBe(true);
      expect(mortgageReitUS.exclusionReason).toBe('MORTGAGE_REIT');
    });

    it('應將槓桿與反向型 ETF (00631L, 00632R, 00680L, TQQQ 等) 標記為 EXCLUDED 剔除池', () => {
      const leveraged = ['00631L', '00632R', '00680L', 'TQQQ', 'SQQQ', 'SOXL', 'TMF'];
      leveraged.forEach((sym) => {
        const res = classifyZavyAssetClass(sym);
        expect(res.isExcluded).toBe(true);
        expect(res.subCategory).toBe('EXCLUDED');
        expect(res.exclusionReason).toBe('LEVERAGED_INVERSE');
        expect(res.warningMessage).toContain('時間價值耗損');
      });
    });

    it('應正確識別股票型 (EQUITY)：市值型核心、高股息與波段衛星', () => {
      // 市值核心
      const coreStocks = ['0050', '006208', 'VTI', 'VOO', 'QQQ', 'VT'];
      coreStocks.forEach((sym) => {
        const res = classifyZavyAssetClass(sym);
        expect(res.category).toBe('EQUITY');
        expect(res.subCategory).toBe('EQUITY_CORE');
        expect(res.isExcluded).toBe(false);
      });

      // 高股息
      const dividendStocks = ['00878', '00919', '00929', '0056', 'VYM', 'SCHD'];
      dividendStocks.forEach((sym) => {
        const res = classifyZavyAssetClass(sym);
        expect(res.category).toBe('EQUITY');
        expect(res.subCategory).toBe('EQUITY_DIVIDEND');
      });

      // 個股 / 衛星
      const satellite = classifyZavyAssetClass({ symbol: '2330', name: '台積電' });
      expect(satellite.category).toBe('EQUITY');
      expect(satellite.subCategory).toBe('EQUITY_SATELLITE');
    });

    it('應支援現金 (CASH) 識別', () => {
      const cashRes = classifyZavyAssetClass('CASH');
      expect(cashRes.category).toBe('CASH');
      expect(cashRes.isTrueDefensive).toBe(true);
    });

    it('邊界條件測試：大小寫容錯、空格容錯與未知代碼安全回退', () => {
      const lowerTlt = classifyZavyAssetClass('  tlt  ');
      expect(lowerTlt.category).toBe('BOND_GOV');
      expect(lowerTlt.subCategory).toBe('BOND_GOV_LONG');

      const lowerBondTW = classifyZavyAssetClass(' 00679b ');
      expect(lowerBondTW.category).toBe('BOND_GOV');

      // 未知個股代碼預設為 EQUITY / EQUITY_SATELLITE
      const unknownStock = classifyZavyAssetClass('UNKNOWN999');
      expect(unknownStock.category).toBe('EQUITY');
      expect(unknownStock.subCategory).toBe('EQUITY_SATELLITE');
      expect(unknownStock.isExcluded).toBe(false);
    });
  });

  describe('6. ETF 折溢價守門員 (validateEtfNavPremium)', () => {
    it('折溢價正常 (<= 0.5% 或折價) 時回傳 NORMAL 且不攔截', () => {
      const resNormal = validateEtfNavPremium('00679B', 0.2);
      expect(resNormal.status).toBe('NORMAL');
      expect(resNormal.isBlocked).toBe(false);

      const resDiscount = validateEtfNavPremium('0050', -0.5);
      expect(resDiscount.status).toBe('NORMAL');
      expect(resDiscount.isBlocked).toBe(false);
    });

    it('輕度溢價 (0.5% ~ 1.0%) 時回傳 ELEVATED_PREMIUM_WARNING 且不攔截', () => {
      const resMild = validateEtfNavPremium('00679B', 0.8);
      expect(resMild.status).toBe('ELEVATED_PREMIUM_WARNING');
      expect(resMild.isBlocked).toBe(false);
      expect(resMild.warningMessage).toBeDefined();
    });

    it('高溢價 (> 1.0%) 時回傳 HIGH_PREMIUM_RISK 並攔截買進，且提供同類型平價替代標的', () => {
      // 00679B 溢價高時建議 00687B 或 00795B
      const resBond = validateEtfNavPremium('00679B', 1.5);
      expect(resBond.status).toBe('HIGH_PREMIUM_RISK');
      expect(resBond.isBlocked).toBe(true);
      expect(resBond.suggestedAlternatives).toBeDefined();
      expect(resBond.suggestedAlternatives).toEqual(
        expect.arrayContaining(['00687B', '00795B'])
      );

      // 0050 溢價時建議 006208
      const res0050 = validateEtfNavPremium('0050', 1.2);
      expect(res0050.status).toBe('HIGH_PREMIUM_RISK');
      expect(res0050.isBlocked).toBe(true);
      expect(res0050.suggestedAlternatives).toContain('006208');

      // 00878 溢價時建議 0056 / 00713 / 00919
      const res00878 = validateEtfNavPremium('00878', 1.8);
      expect(res00878.status).toBe('HIGH_PREMIUM_RISK');
      expect(res00878.suggestedAlternatives).toBeDefined();
      expect(res00878.suggestedAlternatives!.length).toBeGreaterThan(0);
    });

    it('支援自訂閾值 (如 0.6% 臨界值)', () => {
      const resCustom = validateEtfNavPremium('00679B', 0.8, 0.6);
      expect(resCustom.status).toBe('HIGH_PREMIUM_RISK');
      expect(resCustom.isBlocked).toBe(true);
    });
  });

  describe('7. Zavy 慢富大類資產再平衡與股息活水轉向 (calculateAssetClassRebalancePlan)', () => {
    const portfolioHoldings: HoldingPosition[] = [
      {
        symbol: '0050',
        name: '元大台灣50',
        market: 'TW',
        currency: 'TWD',
        shares: 10000,
        avgCost: 150,
        totalCostBasis: 1500000,
        adjustedCostBasis: 1500000,
        currentPrice: 200,
        marketValue: 2000000,
        grossMarketValue: 2000000,
        estimatedSellTax: 2000,
        estimatedSellFee: 2850,
        netMarketValue: 1995150,
        unrealizedPnL: 500000,
        unrealizedPnLPercent: 33.3,
        unrealizedPnLBroker: 495150,
        unrealizedPnLBrokerPercent: 33.0,
        realizedPnL: 0,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
        totalReturnPnL: 500000,
        totalReturnPercent: 33.3,
        yieldOnCostPercent: 0,
      },
      {
        symbol: '00878',
        name: '國泰永續高股息',
        market: 'TW',
        currency: 'TWD',
        shares: 50000,
        avgCost: 20,
        totalCostBasis: 1000000,
        adjustedCostBasis: 1000000,
        currentPrice: 22,
        marketValue: 1100000,
        grossMarketValue: 1100000,
        estimatedSellTax: 1100,
        estimatedSellFee: 1568,
        netMarketValue: 1097332,
        unrealizedPnL: 100000,
        unrealizedPnLPercent: 10.0,
        unrealizedPnLBroker: 97332,
        unrealizedPnLBrokerPercent: 9.73,
        realizedPnL: 0,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
        totalReturnPnL: 100000,
        totalReturnPercent: 10.0,
        yieldOnCostPercent: 0,
      },
      {
        symbol: '2330',
        name: '台積電 (波段衛星)',
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
        unrealizedPnLPercent: 25.0,
        unrealizedPnLBroker: 195575,
        unrealizedPnLBrokerPercent: 24.45,
        realizedPnL: 0,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
        totalReturnPnL: 200000,
        totalReturnPercent: 25.0,
        yieldOnCostPercent: 0,
      },
      {
        symbol: '00687B',
        name: '國泰20年美債',
        market: 'TW',
        currency: 'TWD',
        shares: 15000,
        avgCost: 32,
        totalCostBasis: 480000,
        adjustedCostBasis: 480000,
        currentPrice: 30,
        marketValue: 450000,
        grossMarketValue: 450000,
        estimatedSellTax: 0,
        estimatedSellFee: 641,
        netMarketValue: 449359,
        unrealizedPnL: -30000,
        unrealizedPnLPercent: -6.25,
        unrealizedPnLBroker: -30641,
        unrealizedPnLBrokerPercent: -6.38,
        realizedPnL: 0,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
        totalReturnPnL: -30000,
        totalReturnPercent: -6.25,
        yieldOnCostPercent: 0,
      },
      {
        symbol: '00635U',
        name: '期元大S&P黃金',
        market: 'TW',
        currency: 'TWD',
        shares: 10000,
        avgCost: 24,
        totalCostBasis: 240000,
        adjustedCostBasis: 240000,
        currentPrice: 25,
        marketValue: 250000,
        grossMarketValue: 250000,
        estimatedSellTax: 250,
        estimatedSellFee: 356,
        netMarketValue: 249394,
        unrealizedPnL: 10000,
        unrealizedPnLPercent: 4.17,
        unrealizedPnLBroker: 9394,
        unrealizedPnLBrokerPercent: 3.91,
        realizedPnL: 0,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
        totalReturnPnL: 10000,
        totalReturnPercent: 4.17,
        yieldOnCostPercent: 0,
      },
    ];

    // 總股票: 410萬 (0050 200萬 + 00878 110萬 + 2330 100萬)
    // 總公債: 45萬 (00687B)
    // 總黃金: 25萬 (00635U)
    // 現金: 20萬
    // 總淨值: 500萬
    // 當前比重: 股 82% / 債 9% / 金 5% / 現金 4%
    // 目標配置: 股 60% / 債 20% / 金 10% / 現金 10%
    const targetConfig: TargetAllocationConfig = {
      id: 'zavy-slow-wealth-6211',
      type: 'ASSET_CLASS',
      name: '慢富資產配置 (6:2:1:1)',
      items: [
        { key: 'EQUITY', name: '股票資產', targetPercent: 60 },
        { key: 'BOND_GOV', name: '純政府公債防彈衣', targetPercent: 20 },
        { key: 'GOLD', name: '黃金儲備', targetPercent: 10 },
        { key: 'CASH', name: '現金防護網', targetPercent: 10 },
      ],
      toleranceBandPercent: 5.0,
      updatedAt: Date.now(),
    };

    it('應正確精算大類資產偏離度與健康度', () => {
      const plan = calculateAssetClassRebalancePlan({
        config: targetConfig,
        holdings: portfolioHoldings,
        cashBalanceTwd: 200000,
        strategyMode: 'NORMAL',
      });

      expect(plan.mode).toBe('FULL_REBALANCE');
      expect(plan.totalPortfolioValueTwd).toBe(5000000);

      const equityRec = plan.assetClassRecommendations.find((r) => r.key === 'EQUITY')!;
      expect(equityRec.currentPercent).toBe(82);
      expect(equityRec.targetPercent).toBe(60);
      expect(equityRec.driftPercent).toBe(22);
      expect(equityRec.status).toBe('SEVERE_DRIFT');
      expect(equityRec.action).toBe('SELL');

      const bondRec = plan.assetClassRecommendations.find((r) => r.key === 'BOND_GOV')!;
      expect(bondRec.currentPercent).toBe(9);
      expect(bondRec.driftPercent).toBe(-11);
      expect(bondRec.action).toBe('BUY');
    });

    it('股息活水轉向 (DIVIDEND_REDIRECT)：不賣股票存量，將年股息導流加碼低配防彈衣', () => {
      const plan = calculateAssetClassRebalancePlan({
        config: targetConfig,
        holdings: portfolioHoldings,
        cashBalanceTwd: 200000,
        strategyMode: 'DIVIDEND_REDIRECT',
        annualEstimatedDividendsTwd: 300000, // 30 萬股息活水
      });

      expect(plan.strategyMode).toBe('DIVIDEND_REDIRECT');
      expect(plan.dividendRedirectPlan).toBeDefined();
      expect(plan.dividendRedirectPlan!.annualEstimatedDividendsTwd).toBe(300000);
      expect(plan.dividendRedirectPlan!.targets.length).toBeGreaterThan(0);

      // 低配嚴重的公債與黃金應獲得活水配額
      const bondTarget = plan.dividendRedirectPlan!.targets.find((t) => t.category === 'BOND_GOV');
      expect(bondTarget).toBeDefined();
      expect(bondTarget!.allocatedAmountTwd).toBeGreaterThan(0);
      expect(bondTarget!.suggestedSymbol).toBe('00687B');
    });

    it('股票質押負債情境：優先建議償還質押本金降槓桿，且已設質股數不賣', () => {
      const pledgedStockMap = {
        '0050': 5000, // 0050 設質 5,000 股
      };

      const plan = calculateAssetClassRebalancePlan({
        config: targetConfig,
        holdings: portfolioHoldings,
        cashBalanceTwd: 200000,
        strategyMode: 'NORMAL',
        activeLoanPrincipalTwd: 500000, // 質押借款 50 萬
        pledgedSharesMap: pledgedStockMap,
      });

      expect(plan.debtRepayment).toBeDefined();
      expect(plan.debtRepayment!.hasActiveLoans).toBe(true);
      expect(plan.debtRepayment!.totalLoanPrincipalTwd).toBe(500000);
      expect(plan.debtRepayment!.recommendedRepaymentAmountTwd).toBeGreaterThan(0);

      // 四階減碼瀑布流：波段個股 (2330) 應排在 Tier 1 優先減碼
      expect(plan.waterfallSellSuggestions).toBeDefined();
      const tier1 = plan.waterfallSellSuggestions!.find((w) => w.tier === 1);
      expect(tier1?.symbol).toBe('2330');

      // 0050 設質 5000 股應標記為 isPledged = true 且可賣股數排除設質
      const t0050Waterfall = plan.waterfallSellSuggestions!.find((w) => w.symbol === '0050')!;
      expect(t0050Waterfall.isPledged).toBe(true);
      expect(t0050Waterfall.pledgedShares).toBe(5000);
      expect(t0050Waterfall.unpledgedShares).toBe(5000);
    });
  });
});
