import { HoldingPosition } from '../types/stock';
import {
  LookThroughExposure,
  LookThroughReport,
  SectorConcentration,
} from '../types/lookThrough';
import { getETFProfile } from '../data/etfHoldingsData';
import { resolveOfficialSecurityName } from './stockNameResolver';

/**
 * 核心穿透透視與產業集中度聚合引擎 (Look-Through Aggregator)
 */
export function calculateLookThroughExposure(
  holdings: HoldingPosition[],
  usdRate: number = 32.0
): LookThroughReport {
  if (!holdings || holdings.length === 0) {
    return {
      asOfDate: new Date().toISOString().split('T')[0],
      totalPortfolioNAV: 0,
      exposures: [],
      sectorBreakdown: [],
    };
  }

  // 1. 計算整戶總 NAV (折算 TWD)
  let totalPortfolioNAV = 0;
  interface ProcessedHolding {
    holding: HoldingPosition;
    marketValueTWD: number;
  }
  const processedHoldings: ProcessedHolding[] = [];

  for (const h of holdings) {
    if (h.shares <= 0) continue;
    const isUS = h.market === 'US' || h.currency === 'USD';
    const rate = isUS ? (usdRate > 0 ? usdRate : 32.0) : 1.0;
    const valueTWD = (h.marketValue || (h.shares * (h.currentPrice || 0))) * rate;
    totalPortfolioNAV += valueTWD;
    processedHoldings.push({
      holding: h,
      marketValueTWD: valueTWD,
    });
  }

  if (totalPortfolioNAV <= 0) {
    return {
      asOfDate: new Date().toISOString().split('T')[0],
      totalPortfolioNAV: 0,
      exposures: [],
      sectorBreakdown: [],
    };
  }

  // 2. 底層公司聚合 Map: symbol -> LookThroughExposure
  const exposureMap = new Map<string, LookThroughExposure>();

  const getOrCreateExposure = (
    sym: string,
    name: string,
    market: 'TW' | 'US',
    sector: string
  ): LookThroughExposure => {
    const cleanSym = sym.trim().toUpperCase();
    if (!exposureMap.has(cleanSym)) {
      exposureMap.set(cleanSym, {
        symbol: cleanSym,
        name: resolveOfficialSecurityName(cleanSym, name),
        market,
        sector: sector || '其他產業',
        directMarketValue: 0,
        indirectMarketValue: 0,
        totalEffectiveValue: 0,
        portfolioWeightPercent: 0,
        isConcentrationAlert: false,
        derivedSources: [],
      });
    }
    return exposureMap.get(cleanSym)!;
  };

  // 3. 逐檔持倉穿透拆解
  for (const { holding, marketValueTWD } of processedHoldings) {
    const etfProfile = getETFProfile(holding.symbol);

    if (etfProfile && etfProfile.topConstituents && etfProfile.topConstituents.length > 0) {
      // 收錄之 ETF：按成分股權重拆解分配
      let sumTopWeight = 0;

      for (const constituent of etfProfile.topConstituents) {
        sumTopWeight += constituent.weightPercent;
        const indirectVal = marketValueTWD * (constituent.weightPercent / 100);

        const exp = getOrCreateExposure(
          constituent.symbol,
          constituent.name,
          constituent.country,
          constituent.sector
        );

        exp.indirectMarketValue += indirectVal;
        exp.derivedSources.push({
          etfSymbol: etfProfile.symbol,
          etfName: etfProfile.name,
          weightInETF: constituent.weightPercent,
          indirectValue: indirectVal,
        });
      }

      // 剩餘權重 (非前十大) 歸為分散式持股
      const remainingWeight = Math.max(0, 100 - sumTopWeight);
      if (remainingWeight > 0) {
        const remainingVal = marketValueTWD * (remainingWeight / 100);
        const othersKey = `OTHERS_${etfProfile.symbol}`;
        const expOthers = getOrCreateExposure(
          othersKey,
          `${etfProfile.symbol} 其他分散成分`,
          etfProfile.market,
          '多元分散'
        );
        expOthers.indirectMarketValue += remainingVal;
        expOthers.derivedSources.push({
          etfSymbol: etfProfile.symbol,
          etfName: etfProfile.name,
          weightInETF: remainingWeight,
          indirectValue: remainingVal,
        });
      }
    } else {
      // 一般個股或未收錄 ETF：直接計為 Direct
      const isUS = holding.market === 'US' || holding.currency === 'USD';
      const defaultSector = isUS ? '美股投資標的' : '台股投資標的';
      const exp = getOrCreateExposure(
        holding.symbol,
        holding.name || holding.symbol,
        isUS ? 'US' : 'TW',
        defaultSector
      );
      exp.directMarketValue += marketValueTWD;
    }
  }

  // 4. 計算各標的總曝險與百分比
  const exposures: LookThroughExposure[] = [];
  let topConcentratedRiskSymbol: string | undefined;
  let maxWeight = 0;

  for (const exp of exposureMap.values()) {
    exp.totalEffectiveValue = exp.directMarketValue + exp.indirectMarketValue;
    exp.portfolioWeightPercent = (exp.totalEffectiveValue / totalPortfolioNAV) * 100;
    // 集中度警示：單一公司 > 25% (排除多元分散集合)
    if (exp.portfolioWeightPercent > 25 && !exp.symbol.startsWith('OTHERS_')) {
      exp.isConcentrationAlert = true;
    }

    if (exp.portfolioWeightPercent > maxWeight && !exp.symbol.startsWith('OTHERS_')) {
      maxWeight = exp.portfolioWeightPercent;
      topConcentratedRiskSymbol = exp.symbol;
    }

    exposures.push(exp);
  }

  // 按實質總曝險金額降冪排序
  exposures.sort((a, b) => b.totalEffectiveValue - a.totalEffectiveValue);

  // 5. 產業因子集中度匯總
  const sectorMap = new Map<string, number>();
  for (const exp of exposures) {
    const sec = exp.sector || '其他產業';
    sectorMap.set(sec, (sectorMap.get(sec) || 0) + exp.totalEffectiveValue);
  }

  const sectorBreakdown: SectorConcentration[] = [];
  for (const [sector, value] of sectorMap.entries()) {
    const weightPercent = (value / totalPortfolioNAV) * 100;
    sectorBreakdown.push({
      sector,
      totalMarketValue: value,
      weightPercent,
      isConcentrationAlert: weightPercent > 50, // 單一產業 > 50% 警示
    });
  }

  sectorBreakdown.sort((a, b) => b.totalMarketValue - a.totalMarketValue);

  return {
    asOfDate: new Date().toISOString().split('T')[0],
    totalPortfolioNAV,
    exposures,
    sectorBreakdown,
    topConcentratedRiskSymbol: maxWeight > 25 ? topConcentratedRiskSymbol : undefined,
  };
}
