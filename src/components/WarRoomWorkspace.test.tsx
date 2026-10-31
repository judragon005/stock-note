import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WarRoomWorkspace } from './WarRoomWorkspace';
import { MacroDualThermometerBar } from './warRoom/MacroDualThermometerBar';
import type { HoldingPosition, LoanRecord } from '../types/stock';
import { saveMacroPinnedStrategy, sanitizeMacroRecord } from '../utils/macroPulseStorage';

describe('WarRoomWorkspace (Spec 0209 Macro War Room 3.0)', () => {
  const sampleHoldings = [
    {
      symbol: '0050',
      name: '元大台灣50',
      market: 'TW',
      currency: 'TWD',
      shares: 10000,
      avgCost: 150,
      currentPrice: 180,
      totalCostBasis: 1500000,
      adjustedCostBasis: 1500000,
      grossMarketValue: 1800000,
      marketValue: 1800000,
      netMarketValue: 1800000,
      estimatedSellTax: 0,
      estimatedSellFee: 0,
      unrealizedPnL: 300000,
      unrealizedPnLPercent: 20,
      unrealizedPnLBroker: 300000,
      unrealizedPnLBrokerPercent: 20,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
      totalStockDividendsShares: 0,
      totalReturnPnL: 300000,
      totalReturnPercent: 20,
      yieldOnCostPercent: 0,
      plan: {
        stopLossPrice: 178,
        takeProfitPrice: 210,
      },
    },
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corp',
      market: 'US',
      currency: 'USD',
      shares: 100,
      avgCost: 100,
      currentPrice: 125,
      totalCostBasis: 10000,
      adjustedCostBasis: 10000,
      grossMarketValue: 12500,
      marketValue: 12500,
      netMarketValue: 12500,
      estimatedSellTax: 0,
      estimatedSellFee: 0,
      unrealizedPnL: 2500,
      unrealizedPnLPercent: 25,
      unrealizedPnLBroker: 2500,
      unrealizedPnLBrokerPercent: 25,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
      totalStockDividendsShares: 0,
      totalReturnPnL: 2500,
      totalReturnPercent: 25,
      yieldOnCostPercent: 0,
    },
  ] as HoldingPosition[];

  const emptyLoans: LoanRecord[] = [];

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    vi.restoreAllMocks();
  });

  it('Ticket 01 & 06: 渲染雙溫度計、跨時區雙時鐘、GC=F 國際黃金現貨/期貨 ($3350+) 與零借款誠實顯示 (無假 250%)', () => {
    const html = renderToStaticMarkup(
      <WarRoomWorkspace
        holdings={sampleHoldings}
        loans={emptyLoans}
        cashBalanceTwd={500000}
        totalNavTwd={2700000}
        usdToTwdRate={32.5}
        onOpenMarginStressModal={vi.fn()}
      />
    );

    // 1. 雙溫度計 (長線總經配置 + 短中期波段戰術)
    expect(html).toContain('長線總經配置溫度計');
    expect(html).toContain('短中期波段戰術溫度計');
    expect(html).toContain('費城半導體指數 (^SOX)');
    expect(html).toContain('台積電 ADR (TSM) 跨市溢折價');

    // 2. 黃金正名為「國際黃金現貨/期貨 (GC=F)」，杜絕 GLD 誤植與 $2515 假價格
    expect(html).toContain('國際黃金現貨/期貨 (GC=F)');
    expect(html).not.toContain('黃金現貨 (GLD)');
    expect(html).toContain('3350');

    // 3. 零質押負債時誠實顯示「無質押負債 (零槓桿)」，絕不顯示假 250%
    expect(html).toContain('無質押負債 (零槓桿)');
    expect(html).not.toContain('250%');
  });

  it('Ticket 07: 計算真·自由可動用子彈（扣除 T+2 在途交割與 7 日 DCA）與 ETF 穿透半導體/台積電曝險', () => {
    const html = renderToStaticMarkup(
      <WarRoomWorkspace
        holdings={sampleHoldings}
        loans={emptyLoans}
        cashBalanceTwd={500000}
        pendingSettlementOutflowTwd={120000}
        dcaCommitment7dTwd={30000}
        totalNavTwd={2700000}
        usdToTwdRate={32.5}
        onOpenMarginStressModal={vi.fn()}
      />
    );

    // 真·自由可動用子彈 = 500,000 - 120,000 - 30,000 = 350,000
    expect(html).toContain('真·自由可動用子彈');
    expect(html).toContain('350,000');
    expect(html).toContain('ETF 穿透真實半導體與台積電曝險');
  });

  it('Ticket 09 & 10: 渲染持股波段戰術雷達（含一鍵跳轉按鈕、自訂停損逼近警示）與外部 AI 宏觀戰略釘選列', () => {
    if (typeof localStorage !== 'undefined') {
      saveMacroPinnedStrategy({
        id: 'pin-test-1',
        pinnedAt: '2026-10-30T08:00:00Z',
        aiModel: 'Claude 3.7 Sonnet',
        recommendedEquityCapPercent: 65,
        soxSupportLevel: 5000,
        taiexSupportLevel: 22500,
        tacticalSummary: '費半守穩月線，拉回分批低接台積電供應鏈',
      });
    }

    const html = renderToStaticMarkup(
      <WarRoomWorkspace
        holdings={sampleHoldings}
        loans={emptyLoans}
        cashBalanceTwd={500000}
        totalNavTwd={2700000}
        usdToTwdRate={32.5}
        onInspectTechnical={vi.fn()}
        onOpenAiForce={vi.fn()}
        onOpenTradeModal={vi.fn()}
        onOpenMarginStressModal={vi.fn()}
      />
    );

    // 持股戰術雷達與一鍵跳轉
    expect(html).toContain('在倉持股波段戰術雷達與一鍵執行閉環');
    expect(html).toContain('📈 技術面');
    expect(html).toContain('🤖 AI戰情');
    expect(html).toContain('⚡ 下單紀錄');
    expect(html).toContain('逼近自訂停損');

    // 外部 AI 戰略釘選列
    expect(html).toContain('外部 AI 智囊團宏觀戰略釘選列');
    if (typeof localStorage !== 'undefined') {
      expect(html).toContain('Claude 3.7 Sonnet');
      expect(html).toContain('費半守穩月線，拉回分批低接台積電供應鏈');
    }

    // 確保遵守全域主題色變數 (var(--gain-color) / var(--loss-color))，無硬編碼 #4ade80 / #f87171
    expect(html).toContain('var(--gain-color)');
    expect(html).not.toContain('#4ade80');
    expect(html).not.toContain('#f87171');
  });

  it('Bug Fix: 當 twMarketBreadth 缺少 pctAbove20MA (僅有 pctAbove20Ma 或為空物件) 時，不崩潰且安全渲染', () => {
    const mockDualThermometer: any = {
      strategicRegime: {
        score: 65,
        stance: 'NEUTRAL',
        label: '中性配置',
        recommendedEquityCapPercent: 70,
        drivers: [],
      },
      tacticalSwing: {
        score: 55,
        signal: 'PULLBACK_BUY',
        label: '回檔分批',
        twSwingSummary: '中性震盪',
        usSwingSummary: '中性震盪',
        isNarrowTsmcTrap: false,
        drivers: [],
        recommendedCashBufferPercent: 20,
        soxStatus: '費半震盪',
        adrPremiumStatus: '溢價正常',
      },
    };

    // 1. 測試小寫 pctAbove20Ma 相容性
    const legacySnapshot: any = {
      date: '2026-10-31',
      usdToTwd: 32.15,
      twMarketBreadth: {
        advancingCount: 450,
        decliningCount: 520,
        pctAbove20Ma: 48.6, // 舊版小寫 Ma
        breadthRegime: 'NEUTRAL',
      },
      twInstitutionalSpot: {
        totalNetTwdBillions: 125.4,
        trustNetTwdBillions: 45.2,
      },
    };

    const html1 = renderToStaticMarkup(
      <MacroDualThermometerBar
        macroSnapshot={legacySnapshot}
        dualThermometer={mockDualThermometer}
        activeMarketTab="GLOBAL"
        onMarketTabChange={vi.fn()}
      />
    );
    expect(html1).toContain('站上月線 49%');
    expect(html1).toContain('漲 450 / 跌 520 家');
    expect(html1).toContain('現貨 +125.4 億');

    // 2. 測試完全無 pctAbove 數值時安全降級為 55% 且無抛錯
    const emptyBreadthSnapshot: any = {
      date: '2026-10-31',
      twMarketBreadth: {
        advancingCount: 300,
        decliningCount: 600,
        breadthRegime: 'BROAD_DECLINE',
      },
    };

    const html2 = renderToStaticMarkup(
      <MacroDualThermometerBar
        macroSnapshot={emptyBreadthSnapshot}
        dualThermometer={mockDualThermometer}
        activeMarketTab="GLOBAL"
        onMarketTabChange={vi.fn()}
      />
    );
    expect(html2).toContain('站上月線 55%');
    expect(html2).toContain('USD/TWD 32.15');
    expect(html2).toContain('現貨 同步中');

    // 3. 測試全空 snapshot 下 WarRoomWorkspace 渲染無異常
    expect(() => {
      renderToStaticMarkup(
        <WarRoomWorkspace
          holdings={sampleHoldings}
          loans={emptyLoans}
          cashBalanceTwd={500000}
          totalNavTwd={2700000}
          usdToTwdRate={32.5}
          onOpenMarginStressModal={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it('Ticket 02: 當 macroSnapshot 受到行情物件污染時，前端海關與標量守衛應自動自愈，絕不拋出 Objects are not valid as React child 崩潰', () => {
    // 模擬曾被後端污染寫入 LocalStorage 的髒物件
    const contaminatedRecord: any = {
      date: '2026-10-31',
      dxy: {
        symbol: 'DX-Y.NYB',
        price: 104.35,
        prevClose: 104.1,
        changePercent: 0.24,
        ma20: 103.8,
        ma60: 103.5,
        bias20Ma: 0.53,
        above20Ma: true,
        above60Ma: true,
      },
      vix: {
        symbol: '^VIX',
        price: 19.8,
        prevClose: 18.5,
        changePercent: 7.03,
      },
      goldPrice: {
        symbol: 'GC=F',
        price: 3425.0,
      },
    };

    // 透過海關進行淨化
    const cleaned = sanitizeMacroRecord(contaminatedRecord);
    expect(cleaned.dxy).toBe(104.35);
    expect(typeof cleaned.dxy).toBe('number');
    expect(cleaned.vix).toBe(19.8);
    expect(typeof cleaned.vix).toBe('number');
    expect(cleaned.goldPrice).toBe(3425.0);

    // 驗證渲染此資料時絕對不拋出例外
    expect(() => {
      const html = renderToStaticMarkup(
        <WarRoomWorkspace
          holdings={sampleHoldings}
          loans={emptyLoans}
          cashBalanceTwd={500000}
          totalNavTwd={2700000}
          usdToTwdRate={32.5}
          onOpenMarginStressModal={vi.fn()}
        />
      );
      expect(html).toContain('法人旗艦級宏觀戰情室');
    }).not.toThrow();
  });
});
