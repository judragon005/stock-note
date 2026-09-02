import { describe, it, expect } from 'vitest';
import {
  BrokerAccount,
  TradeRecord,
  CashTransaction,
  LoanRecord,
  PriceQuote,
} from '../types/stock';
import {
  calculateAccountBalances,
  calculateNetInvestedCapital,
  calculatePledgeMaintenanceRatio,
  calculateOverallLeverageMetrics,
  syncTradesWithCashTransactions,
  sortCashTransactions,
  createFxTransferPair,
  reconcileAccountBalance,
  calculateSettlementDate,
  getSettlementDate,
  calculateTradingBuyingPower,
  calculateTotalBuyingPower,
  groupPendingSettlementsByTimeline,
  calculateLoanInterestAndPayoff,
  createEmptyAccountSummary,
  isPendingOrFutureTransaction,
  aggregateInterestIncomeDetails,
  generateMonthlyLoanInterestTransactions,
} from './cashLedgerEngine';

const mockAccounts: BrokerAccount[] = [
  {
    id: 'broker-cathay',
    name: '國泰證券 (台股交割戶)',
    market: 'TW',
    feeRate: 0.001425,
    discountRate: 0.28,
    minFee: 20,
    taxRate: 0.003,
    isDefault: true,
  },
  {
    id: 'broker-schwab',
    name: '嘉信理財 (美股帳戶)',
    market: 'US',
    feeRate: 0,
    discountRate: 1.0,
    minFee: 0,
    taxRate: 0,
    isDefault: true,
  },
];

describe('現金帳本與多帳戶餘額試算引擎 (Cash Ledger Engine)', () => {
  it('應正確計算多個帳戶的個別現金餘額、累計入出金與全折算台幣總額', () => {
    const transactions: CashTransaction[] = [
      {
        id: 'tx-1',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'DEPOSIT',
        amount: 500000,
        date: '2026-01-01',
        createdAt: 1,
      },
      {
        id: 'tx-2',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'STOCK_BUY',
        amount: -200000,
        date: '2026-01-02',
        createdAt: 2,
      },
      {
        id: 'tx-3',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'INTEREST_INCOME',
        amount: 350,
        date: '2026-01-15',
        createdAt: 3,
      },
      {
        id: 'tx-4',
        accountId: 'broker-schwab',
        currency: 'USD',
        type: 'DEPOSIT',
        amount: 10000,
        date: '2026-01-05',
        createdAt: 4,
      },
      {
        id: 'tx-5',
        accountId: 'broker-schwab',
        currency: 'USD',
        type: 'WITHDRAWAL',
        amount: -2000,
        date: '2026-01-20',
        createdAt: 5,
      },
    ];

    const result = calculateAccountBalances(mockAccounts, transactions, 32.0);

    // 國泰帳戶 (TWD): 500,000 - 200,000 + 350 = 300,350
    expect(result.byAccount['broker-cathay'].balance).toBe(300350);
    expect(result.byAccount['broker-cathay'].totalDeposits).toBe(500000);
    expect(result.byAccount['broker-cathay'].totalWithdrawals).toBe(0);

    // 嘉信帳戶 (USD): 10,000 - 2,000 = 8,000 USD
    expect(result.byAccount['broker-schwab'].balance).toBe(8000);
    expect(result.byAccount['broker-schwab'].totalDeposits).toBe(10000);
    expect(result.byAccount['broker-schwab'].totalWithdrawals).toBe(2000);

    // 全域總現金折算 TWD: 300,350 + (8,000 * 32) = 556,350
    expect(result.totalCashInTWD).toBe(556350);
    expect(result.totalTWD).toBe(300350);
    expect(result.totalUSD).toBe(8000);
  });

  it('應正確將未來未發生股息與 T+2/T+1 在途待交割款隔離，不計入當前可用餘額並提供 projectedBalance', () => {
    const transactions: CashTransaction[] = [
      {
        id: 'tx-settled-deposit',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'DEPOSIT',
        amount: 100000,
        date: '2026-08-20',
        createdAt: 1,
      },
      {
        id: 'tx-pending-buy',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'STOCK_BUY',
        amount: -13068,
        date: '2026-08-25',
        settlementDate: '2026-08-27',
        settlementStatus: 'PENDING', // 待交割
        createdAt: 2,
      },
      {
        id: 'tx-future-div',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'DIVIDEND_PAYOUT',
        amount: 48945,
        date: '2026-10-29', // 未來發放日
        createdAt: 3,
      },
    ];

    const result = calculateAccountBalances(mockAccounts, transactions, 32.0, '2026-08-25');
    const cathay = result.byAccount['broker-cathay'];

    // 實質可用現金餘額：只有已入帳的 100,000（待交割 -13,068 與未來股息 +48,945 不提前計入）
    expect(cathay.balance).toBe(100000);
    // 在途與未來款項合計：-13,068 + 48,945 = 35,877
    expect(cathay.pendingSettlementAmount).toBe(35877);
    // 預估全數交割後餘額：100,000 + 35,877 = 135,877
    expect(cathay.projectedBalance).toBe(135877);
  });


  it('應精確計算外部淨投入本金 (Net Invested Capital: 純入金 - 純出金)', () => {
    const transactions: CashTransaction[] = [
      {
        id: 'tx-1',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'DEPOSIT',
        amount: 1000000,
        date: '2026-01-01',
        createdAt: 1,
      },
      {
        id: 'tx-2',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'WITHDRAWAL',
        amount: -200000,
        date: '2026-02-01',
        createdAt: 2,
      },
      {
        id: 'tx-3',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'STOCK_BUY', // 股票買賣非外部出入金，不影響 netInvestedCapital
        amount: -500000,
        date: '2026-02-05',
        createdAt: 3,
      },
      {
        id: 'tx-4',
        accountId: 'broker-schwab',
        currency: 'USD',
        type: 'DEPOSIT',
        amount: 5000,
        date: '2026-01-10',
        createdAt: 4,
      },
    ];

    const netCapital = calculateNetInvestedCapital(transactions, 32.0);
    // TWD 淨入金 800,000 + USD 5,000 * 32 = 800,000 + 160,000 = 960,000
    expect(netCapital.totalNetCapitalInTWD).toBe(960000);
    expect(netCapital.totalDepositsInTWD).toBe(1000000 + 5000 * 32);
    expect(netCapital.totalWithdrawalsInTWD).toBe(200000);
  });

  it('應正確產生跨幣別雙向換匯流水配對 (FX Transfer Pair)', () => {
    const pair = createFxTransferPair({
      sourceAccountId: 'broker-cathay',
      targetAccountId: 'broker-schwab',
      sourceAmount: 32600, // 台幣扣款 (含電匯費)
      targetAmount: 1000,  // 美金入帳
      fxRate: 32.0,
      fee: 600,            // 電匯手續費
      date: '2026-03-01',
      note: '台幣換美金電匯嘉信',
    });

    expect(pair.outflow.accountId).toBe('broker-cathay');
    expect(pair.outflow.currency).toBe('TWD');
    expect(pair.outflow.type).toBe('FX_TRANSFER_OUT');
    expect(pair.outflow.amount).toBe(-32600);
    expect(pair.outflow.fee).toBe(600);

    expect(pair.inflow.accountId).toBe('broker-schwab');
    expect(pair.inflow.currency).toBe('USD');
    expect(pair.inflow.type).toBe('FX_TRANSFER_IN');
    expect(pair.inflow.amount).toBe(1000);
    expect(pair.inflow.fxRate).toBe(32.0);
  });

  it('應能依據使用者輸入之真實現金餘額自動產生校正入金/出金流水', () => {
    // 假設目前系統結餘為 -4,198,375，使用者交割戶真實餘額為 50,000
    // 應自動產生 +4,248,375 之 DEPOSIT 入金流水
    const tx = reconcileAccountBalance({
      accountId: 'broker-cathay',
      currentBalance: -4198375,
      targetBalance: 50000,
      currency: 'TWD',
      date: '2026-01-01',
    });

    expect(tx).not.toBeNull();
    expect(tx?.type).toBe('DEPOSIT');
    expect(tx?.amount).toBe(4248375);
    expect(tx?.accountId).toBe('broker-cathay');
  });

  it('應能正確計算台股 T+2 與美股 T+1 交割日期（自動避開週末）', () => {
    // 2026-08-21 (週五)
    // 台股 T+2 ➔ 應為 2026-08-25 (週二，避開週六週日)
    // 美股 T+1 ➔ 應為 2026-08-24 (週一，避開週末)
    const twSettlement = calculateSettlementDate('2026-08-21', 'TW');
    const usSettlement = calculateSettlementDate('2026-08-21', 'US');

    expect(twSettlement).toBe('2026-08-25');
    expect(usSettlement).toBe('2026-08-24');

    // 2026-08-19 (週三)
    // 台股 T+2 ➔ 2026-08-21 (週五)
    const twWed = calculateSettlementDate('2026-08-19', 'TW');
    expect(twWed).toBe('2026-08-21');
  });

  it('應精確跳過台股農曆春節連續長假與國定節日推算 T+2 交割日', () => {
    // 2026-02-11 (週三，農曆春節前最後交易日封關)
    // 2026-02-12 ~ 2026-02-20 為農曆年假休市，2026-02-21~22為週末
    // 2026-02-23 (週一，開紅盤第 1 個營業日)
    // 2026-02-24 (週二，開紅盤第 2 個營業日，即 2/11 買進之 T+2 正式交割扣款日)
    const twCnySettlement = calculateSettlementDate('2026-02-11', 'TW');
    expect(twCnySettlement).toBe('2026-02-24');

    // 2026-04-30 (週四，勞動節前夕)
    // 2026-05-01 (週五勞動節休市)，2026-05-02~03為週末
    // T+1: 2026-05-04 (週一)，T+2: 2026-05-05 (週二)
    const twLaborSettlement = calculateSettlementDate('2026-04-30', 'TW');
    expect(twLaborSettlement).toBe('2026-05-05');
  });

  it('應精確跳過美股 10 大聯邦節日推算 T+1 交割日', () => {
    // 2026-11-25 (週三，感恩節前夕交易)
    // 2026-11-26 (週四，感恩節休市)
    // 美股 T+1 ➔ 應順延至 2026-11-27 (週五)
    const usThanksgiving = calculateSettlementDate('2026-11-25', 'US');
    expect(usThanksgiving).toBe('2026-11-27');

    // 2026-12-24 (週四，聖誕節前夕交易)
    // 2026-12-25 (週五，聖誕節休市)，2026-12-26~27為週末
    // 美股 T+1 ➔ 應順延至 2026-12-28 (週一)
    const usChristmas = calculateSettlementDate('2026-12-24', 'US');
    expect(usChristmas).toBe('2026-12-28');
  });

  it('在春節連假期間，帳本應正確將尚未到達交割日之款項保留為在途款，不可提早轉為已交割可用現金', () => {
    const acc: BrokerAccount = {
      id: 'acc-tw',
      name: '國泰證券',
      market: 'TW',
      feeRate: 0.001425,
      discountRate: 0.28,
      minFee: 20,
      taxRate: 0.003,
      isDefault: true,
      createdAt: Date.now(),
    };

    // 2026-02-11 (春節封關日) 買進股票 100,000 元，推算交割日為 2026-02-24
    const buyTx: CashTransaction = {
      id: 'tx-cny-buy',
      accountId: 'acc-tw',
      currency: 'TWD',
      type: 'STOCK_BUY',
      category: 'STOCK_BUY',
      amount: -100000,
      date: '2026-02-11',
      tradeDate: '2026-02-11',
      settlementDate: calculateSettlementDate('2026-02-11', 'TW'),
      createdAt: Date.now(),
    };

    // 在大年初一 (2026-02-16) 檢視帳本
    const summaryAtCny = calculateAccountBalances([acc], [buyTx], 32.0, '2026-02-16');
    const accSummary = summaryAtCny.byAccount['acc-tw'];

    // 尚未到交割日 (2026-02-24)，實質可用現金不應被預先扣除或結算
    expect(accSummary.balance).toBe(0);
    expect(accSummary.settledCash).toBe(0);
    // 應付款項應完整列在 pendingPayables 中
    expect(accSummary.pendingPayables).toBe(100000);
    expect(accSummary.projectedBalance).toBe(-100000);

    // 等到 2026-02-24 當天或之後，款項才正式結算扣款
    const summarySettled = calculateAccountBalances([acc], [buyTx], 32.0, '2026-02-24');
    const accSummarySettled = summarySettled.byAccount['acc-tw'];
    expect(accSummarySettled.balance).toBe(-100000);
    expect(accSummarySettled.pendingPayables).toBe(0);
  });
});

describe('股票質押借款與即時擔保維持率風控引擎 (Loan & Pledge Collateral Engine)', () => {
  it('應精確計算質押當前應返還之累計利息、預估月息與本利和應還款金額', () => {
    const loan: LoanRecord = {
      id: 'loan-1',
      name: '永豐金 00878 股票質押',
      loanType: 'PLEDGE',
      principal: 495000,
      annualInterestRate: 4.0, // 4%
      currency: 'TWD',
      startDate: '2026-01-01',
      createdAt: Date.now(),
    };

    // 假設基準日為 2026-03-02 (經過 60 天)
    const metrics = calculateLoanInterestAndPayoff(loan, '2026-03-02');
    expect(metrics.daysElapsed).toBe(60);
    // 利息 = 495000 * 0.04 * (60 / 365) = 3254.79 -> 3255
    expect(metrics.accruedInterest).toBe(3255);
    // 預估月息 = 495000 * 0.04 / 12 = 1650
    expect(metrics.monthlyEstimatedInterest).toBe(1650);
    // 本利和 = 495000 + 3255 = 498255
    expect(metrics.totalPayoffAmount).toBe(498255);

    // 含有設質三大規費的情況 (如 撥券 $54)
    const loanWithPledgeFees: LoanRecord = {
      ...loan,
      startDate: '2026-07-28',
      transferFee: 54,
    };
    const metricsWithFees = calculateLoanInterestAndPayoff(loanWithPledgeFees, '2026-08-25'); // 計息 28 天
    // 495000 * 0.04 * (28 / 365) = 1518.9 -> 1519
    expect(metricsWithFees.accruedInterest).toBe(1519);
    expect(metricsWithFees.pledgeFees).toBe(54);
    // 還款總額 = 495000 + 1519 + 54 = 496573
    expect(metricsWithFees.totalPayoffAmount).toBe(496573);
  });
  const mockLoan: LoanRecord = {
    id: 'loan-1',
    accountId: 'broker-cathay',
    name: '台積電+聯發科股票質押借款',
    loanType: 'PLEDGE',
    principal: 1000000, // 借款本金 100 萬
    annualInterestRate: 2.35,
    currency: 'TWD',
    startDate: '2026-01-01',
    warningRatio: 130,
    safeRatio: 166,
    pledgedCollateral: [
      { symbol: '2330', shares: 1000 },
      { symbol: '2454', shares: 500 },
    ],
    createdAt: 1,
  };

  const mockQuotes: Record<string, PriceQuote> = {
    '2330': {
      symbol: '2330',
      market: 'TW',
      price: 1000, // 市值 1,000,000
      currency: 'TWD',
      status: 'REALTIME',
      updatedAt: 1,
      source: 'TWSE',
    },
    '2454': {
      symbol: '2454',
      market: 'TW',
      price: 1200, // 市值 600,000
      currency: 'TWD',
      status: 'REALTIME',
      updatedAt: 1,
      source: 'TWSE',
    },
  };

  it('應依據即時市價計算質押擔保總市值與維持率', () => {
    // 總市值 = 1,000,000 + 600,000 = 1,600,000
    // 維持率 = (1,600,000 / 1,000,000) * 100 = 160%
    const ratioResult = calculatePledgeMaintenanceRatio(mockLoan, mockQuotes);

    expect(ratioResult.collateralMarketValue).toBe(1600000);
    expect(ratioResult.maintenanceRatio).toBe(160);
    expect(ratioResult.status).toBe('WARNING'); // < 166 且 >= 130 為 WARNING
    expect(ratioResult.isMarginCall).toBe(false);
  });

  it('當股價下跌觸及 130% 時應發出斷頭追繳警報 (MARGIN_CALL)', () => {
    const lowQuotes: Record<string, PriceQuote> = {
      '2330': {
        symbol: '2330',
        market: 'TW',
        price: 700, // 700,000
        currency: 'TWD',
        status: 'REALTIME',
        updatedAt: 1,
        source: 'TWSE',
      },
      '2454': {
        symbol: '2454',
        market: 'TW',
        price: 500, // 250,000
        currency: 'TWD',
        status: 'REALTIME',
        updatedAt: 1,
        source: 'TWSE',
      },
    };

    // 總市值 = 950,000, 借款 1,000,000 -> 95%
    const ratioResult = calculatePledgeMaintenanceRatio(mockLoan, lowQuotes);

    expect(ratioResult.collateralMarketValue).toBe(950000);
    expect(ratioResult.maintenanceRatio).toBe(95);
    expect(ratioResult.status).toBe('DANGER');
    expect(ratioResult.isMarginCall).toBe(true);
  });

  it('應正確計算整體淨負債比 (LTV) 與年化利息支出 (起始日即時負債)', () => {
    const loans: LoanRecord[] = [mockLoan];
    const totalStockMarketValue = 3000000;
    const totalCashBalance = 500000;

    const leverage = calculateOverallLeverageMetrics(loans, totalStockMarketValue, totalCashBalance, 32.0, '2026-01-01');

    // 總負債 = 1,000,000 (0 天利息與規費)
    // 總資產 = 3,000,000 + 500,000 = 3,500,000
    // 淨資產 NAV = 2,500,000
    // 負債比 (LTV) = 1,000,000 / 3,500,000 * 100 = 28.57%
    expect(leverage.totalDebtInTWD).toBe(1000000);
    expect(leverage.totalAssetInTWD).toBe(3500000);
    expect(leverage.netAssetValueInTWD).toBe(2500000);
    expect(leverage.debtRatioPercent).toBeCloseTo(28.57, 1);
    expect(leverage.estimatedAnnualInterestInTWD).toBe(23500); // 1,000,000 * 2.35%
  });

  it('總負債應精準計入應計利息與設質三大規費 (本利和+規費扣減 NAV)', () => {
    const loanWithFees: LoanRecord = {
      id: 'loan-fees',
      name: '質押貸款含規費',
      loanType: 'PLEDGE',
      principal: 500000,
      annualInterestRate: 2.5,
      currency: 'TWD',
      startDate: '2026-03-01',
      transferFee: 100,
      pledgeRegistryFee: 100,
      handlingFee: 0,
      createdAt: 1,
    };

    // 計息 30 天：2026-03-01 到 2026-03-31
    // 利息 = 500000 * (0.025 / 365) * 30 = 1027
    // 規費 = 100 + 100 = 200
    // 本利和規費總負債 = 500,000 + 1,027 + 200 = 501,227
    const leverage = calculateOverallLeverageMetrics(
      [loanWithFees],
      1000000, // 股票市值
      200000,  // 現金
      32.0,
      '2026-03-31'
    );

    expect(leverage.totalDebtInTWD).toBe(501227);
    expect(leverage.totalAssetInTWD).toBe(1200000);
    expect(leverage.netAssetValueInTWD).toBe(1200000 - 501227); // 698,773
    expect(leverage.debtRatioPercent).toBeCloseTo((501227 / 1200000) * 100, 2);
    expect(leverage.estimatedAnnualInterestInTWD).toBe(12500); // 500,000 * 2.5%
  });
});

describe('股票交易交割自動同步與流水關聯 (Trade Settlement Sync)', () => {
  it('新增買進交易時應自動生成 STOCK_BUY 現金扣款流水', () => {
    const trades: TradeRecord[] = [
      {
        id: 'trade-buy-1',
        date: '2026-02-10',
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        accountId: 'broker-cathay',
        shares: 1000,
        price: 800,
        fee: 399,
        tax: 0,
        createdAt: 1,
      },
    ];

    const currentCash: CashTransaction[] = [];
    const synced = syncTradesWithCashTransactions(trades, currentCash);

    expect(synced.length).toBe(1);
    expect(synced[0].type).toBe('STOCK_BUY');
    expect(synced[0].amount).toBe(-(1000 * 800 + 399)); // -800,399
    expect(synced[0].relatedTradeId).toBe('trade-buy-1');
    expect(synced[0].accountId).toBe('broker-cathay');
  });

  it('新增賣出交易時應自動生成 STOCK_SELL 淨入帳流水', () => {
    const trades: TradeRecord[] = [
      {
        id: 'trade-sell-1',
        date: '2026-02-20',
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        type: 'SELL',
        accountId: 'broker-cathay',
        shares: 1000,
        price: 900,
        fee: 449,
        tax: 2700,
        createdAt: 2,
      },
    ];

    const currentCash: CashTransaction[] = [];
    const synced = syncTradesWithCashTransactions(trades, currentCash);

    expect(synced.length).toBe(1);
    expect(synced[0].type).toBe('STOCK_SELL');
    expect(synced[0].amount).toBe(1000 * 900 - 449 - 2700); // 896,851
    expect(synced[0].relatedTradeId).toBe('trade-sell-1');
  });

  it('刪除股票交易時應自動清除關聯之現金交割流水，保留非關聯手動出入金', () => {
    const trades: TradeRecord[] = []; // 交易已被刪除

    const currentCash: CashTransaction[] = [
      {
        id: 'manual-deposit',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'DEPOSIT',
        amount: 500000,
        date: '2026-01-01',
        createdAt: 1,
      },
      {
        id: 'auto-buy',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'STOCK_BUY',
        amount: -800399,
        date: '2026-02-10',
        relatedTradeId: 'trade-buy-1',
        createdAt: 2,
      },
    ];

    const synced = syncTradesWithCashTransactions(trades, currentCash);

    expect(synced.length).toBe(1);
    expect(synced[0].id).toBe('manual-deposit');
  });

  it('美股現金股息流水統一以稅前毛額 (Gross) 入帳，以精準對齊券商 DOI/JRN 雙筆記帳機制', () => {
    const trades: TradeRecord[] = [
      {
        id: 'trade-us-vt-div-auto-tax',
        date: '2025-09-19',
        symbol: 'VT',
        name: 'Vanguard 全世界股票 ETF',
        market: 'US',
        currency: 'USD',
        type: 'DIVIDEND',
        accountId: 'broker-schwab',
        shares: 10,
        price: 0.478, // 毛額 4.78
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 'trade-us-vt-div-explicit-tax',
        date: '2025-12-19',
        symbol: 'VT',
        name: 'Vanguard 全世界股票 ETF',
        market: 'US',
        currency: 'USD',
        type: 'DIVIDEND',
        accountId: 'broker-schwab',
        shares: 20,
        price: 0.5575, // 毛額 11.15
        fee: 0,
        tax: 3.35,
        createdAt: 2,
      },
    ];

    const synced = syncTradesWithCashTransactions(trades, []);
    expect(synced.length).toBe(2);

    // 美股股息流水統一記錄為稅前毛額 (4.78 與 11.15)
    expect(synced[0].amount).toBeCloseTo(4.78, 2);
    expect(synced[0].type).toBe('DIVIDEND_PAYOUT');

    expect(synced[1].amount).toBeCloseTo(11.15, 2);
    expect(synced[1].type).toBe('DIVIDEND_PAYOUT');
  });

  it('美股買賣交易 (SGOV / VT) 自動生成流水帳時，accountId 應精準對齊所屬美股帳戶且幣別為 USD', () => {
    const trades: TradeRecord[] = [
      {
        id: 'trade-us-sgov-buy',
        date: '2026-01-01',
        symbol: 'SGOV',
        name: 'iShares 0-3月國庫債券 ETF',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        accountId: 'broker-schwab',
        shares: 89,
        price: 100.38,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 'trade-us-sgov-sell',
        date: '2026-01-28',
        symbol: 'SGOV',
        name: 'iShares 0-3月國庫債券 ETF',
        market: 'US',
        currency: 'USD',
        type: 'SELL',
        accountId: 'broker-schwab',
        shares: 89,
        price: 100.63,
        fee: 0,
        tax: 0.02,
        createdAt: 2,
      },
    ];

    const synced = syncTradesWithCashTransactions(trades, []);
    expect(synced.length).toBe(2);

    // 買進扣款
    expect(synced[0].accountId).toBe('broker-schwab');
    expect(synced[0].currency).toBe('USD');
    expect(synced[0].type).toBe('STOCK_BUY');
    expect(synced[0].amount).toBe(-(89 * 100.38));

    // 賣出入帳
    expect(synced[1].accountId).toBe('broker-schwab');
    expect(synced[1].currency).toBe('USD');
    expect(synced[1].type).toBe('STOCK_SELL');
    expect(synced[1].amount).toBe(+(89 * 100.63 - 0.02).toFixed(2));
  });

  it('應正確計算包含減資退款、借貸撥款/還本與稅費扣除的全量現金收支餘額', () => {
    const transactions: CashTransaction[] = [
      {
        id: 'tx-loan-disburse',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'LOAN_DISBURSEMENT',
        amount: 500000, // 借貸撥款 +500,000
        date: '2026-01-01',
        createdAt: 1,
      },
      {
        id: 'tx-capital-return',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'CAPITAL_RETURN',
        amount: 20000, // 減資退款 +20,000
        date: '2026-02-01',
        createdAt: 2,
      },
      {
        id: 'tx-loan-repay',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'LOAN_REPAYMENT',
        amount: -100000, // 還本 -100,000
        date: '2026-03-01',
        createdAt: 3,
      },
      {
        id: 'tx-tax-fee',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'TAX',
        amount: -1500, // 稅費扣除 -1,500
        date: '2026-03-15',
        createdAt: 4,
      },
    ];

    const result = calculateAccountBalances(mockAccounts, transactions, 32.0);
    // 500,000 + 20,000 - 100,000 - 1,500 = 418,500
    expect(result.byAccount['broker-cathay'].balance).toBe(418500);
    expect(result.byAccount['broker-cathay'].totalDeposits).toBe(520000);
    expect(result.byAccount['broker-cathay'].totalWithdrawals).toBe(100000);
    expect(result.byAccount['broker-cathay'].totalWireFees).toBe(1500);
  });

  it('sortCashTransactions 應能精確按照 YYYY-MM-DD 自然日期與 ASC / DESC 穩定排序，並妥善處理同日優先級', () => {
    const list: CashTransaction[] = [
      { id: '1', accountId: 'acc1', currency: 'USD', type: 'DIVIDEND_PAYOUT', amount: 45.09, date: '2026-06-23', createdAt: 1 },
      { id: '2', accountId: 'acc1', currency: 'USD', type: 'DIVIDEND_PAYOUT', amount: 26.18, date: '2026-03-24', createdAt: 2 },
      { id: '3', accountId: 'acc1', currency: 'USD', type: 'DEPOSIT', amount: 3400.0, date: '2025-08-25', createdAt: 3 },
      { id: '4', accountId: 'acc1', currency: 'USD', type: 'STOCK_BUY', amount: -1373.5, date: '2025-09-17', tradeDate: '2025-09-17', createdAt: 4 },
      { id: '5', accountId: 'acc1', currency: 'USD', type: 'TAX', amount: -1.43, date: '2025-09-23', note: '預扣稅', createdAt: 5 },
      { id: '6', accountId: 'acc1', currency: 'USD', type: 'DIVIDEND_PAYOUT', amount: 4.78, date: '2025-09-23', createdAt: 6 },
    ];

    // 1. ASC (舊 ➔ 新) 排序驗證
    const ascSorted = sortCashTransactions(list, 'ASC');
    expect(ascSorted.map((t) => t.date)).toEqual([
      '2025-08-25',
      '2025-09-17',
      '2025-09-23', // 同日 2025-09-23: 股息入帳 (流入 prio 1)
      '2025-09-23', // 同日 2025-09-23: 預扣稅 (稅費 prio 2)
      '2026-03-24',
      '2026-06-23',
    ]);
    expect(ascSorted[2].type).toBe('DIVIDEND_PAYOUT');
    expect(ascSorted[3].type).toBe('TAX');

    // 2. DESC (新 ➔ 舊) 排序驗證
    const descSorted = sortCashTransactions(list, 'DESC');
    expect(descSorted.map((t) => t.date)).toEqual([
      '2026-06-23',
      '2026-03-24',
      '2025-09-23', // 稅費排上方 (後發生)
      '2025-09-23', // 股息排下方 (先發生)
      '2025-09-17',
      '2025-08-25',
    ]);
    expect(descSorted[2].type).toBe('TAX');
    expect(descSorted[3].type).toBe('DIVIDEND_PAYOUT');
  });

  describe('市場交割日曆與週期推算函式 (getSettlementDate)', () => {
    it('台股正常週一至週三交易應推算 T+2 日期 (如週一 ➔ 週三)', () => {
      // 2026-08-24 為週一
      expect(getSettlementDate('2026-08-24', 'TW')).toBe('2026-08-26');
      // 2026-08-25 為週二
      expect(getSettlementDate('2026-08-25', 'TW')).toBe('2026-08-27');
    });

    it('台股跨週末交易應自動跳過週六週日 (週四 ➔ 週一，週五 ➔ 週二)', () => {
      // 2026-08-27 為週四 ➔ T+2 應為 2026-08-31 (週一)
      expect(getSettlementDate('2026-08-27', 'TW')).toBe('2026-08-31');
      // 2026-08-28 為週五 ➔ T+2 應為 2026-09-01 (週二)
      expect(getSettlementDate('2026-08-28', 'TW')).toBe('2026-09-01');
    });

    it('美股 T+1 正常日與跨週末推算 (週四 ➔ 週五，週五 ➔ 週一)', () => {
      // 2026-08-27 為週四 ➔ T+1 應為 2026-08-28 (週五)
      expect(getSettlementDate('2026-08-27', 'US')).toBe('2026-08-28');
      // 2026-08-28 為週五 ➔ T+1 應為 2026-08-31 (週一)
      expect(getSettlementDate('2026-08-28', 'US')).toBe('2026-08-31');
    });

    it('現金股息在有提供公告發放日時應優先採用發放日，無發放日時採用交易日', () => {
      expect(getSettlementDate('2026-08-20', 'TW', 'DIVIDEND_PAYOUT', '2026-09-15')).toBe('2026-09-15');
      expect(getSettlementDate('2026-08-20', 'TW', 'DIVIDEND_PAYOUT')).toBe('2026-08-20');
    });

    it('非股票買賣類別 (如 DEPOSIT/WITHDRAWAL/TAX) 預設為當日即時生效', () => {
      expect(getSettlementDate('2026-08-25', 'TW', 'DEPOSIT')).toBe('2026-08-25');
      expect(getSettlementDate('2026-08-25', 'US', 'TAX')).toBe('2026-08-25');
    });
  });

  describe('三層會計可用性計算核心 (Tri-State Availability Engine)', () => {
    it('應精確計算實質已交割現金、在途應收、在途應付與預估交割後淨額', () => {
      const transactions: CashTransaction[] = [
        // 1. 已交割入金 $100,000
        { id: 'tx-1', accountId: 'broker-cathay', currency: 'TWD', type: 'DEPOSIT', amount: 100000, date: '2026-08-20', settlementStatus: 'SETTLED', createdAt: 1 },
        // 2. 股票賣出在途應收 +$50,000 (T+2 待交割 2026-08-28)
        { id: 'tx-2', accountId: 'broker-cathay', currency: 'TWD', type: 'STOCK_SELL', amount: 50000, date: '2026-08-26', settlementDate: '2026-08-28', settlementStatus: 'PENDING', createdAt: 2 },
        // 3. 股票買進在途應付 -$30,000 (T+2 待交割 2026-08-28)
        { id: 'tx-3', accountId: 'broker-cathay', currency: 'TWD', type: 'STOCK_BUY', amount: -30000, date: '2026-08-26', settlementDate: '2026-08-28', settlementStatus: 'PENDING', createdAt: 3 },
        // 4. 現金股利在途應收 +$5,000 (公告發放日 2026-09-10)
        { id: 'tx-4', accountId: 'broker-cathay', currency: 'TWD', type: 'DIVIDEND_PAYOUT', amount: 5000, date: '2026-08-20', settlementDate: '2026-09-10', settlementStatus: 'PENDING', createdAt: 4 },
      ];

      const result = calculateAccountBalances(mockAccounts, transactions, 32.0, '2026-08-27');
      const cathay = result.byAccount['broker-cathay'];

      // 實質已交割現金 = $100,000 (可隨時提領)
      expect(cathay.balance).toBe(100000);
      expect(cathay.settledCash).toBe(100000);

      // 在途應收 = 50,000 (賣出) + 5,000 (股息) = 55,000
      expect(cathay.pendingReceivables).toBe(55000);

      // 在途應付 = 30,000 (買進)
      expect(cathay.pendingPayables).toBe(30000);

      // 在途淨額 = 55,000 - 30,000 = 25,000
      expect(cathay.netPendingAmount).toBe(25000);

      // 預估交割後總餘額 = 100,000 + 25,000 = 125,000
      expect(cathay.projectedBalance).toBe(125000);
    });
  });

  describe('交易購買力計算與防超買風控 (Trading Buying Power Engine)', () => {
    it('股票賣出應立即 100% 釋放購買力，買進應立即扣除購買力，未到帳股息與電匯不計入購買力', () => {
      const transactions: CashTransaction[] = [
        // 1. 已交割現金 $20,000
        { id: 'tx-1', accountId: 'broker-cathay', currency: 'TWD', type: 'DEPOSIT', amount: 20000, date: '2026-08-20', settlementStatus: 'SETTLED', createdAt: 1 },
        // 2. 賣出股票在途 +$80,000 (T+2 待交割) ➔ 應立即釋放購買力
        { id: 'tx-2', accountId: 'broker-cathay', currency: 'TWD', type: 'STOCK_SELL', amount: 80000, date: '2026-08-26', settlementDate: '2026-08-28', settlementStatus: 'PENDING', createdAt: 2 },
        // 3. 買進股票在途 -$40,000 (T+2 待交割) ➔ 應立即扣除購買力
        { id: 'tx-3', accountId: 'broker-cathay', currency: 'TWD', type: 'STOCK_BUY', amount: -40000, date: '2026-08-26', settlementDate: '2026-08-28', settlementStatus: 'PENDING', createdAt: 3 },
        // 4. 未入帳股息 +$15,000 (除息在途) ➔ 券商風控：不計入購買力
        { id: 'tx-4', accountId: 'broker-cathay', currency: 'TWD', type: 'DIVIDEND_PAYOUT', amount: 15000, date: '2026-08-20', settlementDate: '2026-09-10', settlementStatus: 'PENDING', createdAt: 4 },
        // 5. 減資退款在途 +$10,000 ➔ 不計入購買力
        { id: 'tx-5', accountId: 'broker-cathay', currency: 'TWD', type: 'CAPITAL_RETURN', amount: 10000, date: '2026-08-20', settlementDate: '2026-09-05', settlementStatus: 'PENDING', createdAt: 5 },
      ];

      const ledger = calculateAccountBalances(mockAccounts, transactions, 32.0, '2026-08-27');
      const cathay = ledger.byAccount['broker-cathay'];

      // 實質已交割現金 = $20,000 (此為可出金提領上限)
      expect(cathay.settledCash).toBe(20000);

      // 交易購買力 = 20,000 (Settled) + 80,000 (Pending Sell) - 40,000 (Pending Buy) = 60,000
      const buyingPower = calculateTradingBuyingPower(cathay, transactions, '2026-08-27');
      expect(buyingPower).toBe(60000);

      // 全市場折算總購買力
      const totalBp = calculateTotalBuyingPower(ledger, transactions, 32.0, '2026-08-27');
      expect(totalBp).toBe(60000);
    });

    it('美股交易購買力應支援 2 位小數 banker 精度', () => {
      const transactions: CashTransaction[] = [
        { id: 'tx-u1', accountId: 'broker-schwab', currency: 'USD', type: 'DEPOSIT', amount: 100.55, date: '2026-08-20', settlementStatus: 'SETTLED', createdAt: 1 },
        { id: 'tx-u2', accountId: 'broker-schwab', currency: 'USD', type: 'STOCK_SELL', amount: 300.45, date: '2026-08-26', settlementDate: '2026-08-27', settlementStatus: 'PENDING', createdAt: 2 },
        { id: 'tx-u3', accountId: 'broker-schwab', currency: 'USD', type: 'STOCK_BUY', amount: -150.25, date: '2026-08-26', settlementDate: '2026-08-27', settlementStatus: 'PENDING', createdAt: 3 },
      ];

      const ledger = calculateAccountBalances(mockAccounts, transactions, 32.0, '2026-08-26');
      const schwab = ledger.byAccount['broker-schwab'];

      // 購買力 = 100.55 + 300.45 - 150.25 = 250.75 USD
      const buyingPower = calculateTradingBuyingPower(schwab, transactions, '2026-08-26');
      expect(buyingPower).toBe(250.75);
    });
  });

  describe('在途時序分組與未來現金流預測 (Timeline Grouping Engine)', () => {
    it('應將在途款項精確分組為今日、明日、本週與未來排程，並計算各項總額', () => {
      // 假設基準日為 2026-08-27 (週四)
      const transactions: CashTransaction[] = [
        // 1. 今日到期 (2026-08-27)
        { id: 'tx-today', accountId: 'broker-cathay', currency: 'TWD', type: 'STOCK_BUY', amount: -20000, date: '2026-08-25', settlementDate: '2026-08-27', settlementStatus: 'PENDING', createdAt: 1 },
        // 2. 明日到期 (2026-08-28)
        { id: 'tx-tom', accountId: 'broker-cathay', currency: 'TWD', type: 'STOCK_SELL', amount: 50000, date: '2026-08-26', settlementDate: '2026-08-28', settlementStatus: 'PENDING', createdAt: 2 },
        // 3. 本週內到期 (2026-08-31, +4 天)
        { id: 'tx-week', accountId: 'broker-cathay', currency: 'TWD', type: 'STOCK_BUY', amount: -15000, date: '2026-08-27', settlementDate: '2026-08-31', settlementStatus: 'PENDING', createdAt: 3 },
        // 4. 未來排程 (2026-09-15, +19 天股息)
        { id: 'tx-future', accountId: 'broker-cathay', currency: 'TWD', type: 'DIVIDEND_PAYOUT', amount: 8000, date: '2026-08-20', settlementDate: '2026-09-15', settlementStatus: 'PENDING', createdAt: 4 },
        // 5. 已逾期待核銷 (2026-08-20, -7 天)
        { id: 'tx-overdue', accountId: 'broker-cathay', currency: 'TWD', type: 'DEPOSIT', amount: 10000, date: '2026-08-20', settlementDate: '2026-08-20', settlementStatus: 'PENDING', createdAt: 5 },
        // 6. 已交割項目 (不應納入在途時序)
        { id: 'tx-settled', accountId: 'broker-cathay', currency: 'TWD', type: 'DEPOSIT', amount: 100000, date: '2026-08-20', settlementDate: '2026-08-20', settlementStatus: 'SETTLED', createdAt: 6 },
      ];

      const timeline = groupPendingSettlementsByTimeline(transactions, mockAccounts, 32.0, '2026-08-27');

      expect(timeline.today.length).toBe(1);
      expect(timeline.today[0].transactionId).toBe('tx-today');
      expect(timeline.today[0].daysUntilSettlement).toBe(0);

      expect(timeline.tomorrow.length).toBe(1);
      expect(timeline.tomorrow[0].transactionId).toBe('tx-tom');
      expect(timeline.tomorrow[0].daysUntilSettlement).toBe(1);

      expect(timeline.thisWeek.length).toBe(1);
      expect(timeline.thisWeek[0].transactionId).toBe('tx-week');
      expect(timeline.thisWeek[0].daysUntilSettlement).toBe(4);

      expect(timeline.future.length).toBe(1);
      expect(timeline.future[0].transactionId).toBe('tx-future');
      expect(timeline.future[0].daysUntilSettlement).toBe(19);

      expect(timeline.overdue.length).toBe(1);
      expect(timeline.overdue[0].transactionId).toBe('tx-overdue');
      expect(timeline.overdue[0].daysUntilSettlement).toBe(-7);

      // 總流入 = 50,000 + 8,000 + 10,000 = 68,000
      expect(timeline.totalInflowInTWD).toBe(68000);
      // 總流出 = 20,000 + 15,000 = 35,000
      expect(timeline.totalOutflowInTWD).toBe(35000);
      // 淨流入 = 68,000 - 35,000 = 33,000
      expect(timeline.netInflowInTWD).toBe(33000);
    });

    it('createEmptyAccountSummary 應能正確生成具備所有預設 0 值的帳戶結算物件', () => {
      const summary = createEmptyAccountSummary('acc-1', '測試帳戶', 'TWD');
      expect(summary.accountId).toBe('acc-1');
      expect(summary.accountName).toBe('測試帳戶');
      expect(summary.currency).toBe('TWD');
      expect(summary.balance).toBe(0);
      expect(summary.settledCash).toBe(0);
      expect(summary.pendingReceivables).toBe(0);
      expect(summary.pendingPayables).toBe(0);
      expect(summary.netPendingAmount).toBe(0);
      expect(summary.totalDeposits).toBe(0);
      expect(summary.totalStockBuys).toBe(0);
      expect(summary.totalStockSells).toBe(0);
    });

    it('isPendingOrFutureTransaction 應正確辨識未來交易與未到期在途項目', () => {
      const today = '2026-08-27';

      // 1. 歷史且已交割
      expect(isPendingOrFutureTransaction({
        id: '1', accountId: 'acc', currency: 'TWD', type: 'DEPOSIT', amount: 100, date: '2026-08-20', settlementDate: '2026-08-20', settlementStatus: 'SETTLED', createdAt: 1
      }, today)).toBe(false);

      // 2. 未來日期事件 (即使標記 SETTLED 亦為在途)
      expect(isPendingOrFutureTransaction({
        id: '2', accountId: 'acc', currency: 'TWD', type: 'DEPOSIT', amount: 100, date: '2026-08-29', settlementDate: '2026-08-29', settlementStatus: 'SETTLED', createdAt: 2
      }, today)).toBe(true);

      // 3. 狀態為 PENDING
      expect(isPendingOrFutureTransaction({
        id: '3', accountId: 'acc', currency: 'TWD', type: 'STOCK_BUY', amount: -500, date: '2026-08-25', settlementDate: '2026-08-27', settlementStatus: 'PENDING', createdAt: 3
      }, today)).toBe(true);

      // 4. settlementDate 晚於今日
      expect(isPendingOrFutureTransaction({
        id: '4', accountId: 'acc', currency: 'TWD', type: 'STOCK_SELL', amount: 500, date: '2026-08-27', settlementDate: '2026-08-29', settlementStatus: 'SETTLED', createdAt: 4
      }, today)).toBe(true);
    });

    it('getSettlementDate 應正確支援電匯調撥 (T+2) 與質押借款撥款 (T+1) 之自動在途推算', () => {
      // 2026-08-28 是週五
      // 電匯 (T+2 避開週末) ➔ 週二 2026-09-01
      expect(getSettlementDate('2026-08-28', 'TW', 'FX_TRANSFER_OUT')).toBe('2026-09-01');
      expect(getSettlementDate('2026-08-28', 'TW', 'FX_TRANSFER_IN')).toBe('2026-09-01');
      expect(getSettlementDate('2026-08-28', 'TW', 'WIRE_FEE')).toBe('2026-09-01');

      // 質押撥款 (T+1 避開週末) ➔ 週一 2026-08-31
      expect(getSettlementDate('2026-08-28', 'TW', 'LOAN_DISBURSEMENT')).toBe('2026-08-31');

      // 一般出入金與借款還款預設當日
      expect(getSettlementDate('2026-08-28', 'TW', 'DEPOSIT')).toBe('2026-08-28');
      expect(getSettlementDate('2026-08-28', 'TW', 'WITHDRAWAL')).toBe('2026-08-28');
      expect(getSettlementDate('2026-08-28', 'TW', 'LOAN_REPAYMENT')).toBe('2026-08-28');
    });
  });

  describe('各項利息收入聚合 Helper (aggregateInterestIncomeDetails)', () => {
    const mockInterestTx: CashTransaction[] = [
      {
        id: 'int-1',
        accountId: 'broker-schwab',
        currency: 'USD',
        type: 'INTEREST_INCOME',
        amount: 15.2,
        date: '2026-08-01',
        note: '嘉信活存利息',
        createdAt: 1,
      },
      {
        id: 'int-2',
        accountId: 'broker-schwab',
        currency: 'USD',
        type: 'INTEREST_INCOME',
        amount: 8.5,
        date: '2026-08-15',
        note: '借券利息',
        createdAt: 2,
      },
      {
        id: 'int-3',
        accountId: 'broker-schwab',
        currency: 'USD',
        type: 'INTEREST_INCOME',
        amount: 5.0,
        date: '2026-08-20',
        note: '嘉信活存利息', // 應與 int-1 聚合
        createdAt: 3,
      },
      {
        id: 'int-4',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'INTEREST_INCOME',
        amount: 500,
        date: '2026-08-10',
        note: '台幣證券戶活存息',
        createdAt: 4,
      },
      {
        id: 'int-5',
        accountId: 'broker-cathay',
        currency: 'TWD',
        type: 'INTEREST_INCOME',
        amount: 300,
        date: '2026-08-12',
        // note 為空，應歸類為「利息收入」
        createdAt: 5,
      },
    ];

    it('在美股 (US) 模式下應僅聚合美元利息，並將帶有全形逗號、破折號與明細的同類利息智能歸一化為單一膠囊', () => {
      const complexMonthlyInterestTx: CashTransaction[] = [
        {
          id: 'int-m1',
          accountId: 'broker-schwab',
          currency: 'USD',
          type: 'INTEREST_INCOME',
          amount: 0.31,
          date: '2026-05-29',
          note: 'Schwab 嘉信理財-現金利息，利息 0.31 - 預扣 0.09 +$0.31 USD',
          createdAt: 10,
        },
        {
          id: 'int-m2',
          accountId: 'broker-schwab',
          currency: 'USD',
          type: 'INTEREST_INCOME',
          amount: 0.27,
          date: '2026-06-28',
          note: 'Schwab 嘉信理財-現金利息 (5/29–6/28)，利息 0.27 - 預扣 0.08 +$0.27 USD',
          createdAt: 20,
        },
        {
          id: 'int-m3',
          accountId: 'broker-schwab',
          currency: 'USD',
          type: 'INTEREST_INCOME',
          amount: 0.27,
          date: '2026-07-25',
          note: 'Schwab 嘉信理財-現金利息 (10/30–11/25) · 利息 0.27 - 預扣 0.08 +$0.27 USD',
          createdAt: 30,
        },
        {
          id: 'int-m4',
          accountId: 'broker-schwab',
          currency: 'USD',
          type: 'INTEREST_INCOME',
          amount: 0.15,
          date: '2026-08-27',
          note: 'Schwab 嘉信理財-現金利息，利息 0.15 - 預扣 0.04 +$0.15 USD',
          createdAt: 40,
        },
        {
          id: 'tax-int-1',
          accountId: 'broker-schwab',
          currency: 'USD',
          type: 'TAX',
          amount: -0.04,
          date: '2026-08-27',
          note: 'Schwab 現金利息預扣 (7/26~8/27)',
          createdAt: 41,
        },
        {
          id: 'tax-int-2',
          accountId: 'broker-schwab',
          currency: 'USD',
          type: 'TAX',
          amount: -0.25,
          date: '2026-07-25',
          note: '嘉信 利息預扣稅',
          createdAt: 42,
        },
      ];

      const res = aggregateInterestIncomeDetails(complexMonthlyInterestTx, 'US', 32.0);
      expect(res.totalInterestAmount).toBeCloseTo(1.00, 2); // 0.31 + 0.27 + 0.27 + 0.15
      expect(res.totalInterestTaxUSD).toBeCloseTo(0.29, 2); // 0.04 + 0.25
      // 應歸一化為單一筆 Schwab 嘉信理財-現金利息 膠囊
      expect(res.interestItems).toHaveLength(1);
      expect(res.interestItems[0].name).toBe('Schwab 嘉信理財-現金利息');
      expect(res.interestItems[0].amount).toBeCloseTo(1.00, 2);
    });

    it('在台股 (TW) 模式下應僅聚合台幣利息並統計台幣利息預扣稅', () => {
      const res = aggregateInterestIncomeDetails(mockInterestTx, 'TW', 32.0);
      expect(res.totalInterestAmount).toBe(800); // 500 + 300
      expect(res.totalInterestTaxTWD).toBe(0);
      expect(res.interestItems).toHaveLength(2);
      expect(res.interestItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: '台幣證券戶活存息',
            amount: 500,
            currency: 'TWD',
          }),
          expect.objectContaining({
            name: '利息收入',
            amount: 300,
            currency: 'TWD',
          }),
        ])
      );
    });

    it('在全部 (ALL) 模式下應聚合所有幣別並折算台幣總額', () => {
      const res = aggregateInterestIncomeDetails(mockInterestTx, 'ALL', 32.0);
      // USD = 28.7 * 32 = 918.4 TWD, TWD = 800 TWD ➔ total = 1718.4
      expect(res.totalInterestInTWD).toBeCloseTo(1718.4, 2);
      expect(res.interestItems).toHaveLength(4);
    });
  });

  describe('Ticket #001: 融資買進 (MARGIN_BUY) 40% 自備款扣款與連動', () => {
    it('當交易為 MARGIN_BUY 時，自動生成的現金扣款流水金額應為自備款 (40%) 加手續費', () => {
      const trades: TradeRecord[] = [
        {
          id: 'trade-margin-1',
          date: '2026-08-20',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          type: 'MARGIN_BUY',
          shares: 1000,
          price: 1000, // 總價款 1,000,000
          fee: 1425,
          tax: 0,
          accountId: 'broker-tw-default',
          createdAt: 100,
        },
      ];

      const res = syncTradesWithCashTransactions(trades, []);
      expect(res).toHaveLength(1);
      const tx = res[0];
      // 40% 自備款 = 400,000 + 手續費 1,425 = 401,425
      expect(tx.amount).toBe(-401425);
      expect(tx.category).toBe('STOCK_BUY');
      expect(tx.note).toContain('融資買進');
      expect(tx.note).toContain('自備款 40%');
    });

    it('當交易設定自訂 marginRate (例如 0.5) 時，應依自訂自備款比率扣款', () => {
      const trades: TradeRecord[] = [
        {
          id: 'trade-margin-2',
          date: '2026-08-20',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          isMargin: true,
          marginRate: 0.5,
          shares: 1000,
          price: 1000, // 總價款 1,000,000
          fee: 1000,
          tax: 0,
          accountId: 'broker-tw-default',
          createdAt: 101,
        },
      ];

      const res = syncTradesWithCashTransactions(trades, []);
      expect(res).toHaveLength(1);
      const tx = res[0];
      // 50% 自備款 = 500,000 + 手續費 1,000 = 501,000
      expect(tx.amount).toBe(-501000);
      expect(tx.note).toContain('融資買進');
      expect(tx.note).toContain('自備款 50%');
    });
  });

  describe('Ticket #009: 質押借款每月定期實扣利息現金流水自動生成與對帳', () => {
    it('應能依據質押借款本金與年利率，自動推算每月定期利息扣款現金流水 (FINANCING_FEE)', () => {
      const loan: LoanRecord = {
        id: 'loan-sample-1',
        name: '富邦質押借款',
        loanType: 'PLEDGE',
        currency: 'TWD',
        principal: 1000000, // 本金 100 萬
        annualInterestRate: 2.5, // 年利率 2.5% ➔ 每月利息約 2,083 元
        startDate: '2026-06-01',
        createdAt: 100,
      };

      const asOfDate = '2026-08-25'; // 歷經 6月、7月、8月
      const interestFlows = generateMonthlyLoanInterestTransactions([loan], asOfDate);

      // 6月20日、7月20日、8月20日共 3 筆利息扣款
      expect(interestFlows.length).toBeGreaterThanOrEqual(2);
      const first = interestFlows[0];
      expect(first.category).toBe('FINANCING_FEE');
      expect(first.amount).toBeCloseTo(-2083, -1); // 約 -2083
      expect(first.note).toContain('質押借款月利息');
    });
  });

  describe('Ticket #003, #004, #011: 現金帳本進階對帳與防重複入帳驗證', () => {
    it('Ticket #004: 手動出入金建立時若無 relatedTradeId，應維持獨立外部金流屬性不與股票交割混淆', () => {
      const manualTx: CashTransaction[] = [
        {
          id: 'manual-dep-1',
          accountId: 'broker-tw-default',
          currency: 'TWD',
          type: 'DEPOSIT',
          category: 'DEPOSIT',
          amount: 100000,
          date: '2026-08-01',
          createdAt: 1,
        },
      ];

      const summary = calculateAccountBalances(mockAccounts, manualTx);
      expect(summary.totalTWD).toBe(100000);
      expect(summary.byAccount['broker-tw-default'].balance).toBe(100000);
    });

    it('Ticket #011: 質押借款撥款 (LOAN_DISBURSEMENT) 應正確計入可用現金並標註來源合約', () => {
      const loanTx: CashTransaction[] = [
        {
          id: 'tx-loan-disburse',
          accountId: 'broker-tw-default',
          currency: 'TWD',
          type: 'LOAN_DISBURSEMENT',
          category: 'LOAN_DISBURSEMENT',
          amount: 500000,
          date: '2026-08-01',
          relatedLoanId: 'loan-1',
          note: '股票質押撥款入帳',
          createdAt: 1,
        },
      ];

      const summary = calculateAccountBalances(mockAccounts, loanTx);
      expect(summary.totalTWD).toBe(500000);
      expect(summary.byAccount['broker-tw-default'].balance).toBe(500000);
    });

    it('PRD #0052 (Ticket 003): 智慧補登之現金股利若帶有未到期 payDate，應在現金帳本中嚴格標記為 PENDING 在途，不提前計入實質可用現金', () => {
      const todayStr = '2026-08-20';
      const autoTrade: TradeRecord = {
        id: 'auto-ca-2330-div',
        date: '2026-08-15', // 除息基準日
        exDate: '2026-08-15',
        payDate: '2026-09-10', // 預估發放日 (未來日期)
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        accountId: 'broker-tw-default',
        shares: 1000,
        price: 4.0,
        fee: 0,
        tax: 0,
        createdAt: 1,
      };

      const synced = syncTradesWithCashTransactions([autoTrade], [], todayStr);
      expect(synced).toHaveLength(1);
      const divTx = synced[0];
      expect(divTx.category).toBe('DIVIDEND_PAYOUT');
      expect(divTx.amount).toBe(4000);
      expect(divTx.settlementDate).toBe('2026-09-10'); // 嚴格綁定 payDate
      expect(divTx.settlementStatus).toBe('PENDING'); // 因 todayStr (2026-08-20) < payDate (2026-09-10)

      // 驗證可用結算現金餘額 (balance) 不會提前虛增，並計入 pendingReceivables
      const summary = calculateAccountBalances(mockAccounts, synced, 32.0, todayStr);
      expect(summary.byAccount['broker-tw-default'].balance).toBe(0);
      expect(summary.byAccount['broker-tw-default'].pendingReceivables).toBe(4000);

      // 當時間推進至 2026-09-10 (發放日當天)
      const syncedOnPayDay = syncTradesWithCashTransactions([autoTrade], [], '2026-09-10');
      expect(syncedOnPayDay[0].settlementStatus).toBe('SETTLED');
      const summaryOnPayDay = calculateAccountBalances(mockAccounts, syncedOnPayDay, 32.0, '2026-09-10');
      expect(summaryOnPayDay.byAccount['broker-tw-default'].balance).toBe(4000);
      expect(summaryOnPayDay.byAccount['broker-tw-default'].pendingReceivables).toBe(0);
    });

    it('真實場景：2890 永豐金股息 34,100 元扣除二代健保 850 元 (實收 33,250 元)，現金帳本自動連動應精準產生 +NT$ 33,250 流水', () => {
      const todayStr = '2026-08-28';
      const sinoTrade: TradeRecord = {
        id: 'auto-ca-2890-div',
        date: '2026-07-23',
        exDate: '2026-07-23',
        payDate: '2026-08-20',
        symbol: '2890',
        name: '永豐金',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        accountId: 'broker-tw-default',
        shares: 31000,
        price: 1.1,
        tax: 850, // 二代健保
        cashAmount: 33250, // 實收金額
        fee: 0,
        createdAt: 1,
      };

      const synced = syncTradesWithCashTransactions([sinoTrade], [], todayStr);
      expect(synced).toHaveLength(1);
      const divTx = synced[0];
      expect(divTx.category).toBe('DIVIDEND_PAYOUT');
      expect(divTx.amount).toBe(33250); // 實收淨額 33,250 元
      expect(divTx.settlementDate).toBe('2026-08-20');
      expect(divTx.settlementStatus).toBe('SETTLED'); // 2026-08-28 > 2026-08-20

      const summary = calculateAccountBalances(mockAccounts, synced, 32.0, todayStr);
      expect(summary.byAccount['broker-tw-default'].balance).toBe(33250);
      expect(summary.byAccount['broker-tw-default'].totalDividends).toBe(33250);
    });

    it('真實場景：2890 永豐金股息交易未手動設定 tax 與 cashAmount (tax=0)，現金帳本自動連動應自動比對配股扣除 850 健保，精準產生 +NT$ 33,250 流水', () => {
      const todayStr = '2026-08-28';
      const trades: TradeRecord[] = [
        {
          id: 'auto-ca-2890-div-notax',
          date: '2026-07-23',
          exDate: '2026-07-23',
          payDate: '2026-08-20',
          symbol: '2890',
          name: '永豐金',
          market: 'TW',
          currency: 'TWD',
          type: 'DIVIDEND',
          accountId: 'broker-tw-default',
          shares: 31000,
          price: 1.1,
          tax: 0, // 未手動填寫
          fee: 0,
          createdAt: 1,
        },
        {
          id: 'auto-ca-2890-stock-div',
          date: '2026-07-23',
          symbol: '2890',
          name: '永豐金',
          market: 'TW',
          currency: 'TWD',
          type: 'STOCK_DIVIDEND',
          accountId: 'broker-tw-default',
          shares: 620,
          price: 0,
          fee: 0,
          tax: 0,
          createdAt: 2,
        },
      ];

      const synced = syncTradesWithCashTransactions(trades, [], todayStr);
      const divTx = synced.find((tx) => tx.relatedTradeId === 'auto-ca-2890-div-notax');
      expect(divTx).toBeDefined();
      expect(divTx!.category).toBe('DIVIDEND_PAYOUT');
      // 應自動合併配股面額扣除 850 元二代健保，實收 33,250 元
      expect(divTx!.amount).toBe(33250);
      expect(divTx!.settlementDate).toBe('2026-08-20');
      expect(divTx!.settlementStatus).toBe('SETTLED');
    });
  });
});






