import {
  AiMorningBriefDirective,
  MacroAdvisorInput,
  MacroIndicatorSnapshot,
  MacroPortfolioShield,
  MacroThermometer,
  QuickStressScenario,
  UpcomingCatalyst,
  GroupedCatalysts,
} from '../types/macro';


/**
 * 計算個人投資組合宏觀防護盾 (Calculate Portfolio Macro Shield)
 */
export function calculatePortfolioMacroShield(params: {
  navTWD: number;
  cashTWD: number;
  totalLoanDebtTWD: number;
  collateralValueTWD: number;
  maxDriftPercent?: number;
  portfolioBeta?: number;
  usStockValueUSD?: number;
  annualizedVolatility?: number;
}): MacroPortfolioShield {
  const {
    navTWD,
    cashTWD,
    totalLoanDebtTWD,
    collateralValueTWD,
    maxDriftPercent = 0,
    portfolioBeta,
    usStockValueUSD = 0,
    annualizedVolatility = 0.18,
  } = params;


  const totalNavTWD = Math.max(0, navTWD);
  const cashBalanceTWD = Math.max(0, cashTWD);

  const cashRatioPercent =
    totalNavTWD > 0
      ? Math.round((cashBalanceTWD / totalNavTWD) * 1000) / 10
      : 0;

  let cashStatus: MacroPortfolioShield['cashStatus'] = 'ADEQUATE';
  if (cashRatioPercent < 10) {
    cashStatus = 'TIGHT';
  } else if (cashRatioPercent > 30) {
    cashStatus = 'STRONG';
  }

  const hasLoans = totalLoanDebtTWD > 0;
  let marginMaintenanceRatio = 0;
  let marginStatus: MacroPortfolioShield['marginStatus'] = 'NO_LOAN';

  if (hasLoans) {
    marginMaintenanceRatio =
      Math.round((collateralValueTWD / totalLoanDebtTWD) * 1000) / 10;
    if (marginMaintenanceRatio < 130) {
      marginStatus = 'MARGIN_CALL';
    } else if (marginMaintenanceRatio < 166) {
      marginStatus = 'WARNING';
    } else {
      marginStatus = 'SAFE';
    }
  }

  const valueAtRisk95TWD = calculate1DayVaR95(totalNavTWD, annualizedVolatility);
  const varRatioPercent =
    totalNavTWD > 0 ? Math.round((valueAtRisk95TWD / totalNavTWD) * 1000) / 10 : 0;
  const fxDeltaTWD = calculateFxDelta(usStockValueUSD);
  const quickStressTest = calculateQuickStressMatrix(collateralValueTWD, totalLoanDebtTWD);

  return {
    totalNavTWD,
    cashBalanceTWD,
    cashRatioPercent,
    cashStatus,
    hasLoans,
    marginMaintenanceRatio,
    marginStatus,
    maxAllocationDriftPercent: Math.round(maxDriftPercent * 10) / 10,
    portfolioBeta,
    valueAtRisk95TWD,
    varRatioPercent,
    fxDeltaTWD,
    quickStressTest,
  };
}


/**
 * 試算關鍵財經事件倒數 (Calculate Upcoming Catalysts)
 */
export function calculateUpcomingCatalysts(
  rawCatalysts: Omit<UpcomingCatalyst, 'daysLeft'>[],
  asOfDateStr: string = new Date().toISOString().split('T')[0]
): UpcomingCatalyst[] {
  const baseTime = new Date(`${asOfDateStr}T00:00:00`).getTime();

  return rawCatalysts
    .map((c) => {
      const eventTime = new Date(`${c.date}T00:00:00`).getTime();
      const diffDays = Math.round((eventTime - baseTime) / (1000 * 60 * 60 * 24));
      return {
        ...c,
        daysLeft: diffDays,
        impact: c.impact || 'MEDIUM',
        targetMarket: c.targetMarket || 'ALL',
      };
    })
    .filter((c) => c.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/**
 * 構建供外部 LLM 使用之結構化提示詞 Payload
 */
export function buildLlmPromptPayload(
  macro: MacroIndicatorSnapshot,
  shield: MacroPortfolioShield,
  catalysts: UpcomingCatalyst[] = []
): string {
  const payload = {
    macro: {
      date: macro.date,
      us10yYield: macro.us10y,
      us2yYield: macro.us2y,
      yieldSpread: macro.yieldSpread,
      isYieldInverted: macro.isYieldInverted,
      vix: macro.vix,
      vixLevel: macro.vixLevel,
      fearAndGreedIndex: macro.fearAndGreedIndex,
      fearAndGreedLevel: macro.fearAndGreedLevel,
      goldPriceUSD: macro.goldPrice,
      wtiOilPriceUSD: macro.oilPrice,
      dollarIndexDXY: macro.dxy,
      usdToTwd: macro.usdToTwd,
      usM2GrowthYoY: macro.usM2GrowthYoY,
      twM2GrowthYoY: macro.twM2GrowthYoY,
    },
    portfolio: {
      totalNavTWD: shield.totalNavTWD,
      cashBalanceTWD: shield.cashBalanceTWD,
      cashRatioPercent: shield.cashRatioPercent,
      cashStatus: shield.cashStatus,
      hasLoans: shield.hasLoans,
      marginMaintenanceRatio: shield.marginMaintenanceRatio,
      marginStatus: shield.marginStatus,
      maxAllocationDriftPercent: shield.maxAllocationDriftPercent,
      portfolioBeta: shield.portfolioBeta,
    },
    upcomingEvents: catalysts.map((c) => ({
      name: c.name,
      date: c.date,
      daysLeft: c.daysLeft,
      category: c.category,
      description: c.description,
    })),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * 離線確定性專家規則系統 (Deterministic AI Morning Brief Engine)
 * 整合：市場宏觀脈搏 + 個人防護盾 + 持股箱子突破/破底訊號 + 催化劑倒數 + 待收股息進度
 */
export function generateAiMorningBrief(
  input: MacroAdvisorInput
): AiMorningBriefDirective {
  const { macro, shield, asOfDate, catalysts = [], holdingSignals = [], upcomingDividends = [] } = input;

  const upcoming = calculateUpcomingCatalysts(catalysts, asOfDate || macro.date);
  const isPanic =
    macro.vixLevel === 'PANIC' ||
    macro.fearAndGreedLevel === 'EXTREME_FEAR' ||
    macro.vix >= 30;
  const isEuphoria =
    macro.vixLevel === 'EUPHORIA' ||
    macro.fearAndGreedLevel === 'EXTREME_GREED' ||
    macro.vix <= 13;
  const isElevated = macro.vixLevel === 'ELEVATED' || macro.vix > 22;

  const isMarginFragile =
    shield.hasLoans &&
    (shield.marginStatus === 'WARNING' || shield.marginStatus === 'MARGIN_CALL');
  const isCashTight = shield.cashStatus === 'TIGHT';
  const isCashStrong = shield.cashStatus === 'STRONG';
  const isHighDrift = shield.maxAllocationDriftPercent >= 5.0;

  // 1. 持股事件動態分流
  const sellSignals = holdingSignals.filter((s) => s.action === 'SELL');
  const buySignals = holdingSignals.filter((s) => s.action === 'BUY');
  const urgentCatalysts = upcoming.filter((c) => c.daysLeft <= 3);
  const nearDividends = upcomingDividends.filter((d) => d.daysLeft >= 0 && d.daysLeft <= 14);

  let headline = '【安全巡航・維持紀律】';
  let tone: AiMorningBriefDirective['tone'] = 'NEUTRAL';
  let summary = '';
  const actionPoints: string[] = [];

  const urgentHighImpactCatalyst = urgentCatalysts.find((c) => c.impact === 'HIGH');
  const isHighRiskMargin =
    shield.hasLoans &&
    (isMarginFragile || (shield.marginMaintenanceRatio > 0 && shield.marginMaintenanceRatio < 180));

  // 動態決定方針基調與標題
  if (sellSignals.length > 0) {
    headline = '【破線警戒・汰弱留強】';
    tone = 'DEFENSIVE';
    summary = `在倉持股有 ${sellSignals.length} 檔跌破箱底關鍵支撐，首要之務為落實停損紀律，保全資金防守戰線。`;
  } else if (urgentHighImpactCatalyst && isHighRiskMargin) {
    headline = '【重大事件逼近・嚴控質押槓桿】';
    tone = 'CAUTION';
    summary = `距離重大高衝擊事件 ${urgentHighImpactCatalyst.name} 僅剩 ${urgentHighImpactCatalyst.daysLeft === 0 ? '今天' : `${urgentHighImpactCatalyst.daysLeft} 天`}，且個人質押槓桿維持率偏緊 (${shield.marginMaintenanceRatio}%)，務必嚴控部位曝險防範黑天鵝。`;
  } else if (buySignals.length > 0 && !isPanic) {
    headline = '【強者恆強・突破進攻】';
    tone = 'OPPORTUNISTIC';
    summary = `在倉標的迎來箱頂突破動能發動，可趁盤勢震盪回測支撐時依紀律加碼擴大戰果。`;
  } else if (isPanic) {
    if (isMarginFragile || isCashTight) {
      headline = '【極端避險・嚴守防線】';
      tone = 'DEFENSIVE';
      summary =
        '市場籠罩極度恐慌情緒，但個人帳戶槓桿維持率或現金水位偏緊，首要目標為保全本金與確保流動性，切勿輕舉妄動。';
    } else {
      headline = '【防禦蓄勢・分批低接】';
      tone = 'OPPORTUNISTIC';
      summary =
        '市場情緒陷入非理性極度恐慌，恐慌指數衝高；個人投資組合現金充足且質押防護穩固，迎來中長線黃金佈局窗口。';
    }
  } else if (isEuphoria) {
    if (isHighDrift || !isCashStrong) {
      headline = '【獲利調節・拉高現金】';
      tone = 'CAUTION';
      summary =
        '市場情緒過熱鈍化，貪婪指數逼近極限；組合部分強勢標的偏離目標配置，建議啟動再平衡部分停利，回收現金儲備未來子彈。';
    } else {
      headline = '【居安思危・落實防禦】';
      tone = 'CAUTION';
      summary =
        '市場處於樂觀亢奮階段，波動率受壓抑；整體組合維持安全，但需隨時防範黑天鵝突襲。';
    }
  } else if (isElevated) {
    headline = '【謹慎觀望・收斂曝險】';
    tone = 'CAUTION';
    summary =
      '市場隱含波動率有所升溫，多空博弈激烈；建議控制部位曝險，保持觀察姿態。';
  } else {
    headline = '【安全巡航・維持紀律】';
    tone = 'NEUTRAL';
    summary =
      '總體經濟與市場波動處於常態合理中樞，個人投資組合防護健全，繼續落實常規投資紀律。';
  }

  // 2. 注入具體個人化實戰行動要點 (Action Points)
  // A. 持股賣出停損優先點名
  if (sellSignals.length > 0) {
    const symbolsText = sellSignals.map((s) => `${s.symbol}${s.name ? `(${s.name})` : ''}`).join('、');
    const stopPriceText = sellSignals[0].stopLossPrice ? ` (防守價 $${sellSignals[0].stopLossPrice})` : '';
    actionPoints.push(
      `⚠️【破線停損】持股 ${symbolsText} 已跌破三日箱底防守線${stopPriceText}，嚴格執行肌肉記憶紀律，立即停損減碼，切忌凹單。`
    );
  }

  // B. 高衝擊事件 × 質押槓桿警戒聯動點名
  if (urgentHighImpactCatalyst && isHighRiskMargin) {
    actionPoints.push(
      `🚨【槓桿警戒】距離重大高衝擊事件 (${urgentHighImpactCatalyst.name}) 僅剩 ${urgentHighImpactCatalyst.daysLeft === 0 ? '今天' : `${urgentHighImpactCatalyst.daysLeft} 天`}，且質押維持率處於警戒水位 (${shield.marginMaintenanceRatio}%)，強烈建議暫停追價加碼，優先提高現金水位或提撥擔保品以防範流動性黑天鵝。`
    );
  }

  // C. 持股買進突破點名
  if (buySignals.length > 0) {
    const symbolsText = buySignals.map((s) => `${s.symbol}${s.name ? `(${s.name})` : ''}`).join('、');
    const firstBuy = buySignals[0];
    const defenseText = firstBuy.stopLossPrice ? `，以 $${firstBuy.stopLossPrice} 作為第一道移動防守點` : '';
    actionPoints.push(
      `🔥【動能突破】持股 ${symbolsText} 帶量站上箱頂主升段發動${defenseText}，可把握量縮回測箱頂時分批加碼。`
    );
  }

  // D. 關鍵財經催化劑倒數提醒 (若尚未被槓桿警戒點名)
  if (urgentCatalysts.length > 0 && !(urgentHighImpactCatalyst && isHighRiskMargin)) {
    const catalyst = urgentCatalysts[0];
    actionPoints.push(
      `⏳【催化劑倒數】距離 ${catalyst.name} 僅剩 ${catalyst.daysLeft === 0 ? '今天' : `${catalyst.daysLeft} 天`}，短線避免大額單筆重押，預留至少 15% 機動資金以防數據超預期波動。`
    );
  }

  // D. 待收股息活水提醒
  if (nearDividends.length > 0) {
    const div = nearDividends[0];
    actionPoints.push(
      `💰【股息活水】${div.symbol} 預計於 ${div.payDate} (${div.daysLeft === 0 ? '今日' : `${div.daysLeft} 天後`}) 發放現金股息約 NT$ ${Math.round(div.amount).toLocaleString()}，可預先規劃為再平衡或低接子彈。`
    );
  }

  // E. 宏觀與防護盾核心原則常態補位 (若點數少於 3 條，補入常態紀律方針)
  if (actionPoints.length < 3) {
    if (isPanic) {
      if (isMarginFragile) {
        actionPoints.push(`質押維持率處於警戒水位 (${shield.marginMaintenanceRatio}%)，優先守護防守線，暫停擴大槓桿。`);
        actionPoints.push('暫停所有非必要的短線交易，預留生活與利息應急準備金。');
      } else {
        actionPoints.push('啟動金字塔式逢低分批佈局核心 ETF (如 0050/006208/VT)，杜絕單筆孤注一擲。');
        actionPoints.push('嚴禁一次性打滿所有現金彈藥，保留至少 50% 儲備現金應對二次回測。');
      }
    } else if (isEuphoria) {
      if (isHighDrift) {
        actionPoints.push(`資產配置最大偏離已達 ${shield.maxAllocationDriftPercent}%，建議對漲幅過大之超配標的獲利調節。`);
        actionPoints.push('將獲利贖回資金轉入高利定存或短債避風港，拉高實質防禦現金比重。');
      } else {
        actionPoints.push('持續審視持倉個股評價面，避免重押單一熱門概念板塊。');
      }
    } else {
      actionPoints.push('維持定期定額 (DCA) 或目標資產配置之常規執行，不因短線雜訊干擾長期複利步伐。');
    }
  }

  if (actionPoints.length < 3) {
    actionPoints.push('檢驗個人防護盾各項數值，確保緊急備用金與質押維持率常保於無虞區間。');
  }

  // 3. 宏觀診斷描述
  const inversionText = macro.isYieldInverted
    ? `美債殖利率曲線持續倒掛 (利差 ${macro.yieldSpread}%)，暗示景氣衰退防禦意識仍需保持`
    : `美債殖利率曲線利差正常 (+${macro.yieldSpread}%)，資金定價維持健康常態`;
  const macroDiagnosis = `當前 VIX 恐慌指數為 ${macro.vix} (${macro.vixLevel})，市場情緒貪婪恐慌指數為 ${macro.fearAndGreedIndex} (${macro.fearAndGreedLevel})；${inversionText}；美元指數座落於 ${macro.dxy}，USD/TWD 匯率約 ${macro.usdToTwd}。`;

  // 4. 個人防護盾診斷描述
  const marginText = shield.hasLoans
    ? `質押維持率為 ${shield.marginMaintenanceRatio}% (${shield.marginStatus === 'SAFE' ? '安全無虞' : '注意警戒'})`
    : '無質押借款負債，整戶零槓桿風險';
  const shieldDiagnosis = `個人總淨值折算約 NT$ ${Math.round(shield.totalNavTWD).toLocaleString()}，現金購買力防禦水位為 ${shield.cashRatioPercent}% (${shield.cashStatus === 'STRONG' ? '彈藥充裕' : shield.cashStatus === 'ADEQUATE' ? '適度均衡' : '水位偏緊'})；${marginText}；資產配置最大偏離度為 ${shield.maxAllocationDriftPercent}%。`;

  // 5. 生成結構化 LLM Payload
  const llmPayloadJson = buildLlmPromptPayload(macro, shield, upcoming);

  return {
    headline,
    tone,
    summary,
    actionPoints: actionPoints.slice(0, 4),
    macroDiagnosis,
    shieldDiagnosis,
    llmPayloadJson,
  };
}

/**
 * 試算法人風控 1-Day 95% 在險價值 (1-Day 95% VaR)
 * 公式：1.65 * (annualizedVolatility / sqrt(252)) * NAV
 */
export function calculate1DayVaR95(navTWD: number, annualizedVolatility: number = 0.18): number {
  if (navTWD <= 0) return 0;
  const tradingDaysPerYear = 252;
  const dailyVolatility = annualizedVolatility / Math.sqrt(tradingDaysPerYear);
  const var95 = 1.65 * dailyVolatility * navTWD;
  return Math.round(var95);
}

/**
 * 試算美股持倉對台幣匯率敏感度 (FX Delta)
 * 定義：台幣每升值 1 元，美股持倉折合台幣淨值之帳面變動額
 */
export function calculateFxDelta(usStockValueUSD: number): number {
  if (usStockValueUSD <= 0) return 0;
  return Math.round(usStockValueUSD);
}

/**
 * 試算美股機構級信用金絲雀 (HY OAS & CDS 履約保險指數)
 */
export function evaluateCreditRisk(
  oas?: number,
  cds?: number
): {
  cdsRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  isAlert: boolean;
  description: string;
} {
  const oasVal = oas ?? 3.5;
  const cdsVal = cds ?? 65;

  if (oasVal > 6.0 || cdsVal >= 110) {
    return {
      cdsRiskLevel: 'CRITICAL',
      isAlert: true,
      description: `高收益債利差 (${oasVal.toFixed(1)}%) 或 CDS 違約保險指數 (${cdsVal}) 飆升至危急水位，企業違約與流動性枯竭風險極高。`,
    };
  }

  if (oasVal >= 5.0 || cdsVal >= 90) {
    return {
      cdsRiskLevel: 'HIGH',
      isAlert: true,
      description: `高收益債利差 (${oasVal.toFixed(1)}%) 突破 5% 風控警戒線，信用利差走擴暗示企業融資成本劇增。`,
    };
  }

  if (oasVal >= 4.0 || cdsVal >= 75) {
    return {
      cdsRiskLevel: 'MODERATE',
      isAlert: false,
      description: `信用利差與 CDS 處於溫和區間，信用市場尚維持中性流動性。`,
    };
  }

  return {
    cdsRiskLevel: 'LOW',
    isAlert: false,
    description: `信用利差 (${oasVal.toFixed(1)}%) 與 CDS (${cdsVal}) 平穩健康，企業債違約保險成本極低。`,
  };
}

/**
 * 試算台股專屬籌碼風控指標 (外資台指期空單 & 融資維持率)
 */
export function evaluateTwMarketRisk(
  netOi?: number,
  marginRatio?: number
): {
  twFuturesRiskLevel: 'BULLISH' | 'NEUTRAL' | 'HIGH_ALERT' | 'EXTREME_SHORT';
  twMarginRiskLevel: 'SAFE' | 'WARNING' | 'LIQUIDATION_RISK';
  description: string;
} {
  let twFuturesRiskLevel: 'BULLISH' | 'NEUTRAL' | 'HIGH_ALERT' | 'EXTREME_SHORT' = 'NEUTRAL';
  let twMarginRiskLevel: 'SAFE' | 'WARNING' | 'LIQUIDATION_RISK' = 'SAFE';

  if (netOi !== undefined) {
    if (netOi <= -45000) {
      twFuturesRiskLevel = 'EXTREME_SHORT';
    } else if (netOi <= -30000) {
      twFuturesRiskLevel = 'HIGH_ALERT';
    } else if (netOi >= 0) {
      twFuturesRiskLevel = 'BULLISH';
    } else {
      twFuturesRiskLevel = 'NEUTRAL';
    }
  }

  if (marginRatio !== undefined) {
    if (marginRatio < 130) {
      twMarginRiskLevel = 'LIQUIDATION_RISK';
    } else if (marginRatio < 140) {
      twMarginRiskLevel = 'WARNING';
    } else {
      twMarginRiskLevel = 'SAFE';
    }
  }

  const parts: string[] = [];
  if (twFuturesRiskLevel === 'EXTREME_SHORT') {
    parts.push(`外資台指期淨空單高達 ${Math.abs(netOi!).toLocaleString()} 口 (重度避險壓制)`);
  } else if (twFuturesRiskLevel === 'HIGH_ALERT') {
    parts.push(`外資淨空單超過 3 萬口警戒線 (${Math.abs(netOi!).toLocaleString()} 口)`);
  }

  if (twMarginRiskLevel === 'LIQUIDATION_RISK') {
    parts.push(`全市場融資維持率跌破 130% 斷頭追繳紅線 (${marginRatio!.toFixed(1)}%)，提防多殺多融資斷頭潮`);
  } else if (twMarginRiskLevel === 'WARNING') {
    parts.push(`融資維持率降至 140% 警戒區間 (${marginRatio!.toFixed(1)}%)`);
  }

  return {
    twFuturesRiskLevel,
    twMarginRiskLevel,
    description: parts.length > 0 ? parts.join('；') : '台股籌碼面目前無重大極端風險警報。',
  };
}

/**
 * 試算 0~100 宏觀水溫計 (Macro Thermometer) 與作戰姿態
 */
export function calculateMacroThermometer(macro: MacroIndicatorSnapshot): MacroThermometer {
  let score = 50; // 中性基準分
  const rationale: string[] = [];

  // 1. 殖利率利差
  if (macro.isYieldInverted || macro.yieldSpread < 0) {
    score -= 15;
    rationale.push(`美債殖利率利差倒掛 (${macro.yieldSpread}%) 壓抑成長估值`);
  } else if (macro.yieldSpread >= 0.5) {
    score += 10;
    rationale.push(`殖利率利差正向健康 (+${macro.yieldSpread}%) 提供總經支撐`);
  }

  // 2. VIX 恐慌指數
  if (macro.vix >= 30) {
    score -= 20;
    rationale.push(`VIX 恐慌指數狂飆至 ${macro.vix} (重度恐慌)`);
  } else if (macro.vix >= 22) {
    score -= 10;
    rationale.push(`VIX 處於警戒位階 (${macro.vix})`);
  } else if (macro.vix <= 15) {
    score += 10;
    rationale.push(`VIX 低位運行 (${macro.vix}) 市場平穩樂觀`);
  } else if (macro.vix <= 19) {
    score += 5;
  }

  // 3. 恐懼與貪婪指數
  if (macro.fearAndGreedIndex <= 25) {
    score -= 10;
    rationale.push(`市場情緒極度恐慌 (${macro.fearAndGreedIndex})`);
  } else if (macro.fearAndGreedIndex >= 65) {
    score += 10;
    rationale.push(`市場情緒樂觀正向 (${macro.fearAndGreedIndex})`);
  }

  // 4. 美股信用利差 (OAS) 與 CDS
  if (macro.creditSpreadOAS !== undefined) {
    if (macro.creditSpreadOAS >= 5.0) {
      score -= 15;
      rationale.push(`高收益債信用利差大幅走擴 (${macro.creditSpreadOAS}%) 資金緊縮`);
    } else if (macro.creditSpreadOAS <= 3.5) {
      score += 5;
    }
  }

  if (macro.cdsInsuranceIndex !== undefined && macro.cdsInsuranceIndex >= 100) {
    score -= 10;
    rationale.push(`CDS 違約保險指數升溫 (${macro.cdsInsuranceIndex})`);
  }

  // 5. 台股期貨空單與融資維持率
  if (macro.twFuturesNetOi !== undefined) {
    if (macro.twFuturesNetOi <= -40000) {
      score -= 15;
      rationale.push(`外資期貨大額避險空單壓制 (${macro.twFuturesNetOi.toLocaleString()} 口)`);
    } else if (macro.twFuturesNetOi <= -25000) {
      score -= 8;
    } else if (macro.twFuturesNetOi >= 0) {
      score += 5;
    }
  }

  if (macro.twMarginMaintenance !== undefined) {
    if (macro.twMarginMaintenance < 135) {
      score -= 15;
      rationale.push(`融資維持率瀕臨斷頭線 (${macro.twMarginMaintenance}%)`);
    } else if (macro.twMarginMaintenance >= 165) {
      score += 5;
    }
  }

  // 夾止於 0 ~ 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  let stance: 'DEFENSIVE' | 'NEUTRAL' | 'AGGRESSIVE';
  let suggestedEquityAllocationPercent: number;

  if (score >= 70) {
    stance = 'AGGRESSIVE';
    // 70~100 分對應 75%~90% 倉位
    suggestedEquityAllocationPercent = Math.min(90, Math.round(75 + (score - 70) * 0.5));
  } else if (score <= 40) {
    stance = 'DEFENSIVE';
    // 0~40 分對應 20%~40% 倉位
    suggestedEquityAllocationPercent = Math.max(20, Math.round(20 + score * 0.5));
  } else {
    stance = 'NEUTRAL';
    // 41~69 分對應 45%~70% 倉位
    suggestedEquityAllocationPercent = Math.round(45 + (score - 40) * 0.85);
  }

  return {
    score,
    stance,
    suggestedEquityAllocationPercent,
    rationale: rationale.length > 0 ? rationale : ['各項宏觀指標均落於歷史常態中位數區間。'],
  };
}

/**
 * 試算個人防護盾 3 階急速黑天鵝壓力測試矩陣
 * 模擬在 [-10%, -20%, -30%] 急跌下的擔保品市值、質押維持率與 130% 斷頭追繳缺口
 */
export function calculateQuickStressMatrix(
  collateralTWD: number,
  totalLoanDebtTWD: number
): QuickStressScenario[] {
  const drops = [-10, -20, -30];
  const safeCollateral = Math.max(0, collateralTWD);
  const safeDebt = Math.max(0, totalLoanDebtTWD);

  return drops.map((drop) => {
    const label = `${drop}% ${drop === -10 ? '震盪' : drop === -20 ? '回檔' : '崩盤'}`;

    if (safeDebt === 0) {
      return {
        dropPercent: drop,
        label,
        stressedCollateralTWD: Math.round(safeCollateral * (1 + drop / 100)),
        stressedMarginRatioPercent: 999.9,
        marginCallShortfallTWD: 0,
        status: 'SAFE',
      };
    }

    const stressedCollateralTWD = Math.round(safeCollateral * (1 + drop / 100));
    const stressedMarginRatioPercent =
      Math.round((stressedCollateralTWD / safeDebt) * 1000) / 10;

    // 130% 斷頭線追繳缺口
    const threshold130 = safeDebt * 1.3;
    const marginCallShortfallTWD = Math.max(
      0,
      Math.round(threshold130 - stressedCollateralTWD)
    );

    let status: QuickStressScenario['status'] = 'SAFE';
    if (stressedMarginRatioPercent < 130) {
      status = 'MARGIN_CALL';
    } else if (stressedMarginRatioPercent < 166) {
      status = 'WARNING';
    }

    return {
      dropPercent: drop,
      label,
      stressedCollateralTWD,
      stressedMarginRatioPercent,
      marginCallShortfallTWD,
      status,
    };
  });
}

/**
 * 將關鍵財經催化劑按時序劃分為三段 (彭博式時序雷達：今日登場 / 7日焦點 / 30日遠端)
 */
export function groupCatalystsByTimeline(catalysts: UpcomingCatalyst[]): GroupedCatalysts {
  const today: UpcomingCatalyst[] = [];
  const within7Days: UpcomingCatalyst[] = [];
  const within30Days: UpcomingCatalyst[] = [];

  for (const c of catalysts) {
    if (c.daysLeft === 0) {
      today.push(c);
    } else if (c.daysLeft >= 1 && c.daysLeft <= 7) {
      within7Days.push(c);
    } else if (c.daysLeft >= 8 && c.daysLeft <= 30) {
      within30Days.push(c);
    }
  }

  return { today, within7Days, within30Days };
}

/**
 * 自動生成每月 10 號在線持股營收公布截止倒數催化劑
 */
export function generateMonthlyRevenueDeadlineCatalyst(asOfDateStr: string): UpcomingCatalyst {
  const [yearStr, monthStr, dayStr] = asOfDateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-indexed
  const day = parseInt(dayStr, 10);

  let targetYear = year;
  let targetMonth = month;

  // 若當日已超過 10 號，則下一個截止日為下個月 10 號
  if (day > 10) {
    targetMonth += 1;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    }
  }

  const targetDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-10`;
  const baseTime = new Date(`${asOfDateStr}T00:00:00`).getTime();
  const targetTime = new Date(`${targetDateStr}T00:00:00`).getTime();
  const diffDays = Math.max(0, Math.round((targetTime - baseTime) / (1000 * 60 * 60 * 24)));

  return {
    id: 'monthly-revenue-deadline',
    name: '持股月營收公告截止倒數',
    date: targetDateStr,
    daysLeft: diffDays,
    category: 'EARNINGS',
    impact: 'HIGH',
    targetMarket: 'TW',
    description: `法規規範每月 10 號前需完成上月營收申報，留意在線個股業績開獎與開盤反應。`,
  };
}

/**
 * 試算持股除息預估蒸發點數 (防大盤假跌破)
 * 公式：大盤指數 * (現金除息總額 / 大盤總市值)
 */
export function estimateExDividendIndexImpactPoints(params: {
  cashDividendPerShare: number;
  sharesOutstanding: number;
  taiexCurrentIndex: number;
  taiexTotalMarketCapTWD?: number;
}): number {
  const {
    cashDividendPerShare,
    sharesOutstanding,
    taiexCurrentIndex,
    taiexTotalMarketCapTWD = 70000000000000, // 台股約 70 兆
  } = params;

  if (cashDividendPerShare <= 0 || sharesOutstanding <= 0 || taiexTotalMarketCapTWD <= 0) {
    return 0;
  }

  const totalDividendCash = cashDividendPerShare * sharesOutstanding;
  const impactPoints = taiexCurrentIndex * (totalDividendCash / taiexTotalMarketCapTWD);
  return Math.round(impactPoints * 10) / 10;
}


