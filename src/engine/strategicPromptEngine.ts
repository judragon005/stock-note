/**
 * 智策精煉投資決策多維提示詞組裝引擎 (Spec 0153 / Ticket 03)
 * 對齊《個股分析大師核心模板 V12.0》與《ETF 分析大師核心模板 V3.0》
 */

import {
  StrategicFactDigest,
  StrategicPromptOptions,
  StrategicPromptResult,
  SixThinkingHatDimension,
} from '../types/strategicPrompt';
import { estimateTokenCount } from './strategicPromptDigest';

/**
 * 六頂思考帽配置字典
 */
export const SIX_HATS_CONFIG: Record<
  SixThinkingHatDimension,
  { label: string; nameZh: string; emoji: string; coreFocus: string }
> = {
  WHITE: {
    label: 'WHITE',
    nameZh: '白帽',
    emoji: '⚪',
    coreFocus: '客觀事實與數據 (排除任何主觀臆測，僅確認已被驗證的硬數據)',
  },
  RED: {
    label: 'RED',
    nameZh: '紅帽',
    emoji: '🔴',
    coreFocus: '市場情緒與群眾直覺 (恐懼貪婪指數、散戶融資亢奮度與盤面心理直覺)',
  },
  BLACK: {
    label: 'BLACK',
    nameZh: '黑帽',
    emoji: '⚫',
    coreFocus: '魔鬼代言人 / 紅隊質詢 (嚴格挑刺，找出可能引發毀滅性虧損的所有致命弱點與破位風險)',
  },
  YELLOW: {
    label: 'YELLOW',
    nameZh: '黃帽',
    emoji: '🟡',
    coreFocus: '核心價值與催化劑 (評估商業模式超額利潤空間、產業成長性與估值修復潛力)',
  },
  GREEN: {
    label: 'GREEN',
    nameZh: '綠帽',
    emoji: '🟢',
    coreFocus: '非對稱創新策略 (設計風險有限但報酬非對稱的進場路徑、金字塔建倉或替代對沖)',
  },
  BLUE: {
    label: 'BLUE',
    nameZh: '藍帽',
    emoji: '🔵',
    coreFocus: '元認知與執行紀律 (制定精確的保本停損點、移動停利線與嚴格出場檢核清單)',
  },
};

/**
 * 組裝零信任數據海關 XML
 */
function buildCustomsAuditXml(digest: StrategicFactDigest): string {
  const { audit } = digest;
  return `  <data_customs_audit>
    <market>${audit.market}</market>
    <anchor_trading_date>${audit.anchorTradingDate}</anchor_trading_date>
    <settlement_status>${audit.settlementStatus}</settlement_status>
    <verification_timestamp>${audit.verificationTimestamp}</verification_timestamp>
    <authenticity_guarantee>${audit.authenticityGuarantee}</authenticity_guarantee>
    <asset_type>${audit.isEtf ? 'ETF' : 'EQUITY'}</asset_type>
  </data_customs_audit>`;
}

/**
 * 組裝投資人上下文 XML (預設脫敏)
 */
function buildInvestorContextXml(digest: StrategicFactDigest, options: StrategicPromptOptions): string {
  const weight = options.userPortfolioWeightPct ?? digest.desensitizedPortfolioContext?.portfolioWeightPct;
  const horizon = digest.desensitizedPortfolioContext?.holdingHorizonDays;
  const sign = digest.desensitizedPortfolioContext?.unrealizedGainLossSign;

  return `  <investor_context desensitized="${options.desensitized}">
    ${weight !== undefined ? `<portfolio_allocation_ratio>部位佔比: ${weight}%</portfolio_allocation_ratio>` : ''}
    ${horizon !== undefined ? `<holding_period>持有天數: ${horizon}日</holding_period>` : ''}
    ${sign !== undefined ? `<position_status>部位狀態: ${sign}</position_status>` : ''}
    ${options.userNotes ? `<user_notes>${options.userNotes}</user_notes>` : ''}
  </investor_context>`;
}

/**
 * 組裝個股事實清單 (對齊個股大師 V12.0)
 */
function buildEquityFactSheet(digest: StrategicFactDigest): string {
  const { quote, chips, fundamental, macro } = digest;

  return `  <fact_sheet asset_type="EQUITY">
    <!-- 1. 行情與趨勢 -->
    <quote_and_trend>
      <symbol>${quote.symbol}</symbol>
      <name>${quote.name}</name>
      <current_price>${quote.currentPrice}</current_price>
      <price_change>${quote.change} (${quote.changePercent}%)</price_change>
      <volume_shares>${quote.volumeShares}</volume_shares>
      <official_transactions>${quote.transactionsCount ?? 'N/A'}</official_transactions>
      <ma_alignment>${quote.maArrangement}</ma_alignment>
      <ma20>${quote.ma20}</ma20>
      <ma60>${quote.ma60}</ma60>
      <volume_surge_ratio_20d>${quote.volumeRatio20D}倍</volume_surge_ratio_20d>
    </quote_and_trend>

    <!-- 2. 籌碼微觀與主力防線 -->
    <chips_and_microstructure>
      <total_institutional_net_20d>${chips.totalNetShares20D ?? 'N/A'}</total_institutional_net_20d>
      <foreign_net_shares_20d>${chips.foreignNetShares20D ?? 'N/A'}</foreign_net_shares_20d>
      <trust_net_shares_20d>${chips.trustNetShares20D ?? 'N/A'}</trust_net_shares_20d>
      <big_holder_ratio_400>${chips.bigHolderRatioChange400 ?? 'N/A'}%</big_holder_ratio_400>
      <big_holder_ratio_1000>${chips.bigHolderRatioChange1000 ?? 'N/A'}%</big_holder_ratio_1000>
      <retail_holder_ratio_under_10>${chips.retailHolderCountChange ?? 'N/A'}%</retail_holder_ratio_under_10>
      <main_force_vwap_20d>${chips.mainForceVwap20D ?? 'N/A'}</main_force_vwap_20d>
      <vwap_bias_percent>${chips.currentVwapBiasPct ?? 'N/A'}%</vwap_bias_percent>
      <box_resistance>${chips.boxResistancePrice ?? 'N/A'}</box_resistance>
      <box_support>${chips.boxSupportPrice ?? 'N/A'}</box_support>
      ${chips.microstructureSummary ? `<us_microstructure>${chips.microstructureSummary}</us_microstructure>` : ''}
    </chips_and_microstructure>

    <!-- 3. 基本面與月營收 (好生意與好公司) -->
    <fundamental_and_governance>
      <pe_ratio>${fundamental?.pe ?? 'N/A'}</pe_ratio>
      <pb_ratio>${fundamental?.pb ?? 'N/A'}</pb_ratio>
      <dividend_yield>${fundamental?.dividendYield ?? 'N/A'}%</dividend_yield>
      <monthly_revenue_period>${fundamental?.monthlyRevenueYearMonth ?? 'N/A'}</monthly_revenue_period>
      <revenue_yoy_growth>${fundamental?.monthlyRevenueYoY ?? 'N/A'}%</revenue_yoy_growth>
      <revenue_mom_growth>${fundamental?.monthlyRevenueMoM ?? 'N/A'}%</revenue_mom_growth>
      <is_all_time_high_revenue>${fundamental?.isMonthlyRevenueAllTimeHigh ? '是 (歷史新高)' : '否'}</is_all_time_high_revenue>
      <director_pledge_ratio>${fundamental?.directorPledgeRatioPct ?? 'N/A'}%</director_pledge_ratio>
      ${fundamental?.governanceRiskWarning ? `<governance_warning>${fundamental.governanceRiskWarning}</governance_warning>` : ''}
    </fundamental_and_governance>

    <!-- 4. 宏觀與流動性環境 (WACC 感測) -->
    <macro_environment>
      <us_10y_yield>${macro.treasuryYield10Y ?? 'N/A'}%</us_10y_yield>
      <yield_curve_spread_10y_2y>${macro.yieldSpread10Y2Y ?? 'N/A'}%</yield_curve_spread_10y_2y>
      <cnn_fear_greed_score>${macro.cnnFearGreedScore ?? 'N/A'}</cnn_fear_greed_score>
      <vix>${macro.vixClose ?? 'N/A'}</vix>
      <regime_summary>${macro.macroRegimeText}</regime_summary>
    </macro_environment>
  </fact_sheet>`;
}

/**
 * 組裝 ETF 事實清單 (對齊 ETF 大師 V3.0)
 */
function buildEtfFactSheet(digest: StrategicFactDigest): string {
  const { quote, etf, macro } = digest;

  const holdingsList =
    etf?.topHoldings && etf.topHoldings.length > 0
      ? etf.topHoldings.map((h) => `${h.symbol} ${h.name} (${h.weightPct}%)`).join(', ')
      : '成分股清單整理中';

  return `  <fact_sheet asset_type="ETF">
    <!-- 1. 行情與趨勢 -->
    <quote_and_trend>
      <symbol>${quote.symbol}</symbol>
      <name>${quote.name}</name>
      <current_price>${quote.currentPrice}</current_price>
      <price_change>${quote.change} (${quote.changePercent}%)</price_change>
      <ma_alignment>${quote.maArrangement}</ma_alignment>
      <volume_surge_ratio_20d>${quote.volumeRatio20D}倍</volume_surge_ratio_20d>
    </quote_and_trend>

    <!-- 2. ETF 治理與成本效率 (ETF 大師 V3.0) -->
    <etf_governance_and_efficiency>
      <etf_category>${etf?.category ?? 'CORE_MARKET'}</etf_category>
      <weight_audit_matrix>
        動態權重感知稽核 (${etf?.category === 'CORE_MARKET' ? 'Core Market' : etf?.category}):
        指數品質與跟蹤偏離 (TD): ${etf?.weightMatrix.indexQuality}% | 基金治理: ${etf?.weightMatrix.governance}% | 成本效率: ${etf?.weightMatrix.costEfficiency}% | 實戰決策: ${etf?.weightMatrix.practicalDecision}%
      </weight_audit_matrix>
      <total_expense_ratio_ter>${etf?.totalExpenseRatioPct ?? 'N/A'}%</total_expense_ratio_ter>
      <tracking_difference_td>${etf?.trackingDifferencePct ?? 'N/A'}%</tracking_difference_td>
      <discount_premium_ratio>${etf?.discountPremiumPct ?? 'N/A'}%</discount_premium_ratio>
      <dividend_smoothing_policy>${etf?.dividendSmoothingPolicy ?? 'N/A'}</dividend_smoothing_policy>
    </etf_governance_and_efficiency>

    <!-- 3. 前十大成分股穿透 (Look-Through) -->
    <look_through_holdings>
      <top_holdings>${holdingsList}</top_holdings>
      <sector_concentration>${etf?.topSectorConcentration ?? 'N/A'}</sector_concentration>
    </look_through_holdings>

    <!-- 4. 宏觀與流動性 -->
    <macro_environment>
      <us_10y_yield>${macro.treasuryYield10Y ?? 'N/A'}%</us_10y_yield>
      <cnn_fear_greed_score>${macro.cnnFearGreedScore ?? 'N/A'}</cnn_fear_greed_score>
      <regime_summary>${macro.macroRegimeText}</regime_summary>
    </macro_environment>
  </fact_sheet>`;
}

/**
 * 組裝單頂思考帽之精煉事實清單 (Token 精簡保護)
 */
function buildSingleHatCompactFactSheet(digest: StrategicFactDigest): string {
  const { quote, chips, fundamental, etf, macro } = digest;
  const isEtf = digest.audit.isEtf;

  if (isEtf) {
    return `  <fact_sheet asset_type="ETF">
    <quote symbol="${quote.symbol}" name="${quote.name}" price="${quote.currentPrice}" change="${quote.changePercent}%" />
    <efficiency category="${etf?.category}" ter="${etf?.totalExpenseRatioPct ?? 'N/A'}%" td="${etf?.trackingDifferencePct ?? 'N/A'}%" premium="${etf?.discountPremiumPct ?? 'N/A'}%" />
    <concentration top_sector="${etf?.topSectorConcentration ?? 'N/A'}" />
    <macro fear_greed="${macro.cnnFearGreedScore ?? 'N/A'}" us_10y="${macro.treasuryYield10Y ?? 'N/A'}%" />
  </fact_sheet>`;
  }

  return `  <fact_sheet asset_type="EQUITY">
    <quote symbol="${quote.symbol}" name="${quote.name}" price="${quote.currentPrice}" change="${quote.changePercent}%" ma_trend="${quote.maArrangement}" volume_ratio_20d="${quote.volumeRatio20D}x" />
    <chips main_vwap="${chips.mainForceVwap20D ?? 'N/A'}" bias="${chips.currentVwapBiasPct ?? 'N/A'}%" big_holders_400="${chips.bigHolderRatioChange400 ?? 'N/A'}%" total_inst_20d="${chips.totalNetShares20D ?? 'N/A'}" />
    <fundamental pe="${fundamental?.pe ?? 'N/A'}" revenue_yoy="${fundamental?.monthlyRevenueYoY ?? 'N/A'}%" is_ath="${fundamental?.isMonthlyRevenueAllTimeHigh ? 'Y' : 'N'}" pledge="${fundamental?.directorPledgeRatioPct ?? 'N/A'}%" />
    <macro fear_greed="${macro.cnnFearGreedScore ?? 'N/A'}" us_10y="${macro.treasuryYield10Y ?? 'N/A'}%" regime="${macro.macroRegimeText}" />
  </fact_sheet>`;
}

/**
 * 組裝六頂思考帽完整分析章節
 */
function buildFullSixHatsInstructions(digest: StrategicFactDigest): string {
  const isEtf = digest.audit.isEtf;

  return `  <six_thinking_hats_instruction>
    請以六頂思考帽框架進行無偏見、高防禦性之全景分析：

    【⚪ 白帽 - 客觀硬數據事實】
    - 僅依據上方 <fact_sheet> 所列硬數據，總結當前價格位階、成交量能、營收動能或成分股持倉集中度。
    - 嚴禁加入任何預測或主觀形容詞。

    【🔴 紅帽 - 市場情緒與直覺預感】
    - 結合恐懼貪婪指數、當沖熱度與散戶動向，診斷當前市場是否處於群體非理性追價或過度悲觀。

    【⚫ 黑帽 - 魔鬼代言人 / 紅隊質詢】
    - 作為嚴苛的首席風控長，專門找出這筆投資可能產生毀滅性虧損的所有死因。
    ${
      isEtf
        ? '- 質詢：指數是否過度集中單一產業？追蹤誤差是否侵蝕長期回報？折溢價是否偏高？'
        : '- 質詢：好生意與市場集中度 (CR4/CR8) 是否正遭顛覆？董監質押率是否暗藏地雷？好公司護城河與財務鑑識是否存在假帳疑慮？'
    }

    【🟡 黃帽 - 核心價值與上檔催化劑】
    - 評估在最嚴格安全邊際下，這檔標的具備哪些實質護城河、營收創高動能或被低估的催化劑 (Catalyst)。

    【🟢 綠帽 - 非對稱創新策略】
    - 提出不對稱風險報酬的佈局方案（如：跌破箱底防禦方案、金字塔分批佈局、跨市場替代資產）。

    【🔵 藍帽 - 元認知與風控紀律】
    - 制定明確的操作紀律 Checkpoint：保本停損點位、移動停利防線，以及何種觸價條件下必須無條件砍倉。
  </six_thinking_hats_instruction>`;
}

/**
 * 組裝單頂思考帽抽離章節
 */
function buildSingleHatInstruction(hat: SixThinkingHatDimension, digest: StrategicFactDigest): string {
  const cfg = SIX_HATS_CONFIG[hat];
  const isEtf = digest.audit.isEtf;
  const hatTitle =
    hat === 'BLACK' ? '【⚫ 黑帽 - 魔鬼代言人 / 紅隊質詢】' : `【${cfg.emoji} ${cfg.nameZh} - ${cfg.coreFocus}】`;

  return `  <single_hat_deep_dive hat="${cfg.label}">
    請完全沉浸於 ${hatTitle} 視角進行深度審查：
    ${
      hat === 'BLACK'
        ? `【魔鬼代言人 / 紅隊核心任務】：
    1. 專門挑刺，列出這檔標的可能破底重挫的所有結構性弱點。
    ${isEtf ? '2. 審查指數品質與跟蹤偏離 (TD)，評估成分股黑天鵝衝擊。' : '2. 檢驗好生意競爭格局 (CR4/CR8) 與好公司財務鑑識的隱形雷區。'}
    3. 指出市場當前樂觀共識中最致命的盲點。`
        : `請專注於 ${cfg.nameZh} 的核心目標，對上方 <fact_sheet> 進行透徹剖析。`
    }
  </single_hat_deep_dive>`;
}

/**
 * 組裝 Agentic 反思校驗閘門
 */
function buildReflectionGateXml(): string {
  return `  <agentic_reflection_gate>
    在輸出最終建議前，請進行強制自我審查 (Self-Correction)：
    1. 我的黃帽樂觀論點，是否已被黑帽的風險徹底否定？
    2. 給出的目標價或防守位，是否具備堅實的數學與湖倉 VWAP 安全邊際？
    3. 若明日大盤因外部黑天鵝崩跌 3%，本標的的下檔防禦是否依然成立？
  </agentic_reflection_gate>`;
}

/**
 * 生成全維度 Master 智策提示詞
 */
export function generateMasterPrompt(
  digest: StrategicFactDigest,
  options: StrategicPromptOptions
): StrategicPromptResult {
  const isEtf = digest.audit.isEtf;
  const assetClass = isEtf ? 'ETF' : 'EQUITY';

  const systemRole = isEtf
    ? '你是一位擁有 20 年全球資產配置經驗的頂級 ETF 投資總監兼風控長，嚴格對齊《ETF 分析大師核心模板 V3.0》體系，並執行動態權重感知與六頂思考帽決策框架。'
    : '你是一位擁有 20 年華爾街對沖基金經驗的資深量化投資總監兼風控長，嚴格對齊《個股分析大師核心模板 V12.0》體系，並執行好生意/好公司/好價格與六頂思考帽決策框架。';

  const promptText = `<investment_decision_prompt version="1.0" system="SmartStrategyEngine">
  <system_role>${systemRole}</system_role>
${buildCustomsAuditXml(digest)}
${isEtf ? buildEtfFactSheet(digest) : buildEquityFactSheet(digest)}
${buildInvestorContextXml(digest, options)}
${buildFullSixHatsInstructions(digest)}
${buildReflectionGateXml()}
  <output_format>
    請以「結論先行 (Actionable Matrix)」輸出：
    1. 綜合決策評級 (強力買進 / 謹慎分批 / 觀望停看聽 / 減碼逃生)
    2. 六頂思考帽精華結論條列
    3. 實戰防守價位與出場 Checkpoint 矩陣
  </output_format>
</investment_decision_prompt>`;

  return {
    symbol: digest.quote.symbol,
    name: digest.quote.name,
    assetClass,
    promptText,
    estimatedTokens: estimateTokenCount(promptText),
    customsAudit: digest.audit,
    activeMode: 'FULL_MASTER',
  };
}

/**
 * 生成單頂思考帽抽離提示詞
 */
export function generateSingleHatPrompt(
  digest: StrategicFactDigest,
  hat: SixThinkingHatDimension,
  options: StrategicPromptOptions
): StrategicPromptResult {
  const isEtf = digest.audit.isEtf;
  const assetClass = isEtf ? 'ETF' : 'EQUITY';
  const cfg = SIX_HATS_CONFIG[hat];

  const promptText = `<investment_decision_prompt version="1.0" mode="SINGLE_HAT" hat="${hat}">
  <system_role>你是一位資深量化風控與投資策略師，當前正以【${cfg.emoji} ${cfg.nameZh}】專屬心智模式進行單點極限穿透覆盤。</system_role>
${buildCustomsAuditXml(digest)}
${buildSingleHatCompactFactSheet(digest)}
${buildInvestorContextXml(digest, options)}
${buildSingleHatInstruction(hat, digest)}
${buildReflectionGateXml()}
  <output_format>
    請直接以金字塔原理輸出【${cfg.emoji} ${cfg.nameZh}】之深度診斷結論與關鍵風險/機會要點。
  </output_format>
</investment_decision_prompt>`;

  return {
    symbol: digest.quote.symbol,
    name: digest.quote.name,
    assetClass,
    promptText,
    estimatedTokens: estimateTokenCount(promptText),
    customsAudit: digest.audit,
    activeMode: 'SINGLE_HAT',
    targetHat: hat,
  };
}

/**
 * 統一對外入口
 */
export function generateStrategicPrompt(
  digest: StrategicFactDigest,
  options: StrategicPromptOptions
): StrategicPromptResult {
  if (options.mode === 'SINGLE_HAT' && options.targetHat) {
    return generateSingleHatPrompt(digest, options.targetHat, options);
  }
  return generateMasterPrompt(digest, options);
}
