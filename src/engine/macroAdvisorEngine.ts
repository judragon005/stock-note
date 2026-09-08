import {
  AiMorningBriefDirective,
  MacroAdvisorInput,
  MacroIndicatorSnapshot,
  MacroPortfolioShield,
  UpcomingCatalyst,
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
}): MacroPortfolioShield {
  const {
    navTWD,
    cashTWD,
    totalLoanDebtTWD,
    collateralValueTWD,
    maxDriftPercent = 0,
    portfolioBeta,
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

  // 動態決定方針基調與標題
  if (sellSignals.length > 0) {
    headline = '【破線警戒・汰弱留強】';
    tone = 'DEFENSIVE';
    summary = `在倉持股有 ${sellSignals.length} 檔跌破箱底關鍵支撐，首要之務為落實停損紀律，保全資金防守戰線。`;
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

  // B. 持股買進突破點名
  if (buySignals.length > 0) {
    const symbolsText = buySignals.map((s) => `${s.symbol}${s.name ? `(${s.name})` : ''}`).join('、');
    const firstBuy = buySignals[0];
    const defenseText = firstBuy.stopLossPrice ? `，以 $${firstBuy.stopLossPrice} 作為第一道移動防守點` : '';
    actionPoints.push(
      `🔥【動能突破】持股 ${symbolsText} 帶量站上箱頂主升段發動${defenseText}，可把握量縮回測箱頂時分批加碼。`
    );
  }

  // C. 關鍵財經催化劑倒數提醒
  if (urgentCatalysts.length > 0) {
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
