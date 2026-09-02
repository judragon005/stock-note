import { MarketType } from '../types/stock';

export type BrokerTemplateId =
  | 'STANDARD'
  | 'CATHAY'
  | 'FUBON'
  | 'SINOPAC'
  | 'YUANTA'
  | 'FIRSTRADE'
  | 'SCHWAB'
  | 'IBKR'
  | 'CUSTOM';

export interface ColumnMappingConfig {
  date: string;
  symbol: string;
  name?: string;
  type: string;
  shares: string;
  price: string;
  fee?: string;
  tax?: string;
  market?: string;
  currency?: string;
  note?: string;
  exDate?: string;
  ratio?: string;
  cashAmount?: string;
}

export interface BrokerTemplate {
  id: BrokerTemplateId;
  name: string;
  defaultMarket: MarketType;
  description: string;
  mapping: ColumnMappingConfig;
  fingerprintKeywords: string[];
}

export const BUILTIN_BROKER_TEMPLATES: Record<BrokerTemplateId, BrokerTemplate> = {
  CATHAY: {
    id: 'CATHAY',
    name: '國泰證券',
    defaultMarket: 'TW',
    description: '國泰證券匯出之歷史成交明細對帳單',
    fingerprintKeywords: ['成交日期', '委託書號', '股票代號', '股票名稱', '買賣別', '成交股數', '成交單價'],
    mapping: {
      date: '成交日期',
      symbol: '股票代號',
      name: '股票名稱',
      type: '買賣別',
      shares: '成交股數',
      price: '成交單價',
      fee: '手續費',
      tax: '交易稅',
    },
  },
  SINOPAC: {
    id: 'SINOPAC',
    name: '永豐大戶投',
    defaultMarket: 'TW',
    description: '永豐金證券 / 大戶投匯出之成交紀錄',
    fingerprintKeywords: ['委託日期', '商品代碼', '商品名稱', '買賣別', '成交股數', '成交價'],
    mapping: {
      date: '委託日期',
      symbol: '商品代碼',
      name: '商品名稱',
      type: '買賣別',
      shares: '成交股數',
      price: '成交價',
      fee: '手續費',
      tax: '交易稅',
    },
  },
  FUBON: {
    id: 'FUBON',
    name: '富邦證券',
    defaultMarket: 'TW',
    description: '富邦證券匯出之歷史成交明細',
    fingerprintKeywords: ['成交日期', '股票代碼', '股票名稱', '成交數量', '成交價格', '證交稅'],
    mapping: {
      date: '成交日期',
      symbol: '股票代碼',
      name: '股票名稱',
      type: '買賣',
      shares: '成交數量',
      price: '成交價格',
      fee: '手續費',
      tax: '證交稅',
      market: '市場',
    },
  },
  YUANTA: {
    id: 'YUANTA',
    name: '元大證券',
    defaultMarket: 'TW',
    description: '元大證券匯出之對帳與成交明細',
    fingerprintKeywords: ['日期', '股號', '股名', '交易別', '股數', '單價', '稅金'],
    mapping: {
      date: '日期',
      symbol: '股號',
      name: '股名',
      type: '交易別',
      shares: '股數',
      price: '單價',
      fee: '手續費',
      tax: '稅金',
    },
  },
  FIRSTRADE: {
    id: 'FIRSTRADE',
    name: 'Firstrade (第一證券)',
    defaultMarket: 'US',
    description: 'Firstrade 歷史交易匯出檔 (TradeDate, Symbol, Action)',
    fingerprintKeywords: ['tradedate', 'symbol', 'action', 'quantity', 'price'],
    mapping: {
      date: 'tradedate',
      symbol: 'symbol',
      type: 'action',
      shares: 'quantity',
      price: 'price',
      fee: 'fee',
      note: 'amount',
    },
  },
  SCHWAB: {
    id: 'SCHWAB',
    name: 'Charles Schwab (嘉信)',
    defaultMarket: 'US',
    description: 'Charles Schwab / TD Ameritrade 匯出紀錄',
    fingerprintKeywords: ['date', 'action', 'symbol', 'description', 'fees & comm'],
    mapping: {
      date: 'date',
      symbol: 'symbol',
      name: 'description',
      type: 'action',
      shares: 'quantity',
      price: 'price',
      fee: 'fees & comm',
      note: 'amount',
    },
  },
  IBKR: {
    id: 'IBKR',
    name: 'Interactive Brokers (IB)',
    defaultMarket: 'US',
    description: 'Interactive Brokers 盈透證券成交報告',
    fingerprintKeywords: ['date/time', 'symbol', 'quantity', 't. price', 'comm/fee'],
    mapping: {
      date: 'date/time',
      symbol: 'symbol',
      shares: 'quantity',
      price: 't. price',
      fee: 'comm/fee',
      type: 'symbol', // 若無獨立 action 欄位由符號推斷
    },
  },
  STANDARD: {
    id: 'STANDARD',
    name: '系統標準格式 (Standard CSV)',
    defaultMarket: 'TW',
    description: '本系統標準導出或通用格式 CSV',
    fingerprintKeywords: ['日期', '市場', '代碼', '名稱', '類別', '股數', '單價'],
    mapping: {
      date: '日期',
      symbol: '代碼',
      name: '名稱',
      type: '類別',
      shares: '股數',
      price: '單價',
      fee: '手續費',
      tax: '稅費',
      market: '市場',
      currency: '幣別',
      note: '備註',
    },
  },
  CUSTOM: {
    id: 'CUSTOM',
    name: '自訂映射範本',
    defaultMarket: 'TW',
    description: '使用者自訂欄位映射規則',
    fingerprintKeywords: [],
    mapping: {
      date: '',
      symbol: '',
      type: '',
      shares: '',
      price: '',
    },
  },
};

/**
 * 依據 CSV Header 欄位特徵自動推斷券商範本
 */
export function detectBrokerTemplate(headers: string[]): BrokerTemplate {
  if (!headers || headers.length === 0) {
    return BUILTIN_BROKER_TEMPLATES.STANDARD;
  }

  const cleanHeaders = headers.map((h) => h.trim().toLowerCase());
  let bestTemplate: BrokerTemplate = BUILTIN_BROKER_TEMPLATES.STANDARD;
  let maxScore = 0;

  const candidates: BrokerTemplateId[] = [
    'CATHAY',
    'SINOPAC',
    'FUBON',
    'YUANTA',
    'FIRSTRADE',
    'SCHWAB',
    'IBKR',
    'STANDARD',
  ];

  for (const tid of candidates) {
    const tpl = BUILTIN_BROKER_TEMPLATES[tid];
    let score = 0;
    for (const kw of tpl.fingerprintKeywords) {
      const lowerKw = kw.toLowerCase();
      if (cleanHeaders.some((h) => h === lowerKw || h.includes(lowerKw))) {
        score++;
      }
    }
    // 需命中至少 3 個關鍵特徵或 50% 以上特徵
    const ratio = tpl.fingerprintKeywords.length > 0 ? score / tpl.fingerprintKeywords.length : 0;
    if (score >= 3 && ratio > 0.4 && score > maxScore) {
      maxScore = score;
      bestTemplate = tpl;
    }
  }

  return bestTemplate;
}
