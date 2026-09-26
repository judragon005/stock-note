/**
 * AI 主力戰情室新手白話決策字典 (Single Source of Truth)
 * 專為股市初學者打造，涵蓋日常生活比喻、指標統計本質、買賣操作指引與動態即時診斷
 */

export interface GlossaryEntry {
  id: string;
  term: string; // 繁體中文術語名稱
  enTerm?: string; // 英文術語
  category: 'quote' | 'kline' | 'core' | 'radar' | 'volume' | 'risk' | 'forecast' | 'cost' | 'institution' | 'daytrade' | 'energy' | 'health' | 'signal' | 'sentiment' | 'confidence' | 'summary' | 'distribution' | 'strength' | 'verdict' | 'view';
  metaphor: string; // 💡 白話比喻（日常概念）
  meaning: string; // 📊 指標含義（統計物理本質）
  buySignal: string; // 🟢 偏多買訊（何時買或抱）
  sellSignal: string; // 🔴 偏空賣訊（何時賣或停損）
  neutralWarning?: string; // 🟡 觀望警戒
  diagnose?: (...args: any[]) => string; // ⚡ 動態數值診斷函式
}

export const AI_FORCE_GLOSSARY: Record<string, GlossaryEntry> = {
  // ==================== 頂部行情列 ====================
  openPrice: {
    id: 'openPrice',
    term: '開盤價',
    enTerm: 'Open Price',
    category: 'quote',
    metaphor: '早上市場剛開門時的第一筆成交價，代表開門第一秒大家的心情。',
    meaning: '上午 9:00 第一筆集合競價成交價格。',
    buySignal: '開盤價若跳空高於昨日收盤，且隨後不跌破，表示多方買盤積極。',
    sellSignal: '開盤大幅跳空低於昨日，顯示夜間利空發酵或主力急於脫手出貨。',
    neutralWarning: '平盤開出代表多空雙方仍在觀望，不宜急躁進場。',
  },
  highPrice: {
    id: 'highPrice',
    term: '最高價',
    enTerm: 'Day High',
    category: 'quote',
    metaphor: '今天市場最熱情、買方衝刺到的天花板頂點。',
    meaning: '當日交易時間內撮合成功的最高價位。',
    buySignal: '收盤價能強勢收在當日最高價附近，表示買盤尾盤持續搶進，次日容易續漲。',
    sellSignal: '衝到最高價後大幅回落留下長上影線，代表高檔遇到巨大倒貨賣壓。',
  },
  lowPrice: {
    id: 'lowPrice',
    term: '最低價',
    enTerm: 'Day Low',
    category: 'quote',
    metaphor: '今天最悲觀、賣方打到最深的地板低點。',
    meaning: '當日交易時間內撮合成功的最低價位。',
    buySignal: '打到最低價後迅速強勁拉起留長下影線，代表地板有強烈主力護盤買盤。',
    sellSignal: '收盤收在全天最低點附近，代表多方毫無抵抗，空方完全主導。',
  },
  closePrice: {
    id: 'closePrice',
    term: '收盤價 / 今日收盤價',
    enTerm: 'Close Price',
    category: 'quote',
    metaphor: '今天戰鬥結束後雙方最終清算的定案價，是全天最權威的代表價。',
    meaning: '下午 1:30 最終集合競價撮合之價格，決定所有投資人今日帳面損益。',
    buySignal: '收盤站上短期均線（如 5 日線、月線）且連續三天不破，為波段買進訊號。',
    sellSignal: '收盤跌破關鍵支撐或月線，應果斷停損或減碼。',
  },
  volumeShares: {
    id: 'volumeShares',
    term: '成交量 (張)',
    enTerm: 'Volume (Shares)',
    category: 'quote',
    metaphor: '菜市場今天的人潮熱鬧程度，有多少人在買賣。',
    meaning: '當天累計成交的股票總張數（1 張 = 1000 股）。',
    buySignal: '「帶量上漲」（成交量放大 1.5 倍以上且股價上漲），代表主力真金白銀進場推升。',
    sellSignal: '「放量下跌」或「高檔爆大量不漲（滯漲）」，往往是主力誘多出貨的危險信號。',
    neutralWarning: '「量縮整理」多為洗盤沉澱籌碼，可等待出量表態方向。',
  },
  transactionCount: {
    id: 'transactionCount',
    term: '成交筆數',
    enTerm: 'Transaction Count',
    category: 'quote',
    metaphor: '收銀機今天總共開出了幾張發票發票單數。',
    meaning: '當天成功撮合的總交易次數。',
    buySignal: '成交量大但筆數少，代表「大戶一口氣大單掃貨」，是強烈偏多信號。',
    sellSignal: '成交量小但筆數暴增，代表散戶零碎接刀，籌碼趨向渙散。',
  },

  // ==================== 01 主 K 線 ====================
  ma5: {
    id: 'ma5',
    term: 'MA5 (5日週均線)',
    enTerm: '5-Day Moving Average',
    category: 'kline',
    metaphor: '最近一週所有買這檔股票的人的平均成本，是超短線防守線。',
    meaning: '過去 5 個交易日收盤價的算術平均數。',
    buySignal: '股價強勢站上 MA5 且均線向上勾起，短線動能極強，適合短線進攻買進。',
    sellSignal: '跌破 MA5 代表短線衝刺動能熄火，短線客應先行獲利了結或退場。',
  },
  ma10: {
    id: 'ma10',
    term: 'MA10 (10日雙週均線)',
    enTerm: '10-Day Moving Average',
    category: 'kline',
    metaphor: '過去兩週買進者的平均成本，是短線波段的第二道防護盾。',
    meaning: '過去 10 個交易日收盤價的算術平均數。',
    buySignal: '股價回測 MA10 不破並出現紅 K 反彈，是優良的拉回加碼買點。',
    sellSignal: '連續兩天跌破 MA10，短線漲勢轉弱，應減碼觀望。',
  },
  ma20: {
    id: 'ma20',
    term: 'MA20 (20日月線 / 生命線)',
    enTerm: '20-Day Moving Average',
    category: 'kline',
    metaphor: '股票的「生命線」，代表最近一個月所有人的平均賺賠分水嶺。',
    meaning: '過去 20 個交易日收盤價平均，是機構法人與波段主力最看重的基準線。',
    buySignal: '股價在月線之上且月線斜率向上，波段偏多，任何拉回月線都是買點。',
    sellSignal: '股價「跌破月線且月線下彎」，代表中期趨勢轉空，新手必須嚴格停損賣出！',
  },
  ma60: {
    id: 'ma60',
    term: 'MA60 (60日季線)',
    enTerm: '60-Day Moving Average',
    category: 'kline',
    metaphor: '一整個季度的平均成本，是衡量這檔股票走大多頭或大空頭的主幹。',
    meaning: '過去 60 個交易日平均收盤價。',
    buySignal: '股價從季線下方強力突破季線，代表長線翻多轉強的大轉折點。',
    sellSignal: '跌破季線代表長線多頭結構破壞，恐進入數週至數月的空頭修正。',
  },
  highResistance: {
    id: 'highResistance',
    term: '高檔壓力區',
    enTerm: 'Resistance Level',
    category: 'kline',
    metaphor: '房間的天花板，過去許多人在這裡買高被套牢，一漲到這裡就想解套賣出。',
    meaning: '歷史波段高點或大量套牢賣壓集結價位。',
    buySignal: '帶大成交量「直接跳空突破」壓力區，天花板變地板，轉為強烈噴出買訊。',
    sellSignal: '多次挑戰高檔壓力區不過、出現長黑倒狀上影線時，應分批獲利了結賣出。',
  },
  mainForceCost: {
    id: 'mainForceCost',
    term: '主力成本',
    enTerm: 'Main Force Cost (VWAP)',
    category: 'kline',
    metaphor: '批發大老闆進貨的「底牌進價」，是主力大戶的資金防線。',
    meaning: '依據近 20 日成交量與法人大單精算出的成交量加權平均成本 (VWAP)。',
    buySignal: '股價高於主力成本且回測守穩，主力有強烈誘因護盤拉抬，可放心逢低跟單買進。',
    sellSignal: '股價無情「跌破主力成本」，代表主力大戶都被套牢甚至認賠砍倉，新手快逃！',
    neutralWarning: '股價與主力成本重疊時為區間震盪整理，可等待方向明朗。',
  },
  supportLevel: {
    id: 'supportLevel',
    term: '支撐區',
    enTerm: 'Support Level',
    category: 'kline',
    metaphor: '安全氣囊與彈簧墊，跌到這裡會有一批識貨的人或主力進來低接買進。',
    meaning: '歷史成交密集低點或波段防守密集區。',
    buySignal: '股價回落到支撐區止跌打底，出現紅 K 反彈時，為低風險買點。',
    sellSignal: '跌破支撐區時切勿抱著不放，代表底線崩塌，必須立刻停損賣出避免深套。',
  },
  kd: {
    id: 'kd',
    term: 'KD 指標 (隨機指標)',
    enTerm: 'Stochastic Oscillator',
    category: 'kline',
    metaphor: '市場短期衝刺的碼錶，看跑得太快還是太累。',
    meaning: '衡量收盤價在最近 9 天最高與最低價間的相對強弱位置（0~100）。',
    buySignal: 'KD 在低檔 20 以下出現「黃金交叉」（K 線由下往上穿過 D 線），代表超賣反彈買點。',
    sellSignal: 'KD 在高檔 80 以上出現「死亡交叉」（K 線由上往下跌破 D 線），代表過熱回檔賣點。',
    neutralWarning: '在強烈單邊趨勢中 KD 可能發生高檔鈍化，此時不宜單看 KD 猜頭放空。',
  },
  macd: {
    id: 'macd',
    term: 'MACD 指標 (平滑異同移動平均線)',
    enTerm: 'MACD',
    category: 'kline',
    metaphor: '大卡車前進的真實動能引擎，不易被一天的假動作騙線。',
    meaning: '利用快慢兩條指數平滑均線的差離值，判斷中長線趨勢方向與動能強弱。',
    buySignal: 'DIF 快線上穿 MACD 慢線（紅柱初生），且在 0 軸上方交叉，為健康波段買訊。',
    sellSignal: 'DIF 快線下穿 MACD 慢線（綠柱轉長），代表中線動能衰退，應減碼賣出。',
  },
  rsi: {
    id: 'rsi',
    term: 'RSI 指標 (相對強弱指標)',
    enTerm: 'Relative Strength Index',
    category: 'kline',
    metaphor: '買方與賣方的拔河溫度計（0~100）。',
    meaning: '統計過去一段時間內上漲幅度與下跌幅度的相對比率。',
    buySignal: 'RSI 跌到 30 以下進入超賣區後反轉回升，表示恐慌盤宣洩完畢，出現反彈買點。',
    sellSignal: 'RSI 超過 75~80 進入過熱超買區，隨時可能迎來獲利調節賣壓，應逢高賣出。',
  },

  // ==================== 02 AI 決策核心 ====================
  decisionTrend: {
    id: 'decisionTrend',
    term: '趨勢判斷',
    enTerm: 'Trend Judgement',
    category: 'core',
    metaphor: '氣象局發布的整體氣候走向（大晴天、多雲、還是暴風雨）。',
    meaning: 'AI 綜合均線排列表態、波段高低點高低遞增/遞減之總體方向判定。',
    buySignal: '顯示「偏多強勁」或「多頭排列」時，順勢做多買進勝率最高。',
    sellSignal: '顯示「空頭走勢」或「跌勢加劇」時，嚴禁盲目摸底買進，手中有持股應果斷停損。',
  },
  shortTermState: {
    id: 'shortTermState',
    term: '短線狀態',
    enTerm: 'Short-term Regime',
    category: 'core',
    metaphor: '車子現在是在高速公路狂飆、塞車打轉、還是在倒車。',
    meaning: '近 3~5 日之即時震盪形態（突破、震盪、回檔、破底）。',
    buySignal: '狀態為「突破整理」或「拉回守穩」時，是最佳進場起漲點。',
    sellSignal: '狀態為「高檔轉折」或「空方破底」時，應果斷賣出避難。',
    neutralWarning: '狀態為「區間震盪」時，適合高出低進或耐心等待突破。',
  },
  mainForceAction: {
    id: 'mainForceAction',
    term: '主力行為',
    enTerm: 'Main Force Action',
    category: 'core',
    metaphor: '背後操控大資金的大戶在幹嘛（是在悄悄搬磚進貨，還是分批在偷溜）。',
    meaning: '依據券商分點集中度與大單買賣超之推論行為。',
    buySignal: '若為「逢低吸籌」或「鎖碼推升」，大戶站在買方，新手跟單勝率高。',
    sellSignal: '若為「調節減碼」或「高檔出貨」，大戶正在跑路，新手應立即賣出換現金！',
  },
  chipStructure: {
    id: 'chipStructure',
    term: '籌碼結構',
    enTerm: 'Chip Structure',
    category: 'core',
    metaphor: '股票是在少數懂投資的行家手裡，還是散落在一萬個散戶手裡。',
    meaning: '籌碼穩定度，評估籌碼是否從散戶流向大戶手中。',
    buySignal: '籌碼結構為「高度集中」或「沉澱優良」，籌碼不易鬆動，極易拉抬噴出。',
    sellSignal: '籌碼結構為「渙散零碎」，散戶大量接盤，只要稍微下跌就會引起踩踏拋售。',
  },
  dayTradeRisk: {
    id: 'dayTradeRisk',
    term: '隔日沖風險',
    enTerm: 'Day Trade Risk',
    category: 'core',
    metaphor: '今天買進的人裡，有多少個是打算明天一早開盤就倒貨落跑的短跑客。',
    meaning: '隔日沖主力券商買超佔比與當沖比例綜合計算之風險百分比。',
    buySignal: '風險 < 30% 代表籌碼多為波段資金，拉回時可安心買進。',
    sellSignal: '風險 > 60% 且隔日開高時，開盤 15 分鐘常有巨大倒貨賣壓，切勿追買，甚至應賣出避風頭。',
  },
  chipHealth: {
    id: 'chipHealth',
    term: '籌碼健康度 / 籌碼評級',
    enTerm: 'Chip Health Score',
    category: 'core',
    metaphor: '這檔股票籌碼面的體檢分數（0~100 分）。',
    meaning: '整合主力買賣超、大戶持股比率與散戶動向之量化健康指數。',
    buySignal: '分數 > 75 分（良好/極佳），顯示大戶牢牢控盤，是優良多頭標的。',
    sellSignal: '分數 < 50 分（衰弱/危險），籌碼惡化，建議減碼或出場。',
  },

  // ==================== 03 多維度判讀 ====================
  radarInstitutional: {
    id: 'radarInstitutional',
    term: '法人維度 (多維雷達)',
    enTerm: 'Institutional Dimension',
    category: 'radar',
    metaphor: '外資與本土基金經理人這群正規軍的喜愛程度。',
    meaning: '近 20 日三大法人淨買賣超張數與土洋合買協同性分數。',
    buySignal: '法人分數 > 70 且土洋合買，有法人大資金抬轎，跟單買進勝率極高。',
    sellSignal: '法人分數 < 40 且連日提款賣超，表示法人棄守，應出清賣出。',
  },
  radarTrend: {
    id: 'radarTrend',
    term: '趨勢維度 (多維雷達)',
    enTerm: 'Trend Dimension',
    category: 'radar',
    metaphor: '大順風還是大逆風。',
    meaning: '短中長期均線（5/10/20/60）排列多空型態計分。',
    buySignal: '趨勢分數 > 70 代表全面順風，順勢買進做多。',
    sellSignal: '趨勢分數 < 40 代表逆風重重，切勿逆勢硬接飛刀。',
  },
  radarChips: {
    id: 'radarChips',
    term: '籌碼維度 (多維雷達)',
    enTerm: 'Chips Dimension',
    category: 'radar',
    metaphor: '籌碼沉澱乾淨程度。',
    meaning: '近 5 日主力淨流向與集中度計分。',
    buySignal: '籌碼分數 > 70 代表籌碼鎖定良好，容易被推升。',
    sellSignal: '籌碼分數 < 40 代表主力正在脫手倒貨。',
  },
  radarLiquidity: {
    id: 'radarLiquidity',
    term: '流動性維度 (多維雷達)',
    enTerm: 'Liquidity Dimension',
    category: 'radar',
    metaphor: '市場上的水深不深，買了想賣時能不能一秒變現。',
    meaning: '日均成交量與成交金額是否足夠充沛，杜絕無量跌停流動性枯竭。',
    buySignal: '流動性分數充足，大單進出滑價小，交易安全度高。',
    sellSignal: '流動性過低（每天幾十張）隨時可能面臨想賣賣不掉的風險，切勿重押。',
  },
  radarVolatility: {
    id: 'radarVolatility',
    term: '波動維度 (多維雷達)',
    enTerm: 'Volatility Dimension',
    category: 'radar',
    metaphor: '雲霄飛車的甩尾劇烈度。',
    meaning: '真實波動區間 (ATR) 與歷史波動率，評估震盪劇烈程度。',
    buySignal: '在低波動底部壓縮後剛開始溫和放大時買進，往往是主升段起點。',
    sellSignal: '高檔出現失控巨大震盪，常為主升段尾聲的大洗盤或出貨，應停利退場。',
  },
  radarMomentum: {
    id: 'radarMomentum',
    term: '動能維度 (多維雷達)',
    enTerm: 'Momentum Dimension',
    category: 'radar',
    metaphor: '跑步加速時向前衝刺的推力。',
    meaning: '股價相對於市場基準之相對強弱度 (RS) 與漲速斜率。',
    buySignal: '動能強勁飆高（> 75 分），強者恆強，可積極做多。',
    sellSignal: '動能背離衰竭，股價創高但動能無法跟上，宜逢高減碼。',
  },

  // ==================== 04 AI 籌碼熱區圖 ====================
  volumeResistance: {
    id: 'volumeResistance',
    term: '熱區壓力區',
    enTerm: 'Resistance Zone',
    category: 'volume',
    metaphor: '上方堆滿了大量套牢等待解套賣出的人群聚集帶。',
    meaning: '在當前股價上方的高密度成交量分佈帶。',
    buySignal: '放量強行穿越壓力區頂部，將壓力轉化為堅固支撐，為強烈追多買訊。',
    sellSignal: '接近壓力區下緣時如果量能不足無力突破，應先賣出獲利了結。',
  },
  volumeHeavy: {
    id: 'volumeHeavy',
    term: '大量成交區',
    enTerm: 'Heavy Volume Zone',
    category: 'volume',
    metaphor: '兵家必爭之地，歷史上最多金錢在這裡激烈交手。',
    meaning: '特定價格帶內累積了佔比極高的歷史總成交量（POC, Point of Control）。',
    buySignal: '股價站在大量成交區上方，這整塊區域就變成強烈支撐，回測守穩可買。',
    sellSignal: '股價跌破大量成交區下方，整塊區域反轉成為沉重蓋頭賣壓，應停損賣出。',
  },
  volumeDense: {
    id: 'volumeDense',
    term: '密集成交區',
    enTerm: 'Dense Trading Zone',
    category: 'volume',
    metaphor: '主力長時期在狹窄價格裡默默吃貨的價格區間。',
    meaning: '長天期換手密集的籌碼平台。',
    buySignal: '長紅 K 突破密集成交區上緣，代表整理結束將開啟主升段，為標準買點。',
    sellSignal: '長黑 K 跌破密集成交區下緣，代表打底失敗向下破位，應果斷賣出。',
  },
  volumeBreakeven: {
    id: 'volumeBreakeven',
    term: '價平區 / 平衡區',
    enTerm: 'Breakeven Zone',
    category: 'volume',
    metaphor: '買賣雙方勢均力敵、誰也沒佔便宜的公道價區域。',
    meaning: '買方與賣方在此價位損益大致兩平。',
    buySignal: '拉回此區獲得支撐且量縮不破，可逢低進場。',
    sellSignal: '跌破此區後回抽無力，應減碼避險。',
  },
  volumeSupport: {
    id: 'volumeSupport',
    term: '熱區支撐區 / 去撐區',
    enTerm: 'Support Zone',
    category: 'volume',
    metaphor: '底層的堅硬水泥地板，底下有一大批護盤買家守護。',
    meaning: '在當前股價下方的低位密集籌碼累積帶。',
    buySignal: '跌回支撐區不破出現紅 K 吞噬，是勝率最高、停損最小的絕佳買點。',
    sellSignal: '連最後一道支撐區都被灌破，代表底線蕩然無存，必須無條件賣出逃命！',
  },

  // ==================== 05 風險雷達圖 ====================
  // (與 radar 共享部分概念，補充專用風險概念)

  // ==================== 06 累積型 AI 預測路徑 ====================
  forecastUp: {
    id: 'forecastUp',
    term: '上漲機率 (AI 預測)',
    enTerm: 'Bullish Probability',
    category: 'forecast',
    metaphor: '明天出門大晴天的機率有多少。',
    meaning: '基於過去 60 日歷史幾何布朗運動與報酬率分佈，模型推估未來 10 日走揚的統計機率。',
    buySignal: '上漲機率 > 55% 且明顯高於下跌機率時，統計優勢站在多方，偏向買進。',
    sellSignal: '上漲機率跌破 35%，多方勝率極低，不宜買進。',
  },
  forecastRange: {
    id: 'forecastRange',
    term: '震盪機率 (AI 預測)',
    enTerm: 'Range-bound Probability',
    category: 'forecast',
    metaphor: '陰天平淡、股價原地打轉的機率。',
    meaning: '股價在上下 ±3% 狹窄區間內持續橫盤整理的統計機率。',
    buySignal: '震盪機率高時，切勿追高，僅可在區間下緣低接。',
    sellSignal: '震盪整理耗時費力，不想資金被卡住的投資人可換股操作。',
  },
  forecastDown: {
    id: 'forecastDown',
    term: '下跌機率 (AI 預測)',
    enTerm: 'Bearish Probability',
    category: 'forecast',
    metaphor: '下大雨甚至刮颱風的危險機率。',
    meaning: '統計推算未來 10 日向下跌破關鍵價位的機率。',
    buySignal: '下跌機率 < 25% 代表下檔風險極為有限，安全邊際高。',
    sellSignal: '下跌機率 > 45%~50%，危險警戒，手中有多單應儘速賣出或減碼！',
  },
  annualDrift: {
    id: 'annualDrift',
    term: '年化漂移指標',
    enTerm: 'Annualized Drift',
    category: 'forecast',
    metaphor: '這輛火車長期以來的平均巡航行進時速（正數代表向前開，負數代表向後滑）。',
    meaning: '對數報酬率在年化尺度下的統計平均趨勢斜率（例如 +19.4%）。',
    buySignal: '年化漂移為正且持續擴大，代表個股具備長期向上的內在動能。',
    sellSignal: '年化漂移轉為負值，代表長期趨勢已被空頭主導，應遠離或停損賣出。',
  },

  // ==================== 07 主力成本結構 ====================
  vwap20: {
    id: 'vwap20',
    term: '20日 VWAP / 主力平均成本',
    enTerm: '20-Day VWAP',
    category: 'cost',
    metaphor: '主力大戶過去 20 天每買進一張股票所花費的真實平均單價。',
    meaning: '成交量加權平均價 (Volume Weighted Average Price)，排除虛假小單影響。',
    buySignal: '現價高於 20日 VWAP（+3%~+8% 內），且回測獲得支撐，是主力的保護傘買點。',
    sellSignal: '現價跌破 20日 VWAP，主力已由賺錢轉為虧損，可能引發多殺多，必須停損賣出。',
  },

  // ==================== 08 法人行為計量 ====================
  foreignFlow: {
    id: 'foreignFlow',
    term: '外資買賣超',
    enTerm: 'Foreign Investors Net',
    category: 'institution',
    metaphor: '歐美外國大機構大法人的買進與賣出張數。',
    meaning: '外資當日總買進張數減去總賣出張數。',
    buySignal: '外資連續 3~5 天持續大買，通常是波段行情的最大火車頭，可順勢買進。',
    sellSignal: '外資由買轉賣且連續幾天狂倒數千張，常是高檔波段結束的警訊，應賣出。',
  },
  trustFlow: {
    id: 'trustFlow',
    term: '投信買賣超',
    enTerm: 'Investment Trust Net',
    category: 'institution',
    metaphor: '台灣本地公募基金經理人的團購進出。',
    meaning: '國內投信當日淨買賣超張數，特別擅長挖掘波段中小型飆股與季底作帳。',
    buySignal: '投信突然無預警連續加碼、買超佔成交量 5% 以上，常是中長線認養起跑買點！',
    sellSignal: '季底作帳結束或達到獲利目標時投信反手無情倒貨，應跟著賣出。',
  },
  dealerFlow: {
    id: 'dealerFlow',
    term: '自營商買賣超',
    enTerm: 'Dealer Net',
    category: 'institution',
    metaphor: '本土綜合券商自己拿自有資金玩的極短線操作。',
    meaning: '證券商自有部門（自營部與避險部門）的淨買賣超。',
    buySignal: '自營商避險大買通常伴隨權證熱度，短線可能暴衝。',
    sellSignal: '自營商操作以極短線隔日沖為主，不宜作為長期持有依據，隔日開高要防賣壓。',
  },
  totalInstFlow: {
    id: 'totalInstFlow',
    term: '三大法人合計',
    enTerm: 'Total Institutional Flow',
    category: 'institution',
    metaphor: '外資 + 投信 + 自營商三大正規軍加總的總兵力方向。',
    meaning: '三大法人當日買賣超張數加總。',
    buySignal: '「土洋合買」（外資與投信同時大買），多方力量最強大，全力做多買進！',
    sellSignal: '「土洋齊賣」（外資與投信同時大賣逃命），空方全面壓制，立刻出清持股！',
  },

  // ==================== 09 隔日沖風險分析 ====================
  turnoverRate: {
    id: 'turnoverRate',
    term: '籌碼過手率 / 換手率',
    enTerm: 'Turnover Rate',
    category: 'daytrade',
    metaphor: '這檔股票所有的籌碼在今天有多少比例換了新主人。',
    meaning: '當日成交量佔該個股在外流通總股本的比例。',
    buySignal: '在低檔爆出 5%~10% 健康換手率且股價收紅，代表新主力進場吸籌。',
    sellSignal: '在高檔單日過手率狂飆超過 25%~30%，代表籌碼失控換手頻繁，出貨風險極大，應賣出。',
  },
  dayTradeRatio: {
    id: 'dayTradeRatio',
    term: '沖銷比例 / 當沖率',
    enTerm: 'Day Trade Ratio',
    category: 'daytrade',
    metaphor: '今天市場上的買賣有多少人只是當天來回、一張都不打算留過夜的過客。',
    meaning: '當日當沖成交量佔當日總成交量的比率。',
    buySignal: '沖銷比例低（< 25%），籌碼多為波段持有，走勢較為穩健踏實。',
    sellSignal: '沖銷比例飆破 50%~60% 以上，代表全是當沖客在胡亂廝殺，極易開高走低，切勿追買。',
  },
  pullbackRisk: {
    id: 'pullbackRisk',
    term: '隔日回檔風險',
    enTerm: 'Pullback Risk',
    category: 'daytrade',
    metaphor: '今天買得很高興的人，明天一開盤被無情潑冷水的危險機率。',
    meaning: '統計隔日沖主力進駐後次日開盤出現賣壓壓回的風險指標。',
    buySignal: '回檔風險低（< 30%），明天開盤走勢相對安穩。',
    sellSignal: '回檔風險高（> 60%），明天早盤開高切記不要追價，反而是短線獲利賣出時機。',
  },
  intradayVolatility: {
    id: 'intradayVolatility',
    term: '日內波動率',
    enTerm: 'Intraday Volatility',
    category: 'daytrade',
    metaphor: '今天盤中高低點之間的心臟狂跳幅度。',
    meaning: '（今日最高價 - 今日最低價）/ 昨日收盤價之振幅百分比。',
    buySignal: '波動率溫和放大並帶方向突破，可跟隨進場。',
    sellSignal: '振幅超過 8% 以上巨幅洗盤，心臟不夠強的新手應減少部位避險。',
  },

  // ==================== 10 AI 多空能量棒 ====================
  bullEnergy: {
    id: 'bullEnergy',
    term: '多方能量',
    enTerm: 'Bull Energy',
    category: 'energy',
    metaphor: '拔河比賽中往多頭方向拉的總力道（綠色/紅色量能）。',
    meaning: '由主動買盤（內外盤買進量與紅 K 漲幅量）聚合計算的多方進攻能量。',
    buySignal: '多方能量 > 55% 且持續放大，多方佔據絕對優勢，積極做多買進。',
    sellSignal: '多方能量迅速縮小跌破 45%，顯示買盤力竭，應注意防守。',
  },
  bearEnergy: {
    id: 'bearEnergy',
    term: '空方能量',
    enTerm: 'Bear Energy',
    category: 'energy',
    metaphor: '拔河比賽中往空頭方向拖的總力道。',
    meaning: '由主動賣盤（內盤敲出量與黑 K 跌幅量）聚合計算的空方殺盤能量。',
    buySignal: '空方能量萎縮至 30% 以下，代表賣壓枯竭，隨時可能反彈。',
    sellSignal: '空方能量狂飆超過 55% 以上，空方重拳出擊，持股者應儘速賣出避險。',
  },
  bullBearRatio: {
    id: 'bullBearRatio',
    term: '量能多空比',
    enTerm: 'Bull/Bear Energy Ratio',
    category: 'energy',
    metaphor: '買方與賣方的力量倍數比（大於 1 代表買方力氣大，小於 1 代表賣方力氣大）。',
    meaning: '近 20 日紅 K 上漲量與黑 K 下跌量之累積比率（如 1.13 倍多）。',
    buySignal: '比率 > 1.10 倍且向上成長，買盤雄厚，可順應趨勢持續買進或續抱。',
    sellSignal: '比率跌破 0.90 倍且持續惡化，賣方主導局勢，應減碼賣出。',
  },

  healthScore: {
    id: 'healthScore',
    term: '健康度綜合評估表 / 綜合健康評分',
    enTerm: 'Comprehensive Health Score',
    category: 'health',
    metaphor: '五臟六腑的全身健康檢查總報告。',
    meaning: '加權整合籌碼、技術、動能、波動與法人 5 大面向之綜合體質評分。',
    buySignal: '總評優良（平均 > 70 分），體質健康無硬傷，安心買進抱牢！',
    sellSignal: '總評偏弱（平均 < 55 分），體質欠佳隱患多，應果斷減碼或賣出避險。',
  },
  chipsHealth: {
    id: 'chipsHealth',
    term: '籌碼健康度 (5環指標)',
    enTerm: 'Chips Health',
    category: 'health',
    metaphor: '血液循環是否暢通、有沒有毒素堆積。',
    meaning: '衡量籌碼是否在大戶手中穩定鎖碼的健康度百分比。',
    buySignal: '健康度 > 70%，籌碼穩定，不易大跌，可安心買進。',
    sellSignal: '健康度 < 40%，籌碼凌亂潰散，建議賣出。',
  },
  techHealth: {
    id: 'techHealth',
    term: '技術結構度 (5環指標)',
    enTerm: 'Technical Health',
    category: 'health',
    metaphor: '建築物的鋼筋骨架是否結實穩固。',
    meaning: '衡量均線多頭排列完整性與關鍵支撐守備強度的指數。',
    buySignal: '結構度 > 70%，多頭結構堅實，拉回皆為買點。',
    sellSignal: '結構度 < 40%，破線破底結構損壞，應停損賣出。',
  },
  momentumHealth: {
    id: 'momentumHealth',
    term: '資金動能度 (5環指標)',
    enTerm: 'Momentum Health',
    category: 'health',
    metaphor: '油箱裡的汽油滿不滿。',
    meaning: '成交量能是否充沛與價量配合度的指標。',
    buySignal: '動能度 > 70%，價量齊揚，隨時會加速衝刺。',
    sellSignal: '動能度 < 40%，嚴重無量盤跌，買氣衰竭應出場。',
  },
  volatilityRisk: {
    id: 'volatilityRisk',
    term: '波動風險度 (5環指標)',
    enTerm: 'Volatility Risk',
    category: 'health',
    metaphor: '路面顛簸凹凸的危險程度。',
    meaning: '衡量短線急殺急拉或無常甩轎的風險指數。',
    buySignal: '風險度處於合理區間（< 40%），走勢平穩溫和。',
    sellSignal: '風險度狂飆（> 70%），容易被巨幅震盪洗出場，應適度減碼防守。',
  },
  instSupport: {
    id: 'instSupport',
    term: '法人支撐度 (5環指標)',
    enTerm: 'Institutional Support',
    category: 'health',
    metaphor: '背後有沒有強大的富爸爸在撐腰。',
    meaning: '外資與投信近期的買進護盤意願與資金深度。',
    buySignal: '支撐度 > 75%，法人大舉進駐護盤，有強烈底部支撐。',
    sellSignal: '支撐度 < 40%，法人不聞不問甚至提款，應謹慎停損。',
  },

  // ==================== 12 AI 主力動態信號判斷 ====================
  trafficLight: {
    id: 'trafficLight',
    term: '紅綠信號燈',
    enTerm: 'Traffic Light Signal',
    category: 'signal',
    metaphor: '十字路口的交通號誌：綠燈行、紅燈停、黃燈減速。',
    meaning: 'AI 綜合 18 項量化指標輸出的最終即時戰術號誌。',
    buySignal: '🟩 【綠燈】：多頭主攻，所有指標合流共振，可大膽買進或持股續抱！',
    sellSignal: '🟥 【紅燈】：空頭警戒或大戶出貨，立即停損、減碼或出清離場！',
    neutralWarning: '🟨 【黃燈】：震盪洗盤或多空未決，保持觀望，切勿過度交易。',
  },

  marketSentiment: {
    id: 'marketSentiment',
    term: '台股市場情緒儀表板',
    enTerm: 'Market Sentiment Dashboard',
    category: 'sentiment',
    metaphor: '市場大眾的心理溫度計（恐慌、中性或貪婪）。',
    meaning: '由散戶融資比、法人期現貨留倉與主力大單情緒加權計算之全市場情緒指數（0~100）。',
    buySignal: '指針處於極度恐慌（< 30）且底部出量，為「別人恐懼我貪婪」逆勢買點！',
    sellSignal: '指針處於極度狂熱（> 75），人人盲目追高，高檔頭部隨時反轉，應賣出離場！',
    neutralWarning: '指針處於中性區間（45~60）時，代表市場情緒穩定無過度投機，順應個股趨勢操作即可。',
  },
  retailSentiment: {
    id: 'retailSentiment',
    term: '散戶情緒',
    enTerm: 'Retail Sentiment',
    category: 'sentiment',
    metaphor: '路邊散戶群眾的興奮或恐慌程度。',
    meaning: '由融資融券增減、小單進出佔比與討論度綜合計算之散戶情緒指數。',
    buySignal: '散戶情緒極度悲觀恐慌（< 25%），通常是「別人恐懼我貪婪」的絕佳低接買點！',
    sellSignal: '散戶情緒極度狂熱自滿（> 75%），人人以為自己是股神時，大頭部即將來臨，快賣！',
  },
  instSentiment: {
    id: 'instSentiment',
    term: '法人情緒',
    enTerm: 'Institutional Sentiment',
    category: 'sentiment',
    metaphor: '專業投資機構經理人的貪婪與恐懼溫度。',
    meaning: '機構法人大單進出積極度與期貨現貨對沖偏向。',
    buySignal: '法人情緒偏向積極樂觀（> 65%），機構資金持續流入。',
    sellSignal: '法人情緒轉為防禦避險（< 40%），警惕大跌風險。',
  },
  mainSentiment: {
    id: 'mainSentiment',
    term: '主力情緒',
    enTerm: 'Main Force Sentiment',
    category: 'sentiment',
    metaphor: '大戶操盤手的作多意願。',
    meaning: '關鍵分點大戶推升與護盤意志。',
    buySignal: '主力情緒高昂，大戶帶頭衝鋒，買進跟轎。',
    sellSignal: '主力情緒低落渙散，缺乏主帥帶隊，切勿留戀。',
  },

  // ==================== 14 AI 信心維度 ====================
  aiConfidence: {
    id: 'aiConfidence',
    term: 'AI 模型信心度',
    enTerm: 'AI Model Confidence',
    category: 'confidence',
    metaphor: 'AI 顧問在給出這個判斷時，自己心裡有多大的把握。',
    meaning: '綜合特徵覆蓋率、數據完整度、信號收斂度與歷史回測勝率之加權信心評分。',
    buySignal: 'AI 信心度 > 80% 且發出買訊時，決策勝率極高，可依照建議操作。',
    sellSignal: 'AI 信心度低（< 50%）時，代表市場雜訊過多、訊號分歧，新手應多看少做觀望為宜。',
  },

  // ==================== 16 買賣力分布圖 ====================
  bigBuyerFlow: {
    id: 'bigBuyerFlow',
    term: '大戶買盤比例',
    enTerm: 'Big Buyer Flow',
    category: 'distribution',
    metaphor: '今天買進的資金裡，有多少是有錢大老闆投下的巨款。',
    meaning: '單筆成交超過百萬以上的大額買單成交佔比。',
    buySignal: '大戶買盤 > 40%，代表聰明錢強烈看好並進駐，是強勢多頭訊號，買進！',
    sellSignal: '大戶買盤萎縮至 15% 以下，大戶全在觀望，缺乏有力買盤。',
  },
  retailBuyerFlow: {
    id: 'retailBuyerFlow',
    term: '散戶買盤比例',
    enTerm: 'Retail Buyer Flow',
    category: 'distribution',
    metaphor: '今天買進的資金裡，有多少是零碎小散戶在跟風買。',
    meaning: '單筆成交額偏小的小額買單成交佔比。',
    buySignal: '散戶買盤極低、全是大戶在收購，籌碼最為集中。',
    sellSignal: '散戶買盤暴增至 40%~50% 以上而大戶不買，標準散戶接刀套牢盤，不宜買進。',
  },
  retailSellerFlow: {
    id: 'retailSellerFlow',
    term: '散戶賣盤比例',
    enTerm: 'Retail Seller Flow',
    category: 'distribution',
    metaphor: '今天有多少散戶在嚇得認賠拋售股票。',
    meaning: '小額賣單佔總成交量的比率。',
    buySignal: '散戶賣盤大增而股價跌不下去（全被大戶接走），常是洗盤結束的起漲轉折點。',
    sellSignal: '散戶大舉拋售引發多殺多踩踏，若無大戶承接將加速崩跌。',
  },

  // ==================== 17 多空強度分布 ====================
  bullStrength: {
    id: 'bullStrength',
    term: '多方強度',
    enTerm: 'Bull Strength Tier',
    category: 'strength',
    metaphor: '多頭軍隊的兵力與戰鬥意志等級。',
    meaning: '多頭進攻訊號密度與突破動能之綜合強度評級（0~100）。',
    buySignal: '多方強度 > 70 且高於空方強度 20 以上，多頭完勝，積極作多！',
    sellSignal: '多方強度跌破 40，多頭無力進攻，應離場觀望。',
  },
  bearStrength: {
    id: 'bearStrength',
    term: '空方強度',
    enTerm: 'Bear Strength Tier',
    category: 'strength',
    metaphor: '空頭軍隊的殺盤火力。',
    meaning: '空頭賣壓、破位信號與籌碼出脫之綜合強度評級。',
    buySignal: '空方強度 < 30，空頭毫無反抗能力，持股安心續抱。',
    sellSignal: '空方強度狂飆（> 60），空軍全面壓境，務必賣出減碼防守！',
  },

  // ==================== 18 主力追蹤總評判 (MLP-AI) ====================
  mlpSemanticVerdict: {
    id: 'mlpSemanticVerdict',
    term: '主力追蹤總評判 (MLP-AI)',
    enTerm: 'Main Force Semantic Verdict',
    category: 'verdict',
    metaphor: 'AI 總指揮官給出的最終作戰總結與終極行動命令。',
    meaning: '由類神經網絡 (MLP) 聚合全盤價量、籌碼、成本與風險維度推導出的最高決策指令。',
    buySignal: '若命令為「逢低承接」或「鎖碼推升」：多方勝率極高，新手可大膽進場買進！',
    sellSignal: '若命令為「調節減碼」或「高檔出貨」：大戶正在跑路，新手應立即停損或賣出股票換現金！',
    neutralWarning: '若命令為「區間震盪」或「洗盤觀察」：多空僵持，建議空手觀望，靜待表態。',
  },

  // ==================== 底部任務視圖切換列 ====================
  viewTask1: {
    id: 'viewTask1',
    term: '任務一：綜合分析報告',
    enTerm: 'Task 1: Comprehensive Analysis',
    category: 'view',
    metaphor: '飛機駕駛艙的全景儀表盤，18 張卡片全面監控。',
    meaning: '匯聚價量、均線、法人、籌碼、風險與 AI 預測之 18 張多維 Bento-Grid 卡片全景圖。',
    buySignal: '當多數卡片呈現綠色或強勢偏多共振時，為最佳進場買點。',
    sellSignal: '當多數卡片轉為紅色高風險或主力倒貨時，應立即減碼避險。',
  },
  viewTask2: {
    id: 'viewTask2',
    term: '任務二：技術警示報告',
    enTerm: 'Task 2: Technical Alerts Report',
    category: 'view',
    metaphor: '戰情中心的火警與危險警報系統。',
    meaning: '專注於均線破位、高檔爆量、隔日沖倒貨與指標背離之即時異常警示。',
    buySignal: '警示清零且出現起漲確認信號時，可安心買進。',
    sellSignal: '頻繁跳出「跌破生命線」或「高檔主力倒貨」警示時，切勿心存僥倖，應果斷停損賣出！',
  },
  viewTask3: {
    id: 'viewTask3',
    term: '任務三：KD + MA 圖表',
    enTerm: 'Task 3: KD + MA Chart View',
    category: 'view',
    metaphor: '短線衝刺與防守的雙重導航儀。',
    meaning: '聚焦於 5/10/20/60 均線趨勢與 KD 隨機指標超買超賣黃金交叉之短線戰術視圖。',
    buySignal: 'KD 在 20 以下黃金交叉，且股價站回 5 日均線之上，為短線噴出買訊。',
    sellSignal: 'KD 在 80 以上死亡交叉，且跌破 5 日線，短線衝刺結束應獲利賣出。',
  },
  viewTask4: {
    id: 'viewTask4',
    term: '任務四：MACD 圖表',
    enTerm: 'Task 4: MACD Chart View',
    category: 'view',
    metaphor: '大卡車真實行進方向與油門力道儀表。',
    meaning: '聚焦於中長線趨勢平滑異同均線 (MACD) 與紅白綠柱動能變化。',
    buySignal: '0 軸上方紅柱初生且快線上穿慢線，代表波段大多頭行情啟動，買進！',
    sellSignal: '綠柱持續拉長且跌破 0 軸，中線空頭成形，持股必須出清賣出。',
  },
  viewTask5: {
    id: 'viewTask5',
    term: '原始資料表 / 數據明細',
    enTerm: 'Task 5: Raw Data Table',
    category: 'view',
    metaphor: '實驗室的最底層原始數據清單，供查核對帳。',
    meaning: '依日期逐筆列出開高低收、成交量、融資融券與三大法人淨買賣超之完整數值。',
    buySignal: '可核對法人連續買超張數與股價漲幅是否相符。',
    sellSignal: '發現數據中法人連日大賣但股價假拉抬時，應防範誘多陷阱。',
  },
};

/**
 * 依 ID 取得字典條目
 */
export function getGlossaryEntry(id: string): GlossaryEntry | undefined {
  return AI_FORCE_GLOSSARY[id];
}

/**
 * 診斷主力成本與現價多空關係 (動態數值即時評估)
 */
export function diagnoseMainForceCost(currentPrice: number, mainForceCost: number): string {
  if (!mainForceCost || mainForceCost <= 0) return '暫無主力成本資料';
  const diffPercent = ((currentPrice - mainForceCost) / mainForceCost) * 100;
  const formattedPrice = currentPrice.toLocaleString();
  const formattedCost = mainForceCost.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  const formattedDiff = `${diffPercent >= 0 ? '+' : ''}${diffPercent.toFixed(1)}%`;

  if (diffPercent >= 0) {
    return `現價 ${formattedPrice} 元高於主力成本 ${formattedCost} 元 (${formattedDiff})。主力處於賺錢獲利區，有強烈意願守住成本價防線，屬【偏多守穩】狀態！`;
  } else {
    return `現價 ${formattedPrice} 元已跌破主力成本 ${formattedCost} 元 (${formattedDiff})。主力大戶已陷入虧損套牢，可能引發認賠砍單賣壓，屬【偏空危險】狀態，建議嚴格停損！`;
  }
}

/**
 * 診斷隔日沖風險 (動態數值即時評估)
 */
export function diagnoseDayTradeRisk(dayTradeRiskPercent: number, dayTradeRatio: number): string {
  if (dayTradeRiskPercent >= 50 || dayTradeRatio >= 40) {
    return `目前隔日沖比例偏高 (風險指數 ${dayTradeRiskPercent}%, 沖銷比 ${dayTradeRatio}%)。明天開盤極易出現「開高走低倒貨賣壓」，新手早盤切忌追高買進，甚至應逢高賣出！`;
  }
  return `隔日沖風險較低 (風險指數 ${dayTradeRiskPercent}%)。籌碼以波段持有為主，短線倒貨賣壓相對溫和，走勢較為健康！`;
}

/**
 * 診斷 AI 預測路徑方向 (動態數值即時評估)
 */
export function diagnoseForecastCone(probUp: number, probDown: number): string {
  if (probUp >= 45 && probUp > probDown) {
    return `AI 預測未來上漲機率高達 ${probUp}% (大於下跌機率 ${probDown}%)，統計優勢站在多方，偏向買進做多！`;
  } else if (probDown >= 45 && probDown > probUp) {
    return `AI 預測未來下跌風險高達 ${probDown}% (大於上漲機率 ${probUp}%)，多方勝率低，偏向減碼賣出觀望！`;
  }
  return `AI 預測上漲機率 (${probUp}%) 與下跌風險 (${probDown}%) 勢均力敵，預期陷入區間整理，建議多看少做。`;
}

/**
 * 診斷多空能量比 (動態數值即時評估)
 */
export function diagnoseBullBearEnergy(bullEnergy: number, bearEnergy: number, ratio: number): string {
  if (bullEnergy > bearEnergy || ratio >= 1.05) {
    return `目前多方能量佔 ${bullEnergy}%，量能多空比達 ${ratio.toFixed(2)} 倍，多方佔優，買盤力道強勁！`;
  } else if (bearEnergy > bullEnergy || ratio < 0.95) {
    return `目前空方能量佔 ${bearEnergy}%，量能多空比降至 ${ratio.toFixed(2)} 倍，空方佔優，賣壓沉重，應注意防守！`;
  }
  return `多空能量均衡 (多 ${bullEnergy}% / 空 ${bearEnergy}%)，多空拉鋸僵持中。`;
}

/**
 * 診斷健康度綜合評分 (動態數值即時評估)
 */
export function diagnoseHealthScore(score: number): string {
  if (score >= 75) {
    return `綜合健康評分達 ${score} 分，個股體質優良，籌碼與技術面共振向上，是值得信賴的多頭標的！`;
  } else if (score <= 55) {
    return `綜合健康評分僅 ${score} 分，個股體質偏弱，存在籌碼渙散或破線隱憂，建議減碼或觀望！`;
  }
  return `綜合健康評分為 ${score} 分，體質普通，處於整理觀察期。`;
}
