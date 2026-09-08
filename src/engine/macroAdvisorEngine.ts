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
 */
export function generateAiMorningBrief(
  input: MacroAdvisorInput
): AiMorningBriefDirective {
  const { macro, shield, asOfDate, catalysts = [] } = input;

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

  let headline = '【安全巡航・維持紀律】';
  let tone: AiMorningBriefDirective['tone'] = 'NEUTRAL';
  let summary = '';
  const actionPoints: string[] = [];

  // 1. 核心決策分支
  if (isPanic) {
    if (isMarginFragile || isCashTight) {
      headline = '【極端避險・嚴守防線】';
      tone = 'DEFENSIVE';
      summary =
        '市場籠罩極度恐慌情緒，但個人帳戶槓桿維持率或現金水位偏緊，首要目標為保全本金與確保流動性，切勿輕舉妄動。';
      if (isMarginFragile) {
        actionPoints.push(
          `質押維持率處於警戒水位 (${shield.marginMaintenanceRatio}%)，嚴禁逆勢攤平，優先守護維持率防守線，必要時償還本金或補充現金擔保品降槓桿。`
        );
      } else {
        actionPoints.push(
          '可用現金水位偏低，嚴禁在恐慌中盲目抄底，優先保留流動性儲備應對未知衝擊。'
        );
      }
      actionPoints.push('暫停所有非必要的短線交易，停止擴大資金曝險。');
      actionPoints.push('預留生活與利息應急準備金，靜待恐慌情緒釋放完畢。');
    } else {
      headline = '【防禦蓄勢・分批低接】';
      tone = 'OPPORTUNISTIC';
      summary =
        '市場情緒陷入非理性極度恐慌，恐慌指數衝高；個人投資組合現金充足且質押防護穩固，迎來中長線黃金佈局窗口。';
      actionPoints.push(
        '啟動金字塔式逢低分批掛單，優先承接低配的核心指數型 ETF (如 0050/006208/VT)。'
      );
      actionPoints.push('嚴禁一次性打滿所有現金彈藥，保留至少 50% 儲備現金應對二次回測。');
      actionPoints.push('檢視雙重動能與技術指標底穿上型態，捕捉止跌翻揚之右側訊號。');
    }
  } else if (isEuphoria) {
    if (isHighDrift || !isCashStrong) {
      headline = '【獲利調節・拉高現金】';
      tone = 'CAUTION';
      summary =
        '市場情緒過熱鈍化，貪婪指數逼近極限；組合部分強勢標的偏離目標配置，建議啟動再平衡部分停利，回收現金儲備未來子彈。';
      actionPoints.push(
        `資產配置最大偏離已達 ${shield.maxAllocationDriftPercent}%，建議對漲幅過大之超配標的進行獲利調節。`
      );
      actionPoints.push('將獲利贖回資金轉入高利定存或短債避風港，拉高實質防禦現金比重。');
      actionPoints.push('嚴格執行移動停利防守線 (Trailing Stop)，杜絕高檔追價盲目追高。');
    } else {
      headline = '【居安思危・落實防禦】';
      tone = 'CAUTION';
      summary =
        '市場處於樂觀亢奮階段，波動率受壓抑；整體組合維持安全，但需隨時防範黑天鵝突襲。';
      actionPoints.push('持續審視持倉個股評價面，避免重押單一熱門概念板塊。');
      actionPoints.push('檢驗質押擔保品耐震能力，備妥壓力測試逃生方案。');
      actionPoints.push('維持常態扣款或紀律持股，不因市場樂觀而輕易放大槓桿。');
    }
  } else if (isElevated) {
    headline = '【謹慎觀望・收斂曝險】';
    tone = 'CAUTION';
    summary =
      '市場隱含波動率有所升溫，多空博弈激烈；建議控制部位曝險，保持觀察姿態。';
    actionPoints.push('縮小單筆進場注碼規模，優先觀望關鍵支撐位守成表現。');
    actionPoints.push('檢查持倉技術面破線標的，嚴格落實停損停利紀律。');
    actionPoints.push('留意即將到來的重磅財經事件公布，防範波動劇烈外溢。');
  } else {
    headline = '【安全巡航・維持紀律】';
    tone = 'NEUTRAL';
    summary =
      '總體經濟與市場波動處於常態合理中樞，個人投資組合防護健全，繼續落實常規投資紀律。';
    actionPoints.push('繼續維持定期定額 (DCA) 或目標資產配置之常規執行。');
    actionPoints.push('定期檢驗股息發放進度與各帳本收支，維持穩健被動現金流滾雪球。');
    actionPoints.push('安心專注本業與生活，讓時間與複利為長線資產發揮效用。');
  }

  // 2. 宏觀診斷描述
  const inversionText = macro.isYieldInverted
    ? `美債殖利率曲線持續倒掛 (利差 ${macro.yieldSpread}%)，暗示景氣衰退防禦意識仍需保持`
    : `美債殖利率曲線利差正常 (+${macro.yieldSpread}%)，資金定價維持健康常態`;
  const macroDiagnosis = `當前 VIX 恐慌指數為 ${macro.vix} (${macro.vixLevel})，市場情緒貪婪恐慌指數為 ${macro.fearAndGreedIndex} (${macro.fearAndGreedLevel})；${inversionText}；美元指數座落於 ${macro.dxy}，USD/TWD 匯率約 ${macro.usdToTwd}。`;

  // 3. 個人防護盾診斷描述
  const marginText = shield.hasLoans
    ? `質押維持率為 ${shield.marginMaintenanceRatio}% (${shield.marginStatus === 'SAFE' ? '安全無虞' : '注意警戒'})`
    : '無質押借款負債，整戶零槓桿風險';
  const shieldDiagnosis = `個人總淨值折算約 NT$ ${Math.round(shield.totalNavTWD).toLocaleString()}，現金購買力防禦水位為 ${shield.cashRatioPercent}% (${shield.cashStatus === 'STRONG' ? '彈藥充裕' : shield.cashStatus === 'ADEQUATE' ? '適度均衡' : '水位偏緊'})；${marginText}；資產配置最大偏離度為 ${shield.maxAllocationDriftPercent}%。`;

  // 4. 生成可選 LLM Payload
  const llmPayloadJson = buildLlmPromptPayload(macro, shield, upcoming);

  return {
    headline,
    tone,
    summary,
    actionPoints,
    macroDiagnosis,
    shieldDiagnosis,
    llmPayloadJson,
  };
}
