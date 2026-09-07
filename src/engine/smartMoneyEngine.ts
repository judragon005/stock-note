import {
  MarketType,
  SmartMoneyQuadrant,
  SmartMoneyBubbleData,
  SmartMoneyInputItem,
  SmartMoneyFlowAnalysisResult,
  InstitutionalSynergyType,
} from '../types/stock';

/**
 * 數值夾止輔助函數
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * 計算美股 Chaikin Money Flow (CMF 佳慶資金流向指標)
 * 公式：
 * CLV = ((Close - Low) - (High - Close)) / (High - Low)
 * CMF = Sum(CLV * Volume, period) / Sum(Volume, period)
 * 數值範圍介於 -1.0 (極度出貨派發) ~ +1.0 (極度逢低吸籌)
 */
export function computeChaikinMoneyFlow(
  candles: { date: string; open: number; high: number; low: number; close: number; volume: number }[],
  period = 20
): number {
  if (!candles || candles.length === 0 || period <= 0) {
    return 0;
  }

  const targetSlice = candles.slice(-period);
  let totalMoneyFlowVolume = 0;
  let totalVolume = 0;

  for (const c of targetSlice) {
    const range = c.high - c.low;
    let clv = 0;
    if (range > 0) {
      clv = ((c.close - c.low) - (c.high - c.close)) / range;
    }
    const mfv = clv * (c.volume || 0);
    totalMoneyFlowVolume += mfv;
    totalVolume += (c.volume || 0);
  }

  if (totalVolume === 0) {
    return 0;
  }

  const cmf = totalMoneyFlowVolume / totalVolume;
  return Math.round(clamp(cmf, -1.0, 1.0) * 10000) / 10000;
}

/**
 * 零基礎小白友善診斷生成器
 * 將複雜的量化數據轉化為一眼即懂的四象限生活化標籤與大白話結論
 * 支援台股 (三大法人) 與 美股 (CMF 機構資金流) 雙市場語意完全隔離，徹底杜絕美股三大法人幻覺
 */
export function getBeginnerDiagnosis(
  quadrant: SmartMoneyQuadrant,
  symbol: string,
  name: string,
  changePercent: number,
  netFlowAmount: number,
  market?: MarketType,
  cmf?: number
): {
  quadrantLabel: string;
  diagnosisTitle: string;
  diagnosisDetail: string;
} {
  const displayName = name ? `${name} (${symbol})` : symbol;
  const changeFormatted = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`;

  // === 1. 美股 (US) 專屬診斷邏輯 (絕對阻斷任何「三大法人」字眼) ===
  if (market === 'US') {
    const cmfVal = cmf ?? 0;
    const cmfStr = `${cmfVal >= 0 ? '+' : ''}${cmfVal.toFixed(2)}`;

    // 中立平穩區間 (-0.15 <= CMF <= 0.15)
    if (Math.abs(cmfVal) <= 0.15) {
      return {
        quadrantLabel: '⚖️ 機構觀望/平衡區',
        diagnosisTitle: `${displayName} 股價微幅浮動，美股籌碼流向平衡`,
        diagnosisDetail: `股價今日變動 ${changeFormatted}，CMF 資金流為 ${cmfStr}，市場機構資金進出維持平衡，暫無顯著主力大單介入。`,
      };
    }

    switch (quadrant) {
      case 'BREAKOUT':
        return {
          quadrantLabel: '🔥 主力抬轎飆股區',
          diagnosisTitle: `${displayName} 美股大機構強烈做多中！`,
          diagnosisDetail: `股價今日變動 ${changeFormatted}，且美股機構資金顯著流入 (CMF: ${cmfStr})，大單推升動能充沛，屬於市場熱門強勢領先股。`,
        };
      case 'ACCUMULATION':
        return {
          quadrantLabel: '🛡️ 逢低撿便宜區',
          diagnosisTitle: `${displayName} 美股大機構悄悄逆勢吸籌！`,
          diagnosisDetail: `雖然價格處於震盪或回檔 (${changeFormatted})，但主力機構正逢低積極吸納 (CMF: ${cmfStr})，為潛在左側低接布局訊號。`,
        };
      case 'DISTRIBUTION':
        return {
          quadrantLabel: '⚠️ 割韭菜警戒區',
          diagnosisTitle: `小心！${displayName} 美股主力趁高倒貨！`,
          diagnosisDetail: `股價表面看似微揚或上漲 (${changeFormatted})，但機構資金卻呈現出貨派發 (CMF: ${cmfStr})，小心散戶成為高檔接刀對象。`,
        };
      case 'LIQUIDATION':
      default:
        return {
          quadrantLabel: '❄️ 冷凍提款區',
          diagnosisTitle: `${displayName} 美股大機構持續提款撤退！`,
          diagnosisDetail: `股價破位下跌 (${changeFormatted})，且機構資金同步大舉撤出 (CMF: ${cmfStr})，籌碼渙散，建議保持觀望切勿盲目接刀。`,
        };
    }
  }

  // === 2. 台股 (TW) 專屬診斷邏輯 ===
  // 法人零動作 / 0 張保護守門員
  if (Math.abs(netFlowAmount) === 0) {
    if (changePercent < 0) {
      return {
        quadrantLabel: '❄️ 散戶/量縮偏弱區',
        diagnosisTitle: `${displayName} 量縮回檔，三大法人未見大舉動作`,
        diagnosisDetail: `股價今日變動 ${changeFormatted}，三大法人買賣超為 0 張，主要受市場散戶與整體盤勢波動影響，並非大機構惡意倒貨。`,
      };
    } else {
      return {
        quadrantLabel: '⚖️ 散戶/自營主導區',
        diagnosisTitle: `${displayName} 股價微幅浮動，三大法人進出平緩`,
        diagnosisDetail: `股價今日變動 ${changeFormatted}，三大法人淨進出 0 張，籌碼暫無顯著機構大單介入。`,
      };
    }
  }

  switch (quadrant) {
    case 'BREAKOUT':
      return {
        quadrantLabel: '🔥 主力抬轎飆股區',
        diagnosisTitle: `${displayName} 大機構強烈做多中！`,
        diagnosisDetail: `股價今日變動 ${changeFormatted}，且大機構合力砸錢買進，資金推升動能充沛，屬於市場熱門多頭領先股。`,
      };
    case 'ACCUMULATION':
      return {
        quadrantLabel: '🛡️ 逢低撿便宜區',
        diagnosisTitle: `${displayName} 大機構悄悄逆勢吃貨！`,
        diagnosisDetail: `雖然價格處於震盪或回檔 (${changeFormatted})，但大機構正反向進場低吸吃貨，多為主力潛在左側布局訊號。`,
      };
    case 'DISTRIBUTION':
      return {
        quadrantLabel: '⚠️ 割韭菜警戒區',
        diagnosisTitle: `小心！${displayName} 大機構趁高倒貨！`,
        diagnosisDetail: `股價表面看似微揚或上漲 (${changeFormatted})，但大機構卻在逢高大賣退場，小心散戶成為高檔接刀對象。`,
      };
    case 'LIQUIDATION':
    default:
      return {
        quadrantLabel: '❄️ 冷凍提款區',
        diagnosisTitle: `${displayName} 大機構持續提款撤退！`,
        diagnosisDetail: `股價破位下跌 (${changeFormatted})，且大機構同步大舉撤出資金，籌碼渙散冷清，建議保持觀望切勿盲目接刀。`,
      };
  }
}

/**
 * 專業機構共振態識別引擎 (Institutional Synergy Detector)
 * 解決券商與經理人專業痛點：精準識別「土洋合買 🚀」與「土洋對作 ⚡」，杜絕代數相加抹平
 */
export function detectInstitutionalSynergy(
  foreignNet?: number,
  trustNet?: number
): { type: InstitutionalSynergyType; label: string; detail: string } {
  if (foreignNet === undefined || trustNet === undefined) {
    return { type: 'NEUTRAL', label: '三大法人進出平穩', detail: '法人籌碼未有顯著雙向動作。' };
  }

  const threshold = 100; // 顯著張數門檻
  const isForeignSignificantBuy = foreignNet >= threshold;
  const isForeignSignificantSell = foreignNet <= -threshold;
  const isTrustSignificantBuy = trustNet >= threshold;
  const isTrustSignificantSell = trustNet <= -threshold;

  if (isForeignSignificantBuy && isTrustSignificantBuy) {
    return {
      type: 'DUAL_BUY',
      label: '🚀 土洋合買抬轎',
      detail: `外資 (+${Math.round(foreignNet).toLocaleString()}張) 與投信 (+${Math.round(trustNet).toLocaleString()}張) 多頭強烈共振，籌碼鎖定力道強勁！`,
    };
  }

  if (isForeignSignificantSell && isTrustSignificantSell) {
    return {
      type: 'DUAL_SELL',
      label: '💣 土洋同步調節',
      detail: `外資 (${Math.round(foreignNet).toLocaleString()}張) 與投信 (${Math.round(trustNet).toLocaleString()}張) 雙向大舉提款，短線賣壓沉重！`,
    };
  }

  if ((isForeignSignificantBuy && isTrustSignificantSell) || (isForeignSignificantSell && isTrustSignificantBuy)) {
    const buySide = foreignNet > 0 ? `外資買超 ${Math.round(foreignNet).toLocaleString()}張` : `投信買超 ${Math.round(trustNet).toLocaleString()}張`;
    const sellSide = foreignNet < 0 ? `外資賣超 ${Math.round(Math.abs(foreignNet)).toLocaleString()}張` : `投信賣超 ${Math.round(Math.abs(trustNet)).toLocaleString()}張`;
    return {
      type: 'TUG_OF_WAR',
      label: '⚡ 土洋對作激戰',
      detail: `內外資多空嚴重分歧激烈換手！${buySide} vs ${sellSide}，盤面籌碼多空拉鋸，切勿因代數加總為零而忽視震盪。`,
    };
  }

  return {
    type: 'NEUTRAL',
    label: '三大法人進出平穩',
    detail: '外資與投信進出規模相對溫和或未形成顯著共振。',
  };
}

/**
 * 時序影格資料動態提取純函數 (Temporal Frame Data Extractor)
 * 解決照片 2 痛點：隨時間軸播放進度即時計算當日數值、漲跌幅、流向與生活化診斷
 */
export function getTemporalBubbleFrameData(
  bubble: SmartMoneyBubbleData,
  dateIndex: number,
  dateStr?: string
): {
  date: string;
  changePercent: number;
  flowScore: number;
  quadrant: SmartMoneyQuadrant;
  quadrantLabel: string;
  diagnosisTitle: string;
  diagnosisDetail: string;
  flowDescription: string;
  synergyLabel?: string;
  foreignNetShares?: number;
  trustNetShares?: number;
  dealerNetShares?: number;
  cmf?: number;
} {
  const trailPoint = bubble.trail && bubble.trail.length > dateIndex ? bubble.trail[dateIndex] : null;

  const currentChange = trailPoint?.changePercent !== undefined ? trailPoint.changePercent : bubble.changePercent;
  const currentFlow = trailPoint?.flowScore !== undefined ? trailPoint.flowScore : bubble.flowScore;
  const currentDate = trailPoint?.date || dateStr || `第 ${dateIndex + 1} 交易日`;

  const currentForeign = trailPoint?.foreignNetShares !== undefined ? trailPoint.foreignNetShares : bubble.foreignNetShares;
  const currentTrust = trailPoint?.trustNetShares !== undefined ? trailPoint.trustNetShares : bubble.trustNetShares;
  const currentDealer = trailPoint?.dealerNetShares !== undefined ? trailPoint.dealerNetShares : bubble.dealerNetShares;
  const currentCmf = trailPoint?.cmf !== undefined ? trailPoint.cmf : bubble.cmf;
  const currentNetFlow = trailPoint?.netFlowAmount !== undefined ? trailPoint.netFlowAmount : bubble.netFlowAmount;

  // 依據當日動能與流向動態判斷當日象限
  let quadrant: SmartMoneyQuadrant;
  if (currentChange >= 0 && currentFlow >= 0) {
    quadrant = 'BREAKOUT';
  } else if (currentChange < 0 && currentFlow > 0) {
    quadrant = 'ACCUMULATION';
  } else if (currentChange >= 0 && currentFlow < 0) {
    quadrant = 'DISTRIBUTION';
  } else {
    quadrant = 'LIQUIDATION';
  }

  const diag = getBeginnerDiagnosis(
    quadrant,
    bubble.symbol,
    bubble.name,
    currentChange,
    currentNetFlow,
    bubble.market,
    currentCmf
  );

  return {
    date: currentDate,
    changePercent: currentChange,
    flowScore: currentFlow,
    quadrant,
    quadrantLabel: diag.quadrantLabel,
    diagnosisTitle: diag.diagnosisTitle,
    diagnosisDetail: diag.diagnosisDetail,
    flowDescription: bubble.flowDescription,
    synergyLabel: bubble.synergyLabel,
    foreignNetShares: currentForeign,
    trustNetShares: currentTrust,
    dealerNetShares: currentDealer,
    cmf: currentCmf,
  };
}

/**
 * 核心計算引擎：將標的日行情與法人/機構數據換算為四象限動態泡泡圖模型
 */
export function calculateSmartMoneyFlowDynamics(
  items: SmartMoneyInputItem[]
): SmartMoneyFlowAnalysisResult {
  if (!items || items.length === 0) {
    return {
      bubbles: [],
      overallSentiment: 'NEUTRAL',
      breakoutCount: 0,
      accumulationCount: 0,
      distributionCount: 0,
      liquidationCount: 0,
      summaryText: '目前尚無可分析之標的籌碼資料。',
    };
  }

  // 1. 尋找持倉市值或成交量的最大值，以進行泡泡半徑自適應縮放
  const maxVal = Math.max(
    ...items.map((i) => Math.max(i.holdingValueTwd || 0, (i.volume || 0) * (i.currentPrice || 1))),
    1
  );

  // 1.1 計算全清單之最大買賣超張數與最大漲跌幅，作為自適應縮放之基準
  let maxAbsShares = 0;
  let maxAbsChange = 0;
  for (const item of items) {
    if (item.market === 'TW') {
      const fn = (item.foreignBuyShares || 0) - (item.foreignSellShares || 0);
      const tn = (item.trustBuyShares || 0) - (item.trustSellShares || 0);
      const dn = (item.dealerBuyShares || 0) - (item.dealerSellShares || 0);
      const net = Math.abs(fn + tn + dn);
      if (net > maxAbsShares) maxAbsShares = net;
    }
    const absChg = Math.abs(item.changePercent || 0);
    if (absChg > maxAbsChange) maxAbsChange = absChg;
  }
  // 設定最低基準值，避免除以極小數字
  maxAbsShares = Math.max(maxAbsShares, 2500);
  maxAbsChange = Math.max(maxAbsChange, 3.0);

  let breakoutCount = 0;
  let accumulationCount = 0;
  let distributionCount = 0;
  let liquidationCount = 0;

  const bubbles: SmartMoneyBubbleData[] = items.map((item) => {
    let flowScore = 0;
    let netFlowAmount = 0;
    let flowDescription = '';
    let foreignNet: number | undefined;
    let trustNet: number | undefined;
    let dealerNet: number | undefined;
    let cmfValue: number | undefined;
    let synergy = { type: 'NEUTRAL' as InstitutionalSynergyType, label: '三大法人進出平穩', detail: '' };

    if (item.market === 'TW') {
      foreignNet = (item.foreignBuyShares || 0) - (item.foreignSellShares || 0);
      trustNet = (item.trustBuyShares || 0) - (item.trustSellShares || 0);
      dealerNet = (item.dealerBuyShares || 0) - (item.dealerSellShares || 0);
      const totalNetShares = foreignNet + trustNet + dealerNet;

      // 專業機構共振態識別 (土洋合買 / 土洋對作激戰 / 土洋齊賣)
      synergy = detectInstitutionalSynergy(foreignNet, trustNet);

      // 台股以 1000 股為 1 張，計算概略淨流向金額
      netFlowAmount = totalNetShares * 1000 * item.currentPrice;

      // 自適應冪次縮放評分 (以 0.65 次方平滑壓縮，防止極端量能打滿截斷)
      const flowRatio = Math.min(1.0, Math.abs(totalNetShares) / maxAbsShares);
      flowScore = Math.sign(totalNetShares) * Math.pow(flowRatio, 0.65);

      // 生成台股白話流向說明 (優先呈現土洋共振態)
      if (synergy.type === 'TUG_OF_WAR') {
        flowDescription = `土洋對作換手：外資${foreignNet >= 0 ? '買' : '賣'}${Math.round(Math.abs(foreignNet)).toLocaleString()}張 vs 投信${trustNet >= 0 ? '買' : '賣'}${Math.round(Math.abs(trustNet)).toLocaleString()}張`;
      } else if (foreignNet > 0 && trustNet > 0) {
        flowDescription = `外資與投信合買 ${Math.round(foreignNet + trustNet).toLocaleString()} 張`;
      } else if (foreignNet < 0 && trustNet < 0) {
        flowDescription = `外資與投信同步賣超 ${Math.round(Math.abs(foreignNet + trustNet)).toLocaleString()} 張`;
      } else if (foreignNet > 0) {
        flowDescription = `外資單日買超 ${Math.round(foreignNet).toLocaleString()} 張`;
      } else if (trustNet > 0) {
        flowDescription = `投信積極加碼 ${Math.round(trustNet).toLocaleString()} 張`;
      } else if (foreignNet < 0) {
        flowDescription = `外資賣超 ${Math.round(Math.abs(foreignNet)).toLocaleString()} 張`;
      } else if (trustNet < 0) {
        flowDescription = `投信調節 ${Math.round(Math.abs(trustNet)).toLocaleString()} 張`;
      } else if (totalNetShares > 0) {
        flowDescription = `三大法人合計淨買超 ${Math.round(totalNetShares).toLocaleString()} 張`;
      } else if (totalNetShares < 0) {
        flowDescription = `三大法人合計淨賣超 ${Math.round(Math.abs(totalNetShares)).toLocaleString()} 張`;
      } else {
        flowDescription = '三大法人進出平衡 (0 張)';
      }
    } else {
      // 美股模式：計算 CMF
      if (item.candles && item.candles.length > 0) {
        cmfValue = computeChaikinMoneyFlow(item.candles, 20);
      } else {
        cmfValue = 0;
      }

      flowScore = clamp(cmfValue, -1.0, 1.0);
      netFlowAmount = flowScore * (item.volume || 100000) * item.currentPrice;

      if (flowScore > 0.15) {
        flowDescription = `美股 CMF 機構吸籌流向 (+${(flowScore * 100).toFixed(0)}%)`;
      } else if (flowScore < -0.15) {
        flowDescription = `美股 CMF 主力派發出貨 (${(flowScore * 100).toFixed(0)}%)`;
      } else {
        flowDescription = '美股資金流向中立平穩';
      }
    }

    // 2. 自適應坐標映射 (安全限制在 [-75, +75] 之間，為四個邊界保留至少 25% 安全緩衝區，杜絕貼壁)
    // X 軸：漲跌幅自適應動態壓縮
    const changeRatio = Math.min(1.0, Math.abs(item.changePercent) / maxAbsChange);
    const x = Math.round(clamp(Math.sign(item.changePercent) * Math.pow(changeRatio, 0.7) * 75, -75, 75) * 10) / 10;

    // Y 軸：聰明錢強度評分自適應壓縮
    const y = Math.round(clamp(Math.sign(flowScore) * Math.pow(Math.abs(flowScore), 0.7) * 75, -75, 75) * 10) / 10;

    // 3. 判定象限 (以 0 為中軸)
    let quadrant: SmartMoneyQuadrant;
    if (x >= 0 && y >= 0) {
      quadrant = 'BREAKOUT';
      breakoutCount++;
    } else if (x < 0 && y > 0) {
      quadrant = 'ACCUMULATION';
      accumulationCount++;
    } else if (x >= 0 && y < 0) {
      quadrant = 'DISTRIBUTION';
      distributionCount++;
    } else {
      quadrant = 'LIQUIDATION';
      liquidationCount++;
    }

    // 4. 生成小白友善診斷
    const diag = getBeginnerDiagnosis(
      quadrant,
      item.symbol,
      item.name,
      item.changePercent,
      netFlowAmount,
      item.market,
      cmfValue
    );

    // 5. 泡泡半徑自適應縮放 (收斂在 16px ~ 36px，消滅大球吞小球)
    const weightVal = Math.max(item.holdingValueTwd || 0, (item.volume || 0) * (item.currentPrice || 1));
    const radiusRatio = Math.sqrt(Math.max(0, weightVal) / maxVal);
    const radius = Math.round(16 + radiusRatio * 20);

    // 6. 歷史軌跡 (Trails) 轉換
    const trail = (item.historicalDailyFlows || []).map((h) => ({
      date: h.date,
      changePercent: h.changePercent,
      flowScore: h.flowScore,
      x: Math.round(clamp((h.changePercent / maxAbsChange) * 75, -75, 75) * 10) / 10,
      y: Math.round(clamp(h.flowScore * 75, -75, 75) * 10) / 10,
      foreignNetShares: h.foreignNetShares,
      trustNetShares: h.trustNetShares,
      dealerNetShares: h.dealerNetShares,
      cmf: h.cmf,
      netFlowAmount: h.netFlowAmount,
    }));

    return {
      symbol: item.symbol,
      name: item.name,
      market: item.market,
      x,
      y,
      radius,
      changePercent: item.changePercent,
      netFlowAmount,
      flowScore,
      flowDescription,
      quadrant,
      quadrantLabel: diag.quadrantLabel,
      diagnosisTitle: diag.diagnosisTitle,
      diagnosisDetail: diag.diagnosisDetail,
      foreignNetShares: foreignNet,
      trustNetShares: trustNet,
      dealerNetShares: dealerNet,
      cmf: cmfValue,
      institutionalSynergy: synergy.type,
      synergyLabel: synergy.label,
      trail,
    };
  });

  // 整體多空氛圍評估
  let overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (breakoutCount + accumulationCount > distributionCount + liquidationCount) {
    overallSentiment = 'BULLISH';
  } else if (distributionCount + liquidationCount > breakoutCount + accumulationCount) {
    overallSentiment = 'BEARISH';
  }

  const summaryText = `在庫共有 ${bubbles.length} 檔標的：${breakoutCount} 檔處於主力強推區、${accumulationCount} 檔逢低吸籌中、${distributionCount} 檔留意主力倒貨、${liquidationCount} 檔處於資金提款區。`;

  return {
    bubbles,
    overallSentiment,
    breakoutCount,
    accumulationCount,
    distributionCount,
    liquidationCount,
    summaryText,
  };
}

/**
 * 2D 圓形防碰撞排斥純函數演算法 (Relaxation Iteration Engine)
 * 在指定畫布寬高內，透過 8 輪物理放鬆迭代將重疊的圓形推開，
 * 同時具備「正交垂直微擾動」以消除水平一字排開現象，
 * 並配備「象限守恆守門員」，確保推擠時絕不跨越中軸 (X=0, Y=0) 改變多空性質，
 * 並嚴格限制在畫布邊界安全區內。
 */
export function resolveBubbleCollisions<T extends { x: number; y: number; radius: number }>(
  bubbles: T[],
  width: number,
  height: number,
  padding: number
): (T & { cx: number; cy: number })[] {
  if (!bubbles || bubbles.length === 0) return [];

  const midX = width / 2;
  const midY = height / 2;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;

  // 1. 先計算初始 SVG 像素坐標，並記錄所屬象限
  const placed = bubbles.map((b, idx) => {
    const initialCx = padding + ((b.x + 100) / 200) * usableW;
    const initialCy = padding + ((100 - b.y) / 200) * usableH;
    return {
      ...b,
      cx: Math.round(initialCx * 10) / 10,
      cy: Math.round(initialCy * 10) / 10,
      radius: b.radius || 24,
      isRight: b.x >= 0,
      isTop: b.y >= 0,
      _id: idx,
    };
  });

  // 2. 執行 8 輪放鬆迭代
  const iterations = 8;
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const p1 = placed[i];
        const p2 = placed[j];
        let dx = p2.cx - p1.cx;
        let dy = p2.cy - p1.cy;
        let dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = p1.radius + p2.radius + 4; // 保留 4px 呼吸空隙

        if (dist < minDist) {
          if (dist < 0.001) {
            // 坐標完全重疊時給予微小擾動
            dx = (p1._id % 2 === 0 ? 1 : -1) * (i + 1);
            dy = (p2._id % 2 === 0 ? 1 : -1) * (j + 1);
            dist = Math.sqrt(dx * dx + dy * dy) || 1;
          } else {
            // 關鍵痛點修復（雙向正交蜂巢排斥）：
            // 1. 水平串線（dy 接近 0）：強制注入垂直正交微擾動，使相鄰球上下錯開
            if (Math.abs(dy) < 6) {
              const orthoSignY = (p1._id + p2._id) % 2 === 0 ? 1 : -1;
              dy = orthoSignY * Math.max(6, minDist * 0.45);
            }
            // 2. 垂直糖葫蘆串（dx 接近 0）：強制注入水平正交微擾動，使相鄰球左右錯開
            if (Math.abs(dx) < 6) {
              const orthoSignX = (p1._id + p2._id) % 2 === 0 ? -1 : 1;
              dx = orthoSignX * Math.max(6, minDist * 0.45);
            }
            dist = Math.sqrt(dx * dx + dy * dy);
          }
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;

          p1.cx -= nx * overlap;
          p1.cy -= ny * overlap;
          p2.cx += nx * overlap;
          p2.cy += ny * overlap;
        }
      }
    }

    // 3. 邊界鉗制與象限守恆鎖定
    for (const p of placed) {
      // 畫布整體外邊界
      p.cx = clamp(p.cx, padding + p.radius, width - padding - p.radius);
      p.cy = clamp(p.cy, padding + p.radius, height - padding - p.radius);

      // 象限中軸鎖定 (保持在原本所屬的多空像限，絕不可翻轉跨越 midX, midY)
      if (p.isRight) {
        p.cx = Math.max(midX + 2, p.cx);
      } else {
        p.cx = Math.min(midX - 2, p.cx);
      }

      if (p.isTop) {
        p.cy = Math.min(midY - 2, p.cy);
      } else {
        p.cy = Math.max(midY + 2, p.cy);
      }
    }
  }

  return placed.map(({ _id, isRight, isTop, ...rest }) => ({
    ...(rest as unknown as T),
    cx: Math.round(rest.cx * 10) / 10,
    cy: Math.round(rest.cy * 10) / 10,
  }));
}

