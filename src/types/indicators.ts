import { MarketType } from './stock';

export type BoxStatus = 'BREAKOUT_UP' | 'BREAKOUT_DOWN' | 'INSIDE_BOX';
export type RelativeStrengthRank = 'EXTREME_STRONG' | 'STRONG' | 'NEUTRAL' | 'WEAK';
export type TrendSlope = 'UP' | 'FLAT' | 'DOWN';

export interface DailyCandle {
  date: string;       // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose?: number;
  volume: number;
  // 台股籌碼選填擴充欄位
  foreignNetBuy?: number;   // 外資買賣超張數
  trustNetBuy?: number;     // 投信買賣超張數
  dealerNetBuy?: number;    // 自營商買賣超張數
  dayTradingVolume?: number;// 當沖成交量
}

export interface MuscleBookerIndicatorPoint {
  date: string;
  close: number;
  // 1. 移動平均線系統
  ma: {
    ma5?: number;
    ma10?: number;
    ma20?: number;
    ma60?: number;
  };
  // 2. 肌肉書僮：均線扣抵望遠鏡
  maDeduction: {
    ma5DeductionPrice?: number;
    ma20DeductionPrice?: number;
    ma20Slope: TrendSlope;
    isBottomPenetrationRebound: boolean; // 「底穿上」假跌破強勢反轉
  };
  // 3. 肌肉書僮：箱子戰術（三日法則）
  box: {
    boxUpper?: number;
    boxLower?: number;
    boxStatus: BoxStatus;
    boxWidthPercent?: number;
  };
  // 4. 肌肉書僮：布林通道與極致壓縮
  bbands: {
    upper: number;
    mid: number;
    lower: number;
    bandwidth: number;      // 帶寬 (Upper - Lower) / Mid * 100%
    isSqueeze: boolean;     // 帶寬 <= 8% 或近期極低點
  };
  // 5. 肌肉書僮：ATR 動態移動防守
  atr: {
    atr14: number;
    trailingDefensePrice: number; // 滾動波段高點 - 2.5 * ATR14
  };
  // 6. 肌肉書僮：RS 相對強度
  momentum: {
    rs10Score: number;
    rsRank: RelativeStrengthRank;
  };
  // 7. 肌肉書僮：籌碼質量 (投量比)
  chips?: {
    trustToNetVolumeRatio?: number; // 投量比 %
  };
}

export interface SymbolOhlcvStore {
  symbol: string;
  market: MarketType;
  candles: DailyCandle[];
  updatedAt: number;
}

export interface SymbolIndicatorsStore {
  symbol: string;
  market: MarketType;
  points: MuscleBookerIndicatorPoint[];
  updatedAt: number;
}
