import fs from 'fs';

// Read current stockDictionary.ts
const targetPath = 'd:/APP/股票紀錄/src/data/stockDictionary.ts';
const content = fs.readFileSync(targetPath, 'utf8');

// Extract current TW stocks block
const twMatch = content.match(/export const STATIC_TW_STOCKS: StockDictionaryItem\[\] = \[([\s\S]*?)\];/);
const twBlock = twMatch ? twMatch[1] : '';

// We can read existing US stocks via regex
const usRegex = /\{\s*symbol:\s*'([^']+)',\s*name:\s*'([^']+)',(?:\s*englishName:\s*'([^']*)',)?\s*market:\s*'US',\s*category:\s*'([^']+)',\s*source:\s*'US_POPULAR'\s*\}/g;
const usMap = new Map();

let match;
while ((match = usRegex.exec(content)) !== null) {
  const symbol = match[1].toUpperCase();
  usMap.set(symbol, {
    symbol,
    name: match[2],
    englishName: match[3] || '',
    category: match[4],
    market: 'US',
    source: 'US_POPULAR',
  });
}

// Add more S&P 500 / Nasdaq 100 components to reach 550+
const extraComponents = [
  { symbol: 'A', name: '安捷倫科技', englishName: 'Agilent Technologies Inc.', category: '生命科學儀器' },
  { symbol: 'AAL', name: '美國航空', englishName: 'American Airlines Group Inc.', category: '航空運輸' },
  { symbol: 'AAPL', name: '蘋果', englishName: 'Apple Inc.', category: '消費電子' },
  { symbol: 'ABBV', name: '艾伯維', englishName: 'AbbVie Inc.', category: '生技製藥' },
  { symbol: 'ABNB', name: '愛彼迎 (Airbnb)', englishName: 'Airbnb Inc.', category: '旅宿平台' },
  { symbol: 'ABT', name: '亞培', englishName: 'Abbott Laboratories', category: '醫療器材' },
  { symbol: 'ACGL', name: '阿奇資本 (Arch Capital)', englishName: 'Arch Capital Group Ltd.', category: '特種保險' },
  { symbol: 'ACN', name: '埃森哲', englishName: 'Accenture plc Class A', category: 'IT顧問' },
  { symbol: 'ADBE', name: 'Adobe', englishName: 'Adobe Inc.', category: '應用軟體' },
  { symbol: 'ADI', name: '亞德諾半導體', englishName: 'Analog Devices Inc.', category: '類比晶片' },
  { symbol: 'ADM', name: '艾地盟 (Archer-Daniels-Midland)', englishName: 'Archer-Daniels-Midland Company', category: '農產糧商' },
  { symbol: 'ADP', name: '安德普翰 (自動數據處理)', englishName: 'Automatic Data Processing Inc.', category: '人力資源軟體' },
  { symbol: 'ADSK', name: '歐特克 (Autodesk)', englishName: 'Autodesk Inc.', category: '設計軟體' },
  { symbol: 'AEE', name: '阿莫倫 (Ameren)', englishName: 'Ameren Corporation', category: '電力公用' },
  { symbol: 'AEP', name: '美國電力', englishName: 'American Electric Power', category: '電力公用' },
  { symbol: 'AES', name: '愛爾斯能源', englishName: 'The AES Corporation', category: '電力公用' },
  { symbol: 'AFL', name: '美國家庭人壽 (Aflac)', englishName: 'Aflac Incorporated', category: '醫療保險' },
  { symbol: 'AIG', name: '美國國際集團', englishName: 'American International Group', category: '多元保險' },
  { symbol: 'AIZ', name: '信安保險 (Assurant)', englishName: 'Assurant Inc.', category: '財產保險' },
  { symbol: 'AJG', name: '蓋拉格保險', englishName: 'Arthur J. Gallagher & Co.', category: '保險經紀' },
  { symbol: 'AKAM', name: '阿卡邁科技 (Akamai)', englishName: 'Akamai Technologies Inc.', category: 'CDN雲端' },
  { symbol: 'ALB', name: '雅寶 (Albemarle 鋰礦)', englishName: 'Albemarle Corporation', category: '特種化學' },
  { symbol: 'ALGN', name: '愛齊科技 (隱適美)', englishName: 'Align Technology Inc.', category: '齒顎矯正' },
  { symbol: 'ALL', name: '全州保險 (Allstate)', englishName: 'The Allstate Corporation', category: '財產保險' },
  { symbol: 'ALLE', name: '安朗傑 (Allegion)', englishName: 'Allegion plc', category: '安防五金' },
  { symbol: 'AMAT', name: '應用材料', englishName: 'Applied Materials Inc.', category: '半導體設備' },
  { symbol: 'AMCR', name: '安姆科 (Amcor 包裝)', englishName: 'Amcor plc', category: '包裝材料' },
  { symbol: 'AMD', name: '超微半導體', englishName: 'Advanced Micro Devices Inc.', category: '半導體' },
  { symbol: 'AME', name: '阿美特克 (AMETEK)', englishName: 'AMETEK Inc.', category: '精密儀器' },
  { symbol: 'AMGN', name: '安進 (Amgen)', englishName: 'Amgen Inc.', category: '生物製藥' },
  { symbol: 'AMP', name: '美盛金融 (Ameriprise)', englishName: 'Ameriprise Financial Inc.', category: '財富管理' },
  { symbol: 'AMT', name: '美國電塔 (American Tower)', englishName: 'American Tower Corporation', category: '電塔REIT' },
  { symbol: 'AMZN', name: '亞馬遜', englishName: 'Amazon.com Inc.', category: '電子商務' },
  { symbol: 'ANET', name: 'Arista Networks', englishName: 'Arista Networks Inc.', category: '雲端網路' },
  { symbol: 'ANSS', name: 'ANSYS', englishName: 'ANSYS Inc.', category: '工程模擬' },
  { symbol: 'AON', name: '怡安保險 (Aon)', englishName: 'Aon plc Class A', category: '保險經紀' },
  { symbol: 'AOS', name: '史密斯熱水器 (A. O. Smith)', englishName: 'A. O. Smith Corporation', category: '熱水淨水' },
  { symbol: 'APA', name: '阿帕契石油 (APA Corp)', englishName: 'APA Corporation', category: '石油開採' },
  { symbol: 'APD', name: '空氣產品公司 (Air Products)', englishName: 'Air Products and Chemicals Inc.', category: '工業氣體' },
  { symbol: 'APH', name: '安費諾', englishName: 'Amphenol Corporation', category: '連接器' },
  { symbol: 'APTV', name: '安波福 (Aptiv 汽車電子)', englishName: 'Aptiv PLC', category: '車用電子' },
  { symbol: 'ARE', name: '亞歷山大房產 (生技地產REIT)', englishName: 'Alexandria Real Estate Equities', category: '生醫地產REIT' },
  { symbol: 'ATO', name: '阿莫斯能源 (Atmos Energy)', englishName: 'Atmos Energy Corporation', category: '天然氣公用' },
  { symbol: 'AVB', name: '阿瓦隆灣社區 (高級公寓REIT)', englishName: 'AvalonBay Communities Inc.', category: '住宅地產REIT' },
  { symbol: 'AVGO', name: '博通', englishName: 'Broadcom Inc.', category: '半導體' },
  { symbol: 'AVY', name: '艾利丹尼森 (Avery Dennison)', englishName: 'Avery Dennison Corporation', category: '標籤材料' },
  { symbol: 'AWK', name: '美國水務 (American Water Works)', englishName: 'American Water Works Company', category: '自來水公用' },
  { symbol: 'AXON', name: '阿克森科技 (Axon 泰瑟槍/執法記錄儀)', englishName: 'Axon Enterprise Inc.', category: '公共安全科技' },
  { symbol: 'AXP', name: '美國運通 (American Express)', englishName: 'American Express Company', category: '信用卡金融' },
  { symbol: 'AZO', name: '汽車地帶 (AutoZone)', englishName: 'AutoZone Inc.', category: '汽車維修零件' },
  { symbol: 'BA', name: '波音 (Boeing)', englishName: 'The Boeing Company', category: '航太民航機' },
  { symbol: 'BAC', name: '美國銀行', englishName: 'Bank of America Corporation', category: '多元銀行' },
  { symbol: 'BALL', name: '波爾包裝 (Ball Corp 鋁罐金屬)', englishName: 'Ball Corporation', category: '金屬包裝' },
  { symbol: 'BAX', name: '百特醫療 (Baxter 透析洗腎)', englishName: 'Baxter International Inc.', category: '醫療設備' },
  { symbol: 'BBWI', name: '維多利亞的秘密母公司 (Bath & Body Works)', englishName: 'Bath & Body Works Inc.', category: '香氛沐浴零售' },
  { symbol: 'BBY', name: '百思買 (Best Buy 3C電器)', englishName: 'Best Buy Co. Inc.', category: '3C家電連鎖' },
  { symbol: 'BDX', name: '必帝醫療 (Becton Dickinson 注射針筒)', englishName: 'Becton Dickinson and Company', category: '醫療耗材' },
  { symbol: 'BEN', name: '富蘭克林坦伯頓 (Franklin Resources)', englishName: 'Franklin Resources Inc.', category: '資產管理' },
  { symbol: 'BF.B', name: '布朗霍文 (傑克丹尼威士忌)', englishName: 'Brown-Forman Corporation Class B', category: '烈酒釀造' },
  { symbol: 'BG', name: '邦吉 (Bunge 國際糧商四大之一)', englishName: 'Bunge Global SA', category: '農產品糧商' },
  { symbol: 'BIIB', name: '百健 (Biogen)', englishName: 'Biogen Inc.', category: '神經生技' },
  { symbol: 'BK', name: '紐約梅隆銀行', englishName: 'The Bank of New York Mellon Corp.', category: '託管銀行' },
  { symbol: 'BKNG', name: 'Booking Holdings (繽客)', englishName: 'Booking Holdings Inc.', category: '線上旅遊' },
  { symbol: 'BKR', name: '貝克休斯 (Baker Hughes)', englishName: 'Baker Hughes Company', category: '油氣設備' },
  { symbol: 'BLDR', name: '建築供應先鋒 (Builders FirstSource)', englishName: 'Builders FirstSource Inc.', category: '建築耗材通路' },
  { symbol: 'BLK', name: '貝萊德 (BlackRock)', englishName: 'BlackRock Inc.', category: '資產管理' },
  { symbol: 'BMY', name: '必治妥施貴寶 (Bristol Myers Squibb)', englishName: 'Bristol-Myers Squibb Company', category: '生技製藥' },
  { symbol: 'BR', name: '布羅德里奇金融 (Broadridge)', englishName: 'Broadridge Financial Solutions', category: '金融科技' },
  { symbol: 'BRK.B', name: '波克夏海瑟威 B (巴菲特)', englishName: 'Berkshire Hathaway Inc. Class B', category: '多元控股' },
  { symbol: 'BRO', name: '布朗保險 (Brown & Brown)', englishName: 'Brown & Brown Inc.', category: '保險經紀' },
  { symbol: 'BSX', name: '波士頓科學 (Boston Scientific)', englishName: 'Boston Scientific Corporation', category: '醫療器材' },
  { symbol: 'BWA', name: '博格華納 (BorgWarner 汽車傳動)', englishName: 'BorgWarner Inc.', category: '汽車傳動系統' },
  { symbol: 'BX', name: '黑石集團 (Blackstone)', englishName: 'Blackstone Inc.', category: '私募股權' },
  { symbol: 'BXP', name: '波士頓地產 (BXP 商辦REIT)', englishName: 'BXP Inc.', category: '商辦大樓REIT' },
  { symbol: 'C', name: '花旗集團', englishName: 'Citigroup Inc.', category: '多元銀行' },
  { symbol: 'CAG', name: '康尼格拉食品 (Conagra Brands)', englishName: 'Conagra Brands Inc.', category: '包裝食品' },
  { symbol: 'CAH', name: '卡地納健康 (Cardinal Health)', englishName: 'Cardinal Health Inc.', category: '藥品物流' },
  { symbol: 'CARR', name: '開利空調 (Carrier HVAC散熱)', englishName: 'Carrier Global Corporation', category: '冷凍空調' },
  { symbol: 'CAT', name: '開拓重工 (Caterpillar)', englishName: 'Caterpillar Inc.', category: '重型機具' },
  { symbol: 'CB', name: '安達保險 (Chubb)', englishName: 'Chubb Limited', category: '財產保險' },
  { symbol: 'CBOE', name: '芝加哥選擇權交易所', englishName: 'Cboe Global Markets Inc.', category: '選擇權交易所' },
  { symbol: 'CBRE', name: '世邦魏理仕 (CBRE 商用地產)', englishName: 'CBRE Group Inc. Class A', category: '地產仲介服務' },
  { symbol: 'CCI', name: '冠城國際 (Crown Castle 小型基地台REIT)', englishName: 'Crown Castle Inc.', category: '通訊鐵塔REIT' },
  { symbol: 'CCL', name: '嘉年華郵輪 (Carnival)', englishName: 'Carnival Corporation & plc', category: '郵輪度假' },
  { symbol: 'CDNS', name: '益華電腦 (Cadence)', englishName: 'Cadence Design Systems Inc.', category: 'EDA晶片軟體' },
  { symbol: 'CDW', name: 'CDW資訊科技通路', englishName: 'CDW Corporation', category: 'IT解決方案' },
  { symbol: 'CE', name: '塞拉尼斯 (Celanese 特種化學)', englishName: 'Celanese Corporation', category: '化學材料' },
  { symbol: 'CEG', name: '星座能源 (Constellation AI核能發電)', englishName: 'Constellation Energy Corp.', category: '核能發電' },
  { symbol: 'CF', name: 'CF工業 (CF Industries 氮肥化肥)', englishName: 'CF Industries Holdings Inc.', category: '農業肥料' },
  { symbol: 'CFG', name: '公民金融 (Citizens Financial)', englishName: 'Citizens Financial Group Inc.', category: '區域銀行' },
  { symbol: 'CHD', name: '雀馳 (Church & Dwight 小蘇打)', englishName: 'Church & Dwight Co. Inc.', category: '家用品' },
  { symbol: 'CHRW', name: '羅賓遜全球物流 (C.H. Robinson)', englishName: 'C.H. Robinson Worldwide Inc.', category: '貨運承攬' },
  { symbol: 'CHTR', name: '特許通訊 (Charter 寬頻有線)', englishName: 'Charter Communications Inc.', category: '寬頻電信' },
  { symbol: 'CI', name: '信諾保險 (Cigna)', englishName: 'The Cigna Group', category: '醫療保險' },
  { symbol: 'CINF', name: '辛辛那提金融 (Cincinnati Financial)', englishName: 'Cincinnati Financial Corporation', category: '財產保險' },
  { symbol: 'CL', name: '高露潔-棕欖 (Colgate 牙膏)', englishName: 'Colgate-Palmolive Company', category: '口腔護理' },
  { symbol: 'CLX', name: '高樂氏 (Clorox 漂白水消毒)', englishName: 'The Clorox Company', category: '清潔消毒' },
  { symbol: 'CMA', name: '聯信銀行 (Comerica)', englishName: 'Comerica Incorporated', category: '商業銀行' },
  { symbol: 'CMCSA', name: '康卡斯特 (Comcast)', englishName: 'Comcast Corporation', category: '傳媒電信' },
  { symbol: 'CME', name: '芝加哥商品交易所 (CME)', englishName: 'CME Group Inc.', category: '期貨交易所' },
  { symbol: 'CMG', name: '奇波雷墨西哥燒烤 (Chipotle)', englishName: 'Chipotle Mexican Grill Inc.', category: '休閒快餐' },
  { symbol: 'CMS', name: 'CMS能源', englishName: 'CMS Energy Corporation', category: '電力公用' },
  { symbol: 'CNC', name: '森特尼 (Centene 醫保服務)', englishName: 'Centene Corporation', category: '健康保險' },
  { symbol: 'CNP', name: '中心點能源 (CenterPoint Energy)', englishName: 'CenterPoint Energy Inc.', category: '電力燃氣' },
  { symbol: 'COF', name: '第一資本金融 (Capital One)', englishName: 'Capital One Financial Corp.', category: '信用卡消費金融' },
  { symbol: 'COO', name: '庫博光學 (CooperCompanies 隱形眼鏡)', englishName: 'The Cooper Companies Inc.', category: '隱形眼鏡' },
  { symbol: 'COP', name: '康菲石油 (ConocoPhillips)', englishName: 'ConocoPhillips', category: '石油開採' },
  { symbol: 'COR', name: '科源 (Cencora 醫藥批發分銷)', englishName: 'Cencora Inc.', category: '藥品分銷' },
  { symbol: 'COST', name: '好市多 (Costco)', englishName: 'Costco Wholesale Corporation', category: '倉儲量販' },
  { symbol: 'CPAY', name: '科沛 (Corpay 商業車隊支付)', englishName: 'Corpay Inc.', category: '車隊支付Fintech' },
  { symbol: 'CPB', name: '金寶湯 (Campbell Soup)', englishName: 'Campbell Soup Company', category: '罐頭食品' },
  { symbol: 'CPRT', name: '科帕特 (Copart 事故車拍賣龍頭)', englishName: 'Copart Inc.', category: '車輛在線拍賣' },
  { symbol: 'CPT', name: '康登地產 (Camden Property 公寓REIT)', englishName: 'Camden Property Trust', category: '住宅地產REIT' },
  { symbol: 'CRL', name: '查爾斯河實驗室 (Charles River 實驗動物)', englishName: 'Charles River Laboratories Intl', category: '生醫實驗CRO' },
  { symbol: 'CRM', name: '賽富時 (Salesforce)', englishName: 'Salesforce Inc.', category: 'CRM企業雲端' },
  { symbol: 'CRWD', name: 'CrowdStrike (雲端終端資安)', englishName: 'CrowdStrike Holdings Inc.', category: '資安防護' },
  { symbol: 'CSCO', name: '思科 (Cisco 網路路由器交換器)', englishName: 'Cisco Systems Inc.', category: '網通硬體' },
  { symbol: 'CSGP', name: '科斯塔集團 (CoStar 房產大數據)', englishName: 'CoStar Group Inc.', category: '地產資訊服務' },
  { symbol: 'CSX', name: 'CSX鐵路運輸', englishName: 'CSX Corporation', category: '貨運鐵路' },
  { symbol: 'CTAS', name: '信達思 (Cintas 制服租賃清潔)', englishName: 'Cintas Corporation', category: '企業制服清潔' },
  { symbol: 'CTRA', name: '科特拉能源 (Coterra Energy)', englishName: 'Coterra Energy Inc.', category: '天然氣開採' },
  { symbol: 'CTSH', name: '高知特資訊 (Cognizant IT外包)', englishName: 'Cognizant Technology Solutions', category: 'IT諮詢外包' },
  { symbol: 'CTVA', name: '科迪華 (Corteva 農業種子與農藥)', englishName: 'Corteva Inc.', category: '農化種子' },
  { symbol: 'CVS', name: 'CVS健康 (連鎖藥局與Aetna保險)', englishName: 'CVS Health Corporation', category: '藥局與保險' },
  { symbol: 'CVX', name: '雪佛龍 (Chevron 石油巨擘)', englishName: 'Chevron Corporation', category: '綜合石油' },
  { symbol: 'CZR', name: '凱撒娛樂 (Caesars 賭場連鎖)', englishName: 'Caesars Entertainment Inc.', category: '賭場博弈' },
  { symbol: 'D', name: '自治領能源 (Dominion Energy)', englishName: 'Dominion Energy Inc.', category: '電力公用' },
  { symbol: 'DAL', name: '達美航空 (Delta Air Lines)', englishName: 'Delta Air Lines Inc.', category: '航空客運' },
  { symbol: 'DASH', name: 'DoorDash (外送平台)', englishName: 'DoorDash Inc.', category: '外送平台' },
  { symbol: 'DAY', name: '戴斯康 (Dayforce 雲端薪資)', englishName: 'Dayforce Inc.', category: '人資軟體' },
  { symbol: 'DD', name: '杜邦 (DuPont 特種材料)', englishName: 'DuPont de Nemours Inc.', category: '特種材料' },
  { symbol: 'DDOG', name: 'Datadog (雲端應用監控)', englishName: 'Datadog Inc.', category: '雲端監控' },
  { symbol: 'DE', name: '強鹿 (John Deere 農業機械)', englishName: 'Deere & Company', category: '農機自動化' },
  { symbol: 'DECK', name: 'Deckers (HOKA / UGG 潮鞋)', englishName: 'Deckers Outdoor Corporation', category: '鞋履服飾' },
  { symbol: 'DELL', name: '戴爾科技 (Dell AI伺服器)', englishName: 'Dell Technologies Inc.', category: '伺服器硬體' },
  { symbol: 'DFS', name: '發現金融 (Discover 信用卡)', englishName: 'Discover Financial Services', category: '消費信貸' },
  { symbol: 'DG', name: '達樂公司 (Dollar General 一元店)', englishName: 'Dollar General Corporation', category: '平價雜貨' },
  { symbol: 'DGX', name: '奎斯特診斷 (Quest Diagnostics 醫學檢驗)', englishName: 'Quest Diagnostics Incorporated', category: '臨床醫檢' },
  { symbol: 'DHI', name: '霍頓房屋 (D.R. Horton 全美最大建商)', englishName: 'D.R. Horton Inc.', category: '住宅建商' },
  { symbol: 'DHR', name: '丹納赫 (Danaher 生命科學設備)', englishName: 'Danaher Corporation', category: '生科設備' },
  { symbol: 'DIS', name: '迪士尼 (Disney)', englishName: 'The Walt Disney Company', category: '娛樂影視' },
  { symbol: 'DKNG', name: 'DraftKings (線上運動博彩)', englishName: 'DraftKings Inc.', category: '在線博弈' },
  { symbol: 'DLR', name: '數位房產 (Digital Realty 資料中心REIT)', englishName: 'Digital Realty Trust Inc.', category: '資料中心REIT' },
  { symbol: 'DLTR', name: '美元樹 (Dollar Tree 連鎖百元店)', englishName: 'Dollar Tree Inc.', category: '平價零售' },
  { symbol: 'DOC', name: '健康峰地產 (Healthpeak 醫療診所REIT)', englishName: 'Healthpeak Properties Inc.', category: '醫療地產REIT' },
  { symbol: 'DOCU', name: 'DocuSign (電子簽章)', englishName: 'DocuSign Inc.', category: '電子簽章' },
  { symbol: 'DOV', name: '多佛 (Dover 工業設備)', englishName: 'Dover Corporation', category: '工業機械' },
  { symbol: 'DOW', name: '陶氏化學 (Dow 化學原料)', englishName: 'Dow Inc.', category: '大宗化學' },
  { symbol: 'DPZ', name: '達美樂比薩 (Domino\'s Pizza)', englishName: 'Domino\'s Pizza Inc.', category: '連鎖餐飲' },
  { symbol: 'DRI', name: '達頓餐飲 (Darden 橄欖園餐廳)', englishName: 'Darden Restaurants Inc.', category: '休閒餐飲' },
  { symbol: 'DTE', name: 'DTE能源 (底特律電網)', englishName: 'DTE Energy Company', category: '電力公用' },
  { symbol: 'DUK', name: '杜克能源 (Duke Energy 東南電網)', englishName: 'Duke Energy Corporation', category: '電力公用' },
  { symbol: 'DVA', name: '達維塔 (DaVita 連鎖洗腎中心)', englishName: 'DaVita Inc.', category: '洗腎透析醫療' },
  { symbol: 'DVN', name: '戴文能源 (Devon Energy 頁岩油氣)', englishName: 'Devon Energy Corporation', category: '油氣開採' },
  { symbol: 'DXCM', name: '德康醫療 (連續血糖監測CGM)', englishName: 'DexCom Inc.', category: '糖尿病醫療' },
  { symbol: 'EA', name: '美商藝電 (Electronic Arts 足球遊戲)', englishName: 'Electronic Arts Inc.', category: '電子遊戲' },
  { symbol: 'EBAY', name: 'eBay (線上拍賣市集)', englishName: 'eBay Inc.', category: '電子商務' },
  { symbol: 'ECL', name: '藝康 (Ecolab 工業節水與殺菌)', englishName: 'Ecolab Inc.', category: '水質淨化消毒' },
  { symbol: 'ED', name: '聯合愛迪生 (紐約曼哈頓電網)', englishName: 'Consolidated Edison Inc.', category: '電力公用' },
  { symbol: 'EFX', name: '艾可飛 (Equifax 徵信評分機構)', englishName: 'Equifax Inc.', category: '信用大數據' },
  { symbol: 'EG', name: '珠峰再保險 (Everest Group)', englishName: 'Everest Group Ltd.', category: '全球再保險' },
  { symbol: 'EIX', name: '愛迪生國際 (南加州電網)', englishName: 'Edison International', category: '電力公用' },
  { symbol: 'EL', name: '雅詩蘭黛 (Estee Lauder 高級美妝)', englishName: 'The Estee Lauder Companies Inc.', category: '專櫃保養品' },
  { symbol: 'ELV', name: 'Elevance Health (安森醫保)', englishName: 'Elevance Health Inc.', category: '健康保險' },
  { symbol: 'EMN', name: '伊士曼化工 (Eastman Chemical)', englishName: 'Eastman Chemical Company', category: '特種化工材料' },
  { symbol: 'EMR', name: '艾默生電氣 (Emerson 工廠控制儀表)', englishName: 'Emerson Electric Co.', category: '工廠自動化' },
  { symbol: 'ENPH', name: '安費諾微逆變器 (Enphase 太陽能逆變器)', englishName: 'Enphase Energy Inc.', category: '太陽能硬體' },
  { symbol: 'EOG', name: 'EOG資源 (低成本頁岩油開採)', englishName: 'EOG Resources Inc.', category: '能源探勘' },
  { symbol: 'EPAM', name: '億磐系統 (EPAM Systems 軟體研發外包)', englishName: 'EPAM Systems Inc.', category: '軟體研發服務' },
  { symbol: 'EQIX', name: '易昆尼克斯 (Equinix 全球資料中心REIT)', englishName: 'Equinix Inc.', category: '資料中心REIT' },
  { symbol: 'EQR', name: '公平住戶 (Equity Residential 公寓REIT)', englishName: 'Equity Residential', category: '住宅地產REIT' },
  { symbol: 'EQT', name: 'EQT能源 (美國最大天然氣生產商)', englishName: 'EQT Corporation', category: '天然氣開採' },
  { symbol: 'ERIE', name: '伊利保險 (Erie Indemnity)', englishName: 'Erie Indemnity Company Class A', category: '財產保險' },
  { symbol: 'ES', name: '長青能源 (Eversource 新英格蘭電網)', englishName: 'Eversource Energy', category: '電力燃氣公用' },
  { symbol: 'ESS', name: '艾塞克斯產權 (西岸高科技公寓REIT)', englishName: 'Essex Property Trust Inc.', category: '多戶公寓REIT' },
  { symbol: 'ETN', name: '伊頓 (Eaton 資料中心配電變壓器)', englishName: 'Eaton Corporation plc', category: '電力管理設備' },
  { symbol: 'ETR', name: '安特吉 (Entergy 南部電網與核電)', englishName: 'Entergy Corporation', category: '電力公用' },
  { symbol: 'ETSY', name: 'Etsy (手作與復古文創電商平台)', englishName: 'Etsy Inc.', category: '文創電子商務' },
  { symbol: 'EVRG', name: '恆裕能源 (Evergy 密蘇里電網)', englishName: 'Evergy Inc.', category: '電力公用' },
  { symbol: 'EW', name: '愛德華生命科學 (人工心臟瓣膜)', englishName: 'Edwards Lifesciences Corp.', category: '心臟瓣膜醫療' },
  { symbol: 'EXC', name: '艾索倫電力 (Exelon 最大無碳發電網)', englishName: 'Exelon Corporation', category: '電力公用事業' },
  { symbol: 'EXPD', name: '康捷國際物流 (Expeditors 全球海空運貨代)', englishName: 'Expeditors International of WA', category: '國際物流貨代' },
  { symbol: 'EXPE', name: 'Expedia (智遊網旅遊線上訂房平台)', englishName: 'Expedia Group Inc.', category: '線上機票旅遊' },
  { symbol: 'EXR', name: '額外空間倉儲 (Extra Space 迷你倉REIT)', englishName: 'Extra Space Storage Inc.', category: '自助倉儲REIT' },
  { symbol: 'F', name: '福特汽車 (Ford Motor 皮卡與電動車)', englishName: 'Ford Motor Company', category: '傳統與電動車' },
  { symbol: 'FANG', name: '響尾蛇能源 (Diamondback 二疊紀頁岩油)', englishName: 'Diamondback Energy Inc.', category: '頁岩油開採' },
  { symbol: 'FAST', name: '快扣 (Fastenal 工業螺絲五金耗材)', englishName: 'Fastenal Company', category: '工業耗材通路' },
  { symbol: 'FCX', name: '自由港麥克墨倫 (Freeport-McMoRan 銅礦霸主)', englishName: 'Freeport-McMoRan Inc.', category: '銅礦金礦開採' },
  { symbol: 'FDS', name: '慧甚資訊 (FactSet 金融終端機數據)', englishName: 'FactSet Research Systems Inc.', category: '金融數據分析' },
  { symbol: 'FDX', name: '聯邦快遞 (FedEx 全球航空快遞包裹)', englishName: 'FedEx Corporation', category: '航空物流快遞' },
  { symbol: 'FE', name: '第一能源 (FirstEnergy 俄亥俄電網)', englishName: 'FirstEnergy Corp.', category: '電力公用事業' },
  { symbol: 'FFIV', name: 'F5網路 (F5 負載均衡與應用資安)', englishName: 'F5 Inc.', category: '雲端負載均衡' },
  { symbol: 'FI', name: '費瑟夫 (Fiserv 金融支付與POS系統)', englishName: 'Fiserv Inc.', category: '核心銀行支付' },
  { symbol: 'FICO', name: '費埃哲 (FICO 信用評分算法)', englishName: 'Fair Isaac Corporation', category: '信用評分演算法' },
  { symbol: 'FIS', name: '富達國民資訊 (FIS 銀行清算核心系統)', englishName: 'Fidelity National Info Services', category: '銀行IT核心系統' },
  { symbol: 'FITB', name: '五三銀行 (Fifth Third 中西部優質銀行)', englishName: 'Fifth Third Bancorp', category: '商業銀行' },
  { symbol: 'FLT', name: '車隊夥伴 (Fleetcor 商業加油卡支付)', englishName: 'FLEETCOR Technologies Inc.', category: '商用卡支付' },
  { symbol: 'FMC', name: '富美實 (FMC 農業除草劑殺菌劑)', englishName: 'FMC Corporation', category: '農業化學' },
  { symbol: 'FOX', name: '福斯公司 B (Fox 體育廣播)', englishName: 'Fox Corporation Class B', category: '影視傳媒' },
  { symbol: 'FOXA', name: '福斯公司 A (Fox News 福斯新聞台)', englishName: 'Fox Corporation Class A', category: '新聞電視台' },
  { symbol: 'FRT', name: '聯邦不動產 (Federal Realty 戶外商場REIT)', englishName: 'Federal Realty Investment Trust', category: '頂級商場REIT' },
  { symbol: 'FSLR', name: '第一太陽能 (First Solar 美國碲化鎘薄膜組件)', englishName: 'First Solar Inc.', category: '太陽能電池板' },
  { symbol: 'FTNT', name: '飛塔資訊 (Fortinet 企業防火牆資安)', englishName: 'Fortinet Inc.', category: '網路安全防火牆' },
  { symbol: 'FTV', name: '富帝捷 (Fortive 工業儀表與感測器)', englishName: 'Fortive Corporation', category: '工業精密儀表' },
  { symbol: 'GD', name: '通用動力 (General Dynamics 核潛艦/坦克)', englishName: 'General Dynamics Corporation', category: '國防軍工' },
  { symbol: 'GDDY', name: 'GoDaddy (全球最大網域註冊商與主機託管)', englishName: 'GoDaddy Inc. Class A', category: '網域與雲端主機' },
  { symbol: 'GE', name: '奇異航太 (GE Aerospace 航空發動機)', englishName: 'GE Aerospace', category: '商用飛機發動機' },
  { symbol: 'GEHC', name: 'GE醫療健康 (GE HealthCare 超音波/MRI造影)', englishName: 'GE HealthCare Technologies Inc.', category: '醫學影像設備' },
  { symbol: 'GEN', name: '捷諾數位 (Gen Digital 諾頓防毒軟體Norton)', englishName: 'Gen Digital Inc.', category: '個人資安防毒' },
  { symbol: 'GEV', name: 'GE Vernova (奇異能源/電網/風力設備)', englishName: 'GE Vernova Inc.', category: '能源發電設備' },
  { symbol: 'GILD', name: '吉利德科學 (Gilead 抗病毒藥與HIV療法)', englishName: 'Gilead Sciences Inc.', category: '抗病毒生物製藥' },
  { symbol: 'GIS', name: '通用磨坊 (General Mills 哈根達斯/麥片)', englishName: 'General Mills Inc.', category: '冰淇淋與麥片' },
  { symbol: 'GL', name: '全球人壽 (Globe Life 補充性健康險)', englishName: 'Globe Life Inc.', category: '人壽醫療險' },
  { symbol: 'GLW', name: '康寧 (Corning 大猩猩玻璃/AI光纖光纜)', englishName: 'Corning Inc.', category: '特種玻璃與光纖' },
  { symbol: 'GM', name: '通用汽車 (GM 雪佛蘭/凱迪拉克/電動車)', englishName: 'General Motors Company', category: '傳統與智慧汽車' },
  { symbol: 'GNRC', name: '捷諾克 (Generac 家用商用應急備用發電機)', englishName: 'Generac Holdings Inc.', category: '發電機與儲能' },
  { symbol: 'GOOG', name: 'Alphabet C (Google 母公司無投票權股)', englishName: 'Alphabet Inc. Class C', category: '搜尋引擎與雲端' },
  { symbol: 'GOOGL', name: 'Alphabet A (Google 搜尋/YouTube/安卓母公司)', englishName: 'Alphabet Inc. Class A', category: '互聯網與AI' },
  { symbol: 'GPC', name: '正品汽車配件 (Genuine Parts NAPA連鎖門市)', englishName: 'Genuine Parts Company', category: '汽車售後零件批發' },
  { symbol: 'GPN', name: '環匯 (Global Payments 商家收單刷卡處理)', englishName: 'Global Payments Inc.', category: '刷卡收單處理' },
  { symbol: 'GRMN', name: '台灣國際航電 (Garmin 鐵人三項手錶/導航)', englishName: 'Garmin Ltd.', category: '運動智慧穿戴' },
  { symbol: 'GS', name: '高盛集團 (Goldman Sachs 頂級華爾街投行)', englishName: 'The Goldman Sachs Group Inc.', category: '頂級投資銀行' },
  { symbol: 'GWW', name: '固安捷 (W.W. Grainger 工業維修耗材MRO)', englishName: 'W.W. Grainger Inc.', category: '工業品B2B電商' },
  { symbol: 'HAL', name: '哈里伯頓 (Halliburton 壓裂與固井技術)', englishName: 'Halliburton Company', category: '油田壓裂工程' },
  { symbol: 'HAS', name: '孩之寶 (Hasbro 萬智牌/大富翁/變形金剛)', englishName: 'Hasbro Inc.', category: '玩具與桌遊IP' },
  { symbol: 'HBAN', name: '亨廷頓銀行 (Huntington 汽車貸款優質銀行)', englishName: 'Huntington Bancshares Inc.', category: '區域商業銀行' },
  { symbol: 'HCA', name: 'HCA醫療 (全美最大私立急診與綜合醫院連鎖)', englishName: 'HCA Healthcare Inc.', category: '私立連鎖醫院' },
  { symbol: 'HD', name: '家得寶 (The Home Depot 居家裝修建材龍頭)', englishName: 'The Home Depot Inc.', category: '居家修繕量販' },
  { symbol: 'HES', name: '赫斯石油 (Hess 蓋亞那離岸深海油田探勘)', englishName: 'Hess Corporation', category: '深海油氣探勘' },
  { symbol: 'HIG', name: '哈特福金融 (The Hartford 企業責任保險)', englishName: 'The Hartford Financial Services Group', category: '商業產物保險' },
  { symbol: 'HII', name: '亨廷頓英格爾斯 (造船廠/福特級核動力航空母艦)', englishName: 'Huntington Ingalls Industries Inc.', category: '海軍軍艦造船' },
  { symbol: 'HLT', name: '希爾頓酒店 (Hilton 全球頂級連鎖飯店)', englishName: 'Hilton Worldwide Holdings Inc.', category: '全球連鎖飯店' },
  { symbol: 'HOLX', name: '豪洛捷 (Hologic 3D乳房X光攝影檢測設備)', englishName: 'Hologic Inc.', category: '女性精準醫療檢測' },
  { symbol: 'HON', name: '漢威聯合 (Honeywell 航太感測與工業自動化)', englishName: 'Honeywell International Inc.', category: '航太與工控感測' },
  { symbol: 'HPE', name: '慧與科技 (HPE 企業伺服器與邊緣運算)', englishName: 'Hewlett Packard Enterprise', category: '企業伺服器' },
  { symbol: 'HPQ', name: '惠普 (HP 印表機與商用筆記型電腦)', englishName: 'HP Inc.', category: '電腦與印表機' },
  { symbol: 'HRL', name: '荷美爾食品 (Hormel Foods 世棒午餐肉SPAM)', englishName: 'Hormel Foods Corporation', category: '肉類加工食品' },
  { symbol: 'HSIC', name: '漢瑞祥 (Henry Schein 牙醫與醫療診所器材批發)', englishName: 'Henry Schein Inc.', category: '牙科醫療器材' },
  { symbol: 'HST', name: '萬豪地產信託 (Host Hotels 全美奢華酒店REIT)', englishName: 'Host Hotels & Resorts Inc.', category: '五星酒店地產REIT' },
  { symbol: 'HSY', name: '好時巧克力 (The Hershey Company 糖果巧克力)', englishName: 'The Hershey Company', category: '巧克力與甜點' },
  { symbol: 'HUBB', name: '哈貝爾 (Hubbell 電網高壓輸配電設備開關)', englishName: 'Hubbell Incorporated', category: '電網電力工程' },
  { symbol: 'HUM', name: '哈門那 (Humana 聯邦醫療保險優勢計劃龍頭)', englishName: 'Humana Inc.', category: '銀髮老年醫保' },
  { symbol: 'HWM', name: '豪美特航太 (Howmet Aerospace 航空鈦合金發動機鍛件)', englishName: 'Howmet Aerospace Inc.', category: '航太特種合金' },
  { symbol: 'IBM', name: '國際商業機器 (IBM 混合雲RedHat與量子運算)', englishName: 'International Business Machines Corp.', category: '企業混合雲IT' },
  { symbol: 'ICE', name: '洲際交易所 (紐約證券交易所NYSE母公司)', englishName: 'Intercontinental Exchange Inc.', category: '證券期貨交易所' },
  { symbol: 'IDXX', name: '愛德士 (IDEXX 全球獸醫與寵物診斷檢驗)', englishName: 'IDEXX Laboratories Inc.', category: '寵物醫學檢驗' },
  { symbol: 'IEX', name: '埃迪克斯 (IDEX 頂級流體計量泵與特殊閥門)', englishName: 'IDEX Corporation', category: '流體計量控制' },
  { symbol: 'IFF', name: '國際香精香料 (IFF 全球食品香料與化妝品原料)', englishName: 'International Flavors & Fragrances', category: '香料香精原料' },
  { symbol: 'ILMN', name: '因美納 (Illumina 全球基因定序儀器霸主)', englishName: 'Illumina Inc.', category: 'DNA基因定序儀' },
  { symbol: 'INCY', name: '因賽特 (Incyte 骨髓增生與腫瘤免疫新藥)', englishName: 'Incyte Corporation', category: '腫瘤標靶生物藥' },
  { symbol: 'INTC', name: '英特爾 (Intel CPU與晶圓代工IFS)', englishName: 'Intel Corporation', category: '微處理器半導體' },
  { symbol: 'INTU', name: '直覺軟體 (Intuit 報稅軟體TurboTax/QuickBooks)', englishName: 'Intuit Inc.', category: '中小企業財務雲端' },
  { symbol: 'INVH', name: '邀請住屋 (Invitation Homes 獨棟別墅租賃REIT)', englishName: 'Invitation Homes Inc.', category: '獨棟出租住宅REIT' },
  { symbol: 'IP', name: '國際紙業 (International Paper 工業包裝瓦楞紙板)', englishName: 'International Paper Company', category: '工業紙箱包裝' },
  { symbol: 'IPG', name: '埃培智集團 (Interpublic 全球四大廣告行銷傳媒)', englishName: 'The Interpublic Group of Companies', category: '公關行銷廣告' },
  { symbol: 'IQV', name: '艾昆緯 (IQVIA 全球臨床試驗CRO與醫藥數據)', englishName: 'IQVIA Holdings Inc.', category: '醫藥臨床CRO數據' },
  { symbol: 'IR', name: '英格索蘭 (Ingersoll Rand 工業空氣壓縮機與真空泵)', englishName: 'Ingersoll Rand Inc.', category: '工業空壓機設備' },
  { symbol: 'IRM', name: '鐵山 (Iron Mountain 機密實體檔案與資料中心REIT)', englishName: 'Iron Mountain Incorporated', category: '檔案倉儲REIT' },
  { symbol: 'ISRG', name: '直覺外科 (達文西微創手術機器人系統霸主)', englishName: 'Intuitive Surgical Inc.', category: '微創手術機器人' },
  { symbol: 'IT', name: '高德納諮詢 (Gartner 全球IT調研與魔力象限)', englishName: 'Gartner Inc.', category: 'IT科技調研諮詢' },
  { symbol: 'ITW', name: '伊利諾工具 (Illinois Tool Works 高毛利特種緊固件)', englishName: 'Illinois Tool Works Inc.', category: '精密特種緊固件' },
  { symbol: 'J', name: '雅各布斯工程 (Jacobs Solutions 國防基礎設施諮詢)', englishName: 'Jacobs Solutions Inc.', category: '工程設計諮詢' },
  { symbol: 'JBHT', name: '亨特貨運 (J.B. Hunt 北美鐵路公路多式聯運龍頭)', englishName: 'J.B. Hunt Transport Services Inc.', category: '貨櫃多式聯運' },
  { symbol: 'JBL', name: '捷普 (Jabil 蘋果伺服器高階電子代工EMS)', englishName: 'Jabil Inc.', category: '高階電子代工' },
  { symbol: 'JCI', name: '江森自控 (Johnson Controls 智慧建築控制與暖通冷氣)', englishName: 'Johnson Controls Intl', category: '智慧樓宇控制' },
  { symbol: 'JKHY', name: '傑克亨利 (Jack Henry 社區銀行與信用合作社核心系統)', englishName: 'Jack Henry & Associates Inc.', category: '金融科技核心' },
  { symbol: 'JNJ', name: '嬌生 (Johnson & Johnson 醫療器材與生物製藥)', englishName: 'Johnson & Johnson', category: '醫療器材製藥' },
  { symbol: 'JNPR', name: '瞻博網路 (Juniper Networks AI雲端網通路由器)', englishName: 'Juniper Networks Inc.', category: '企業網通路由器' },
  { symbol: 'JPM', name: '摩根大通 (JPMorgan Chase 全美第一大綜合銀行)', englishName: 'JPMorgan Chase & Co.', category: '全美最大銀行' },
  { symbol: 'K', name: '家樂氏 (Kellanova 品客洋芋片與早餐零食)', englishName: 'Kellanova', category: '休閒零食餅乾' },
  { symbol: 'KDP', name: 'Keurig胡椒博士 (Dr Pepper 汽水與膠囊咖啡機)', englishName: 'Keurig Dr Pepper Inc.', category: '膠囊咖啡與汽水' },
  { symbol: 'KEY', name: '科 key銀行 (KeyCorp 五大湖區優質商業銀行)', englishName: 'KeyCorp', category: '商業金融銀行' },
  { symbol: 'KEYS', name: '是德科技 (Keysight 5G與半導體高頻量測儀器)', englishName: 'Keysight Technologies Inc.', category: '高頻電子量測' },
  { symbol: 'KHC', name: '卡夫亨氏 (The Kraft Heinz Company 番茄醬起司)', englishName: 'The Kraft Heinz Company', category: '調味醬料乳品' },
  { symbol: 'KIM', name: '金科地產 (Kimco Realty 全美生鮮超市社區賣場REIT)', englishName: 'Kimco Realty Corporation', category: '生鮮社區商場REIT' },
  { symbol: 'KLAC', name: '科磊 (KLA 半導體晶圓缺陷檢測機台獨佔壟斷)', englishName: 'KLA Corporation', category: '半導體檢測設備' },
  { symbol: 'KMB', name: '金百利克拉克 (舒潔衛生紙與好奇紙尿褲)', englishName: 'Kimberly-Clark Corporation', category: '個人與家庭衛生紙' },
  { symbol: 'KMI', name: '金德摩根 (Kinder Morgan 北美最大天然氣管線樞紐)', englishName: 'Kinder Morgan Inc.', category: '天然氣管網樞紐' },
  { symbol: 'KO', name: '可口可樂 (The Coca-Cola Company 經典碳酸軟飲)', englishName: 'The Coca-Cola Company', category: '軟性飲料霸主' },
  { symbol: 'KR', name: '克羅格 (The Kroger Co. 全美最大生鮮超市連鎖)', englishName: 'The Kroger Co.', category: '生鮮超級市場' },
  { symbol: 'KVUE', name: '科赴 (Kenvue 李施德霖漱口水/露得清護膚/泰諾感冒藥)', englishName: 'Kenvue Inc.', category: '消費健康與護理' },
  { symbol: 'L', name: '羅威斯集團 (Loews 控股保險/鑽井/天然氣)', englishName: 'Loews Corporation', category: '多元產業控股' },
  { symbol: 'LDOS', name: '理多斯 (Leidos 美國國防部與CIA情報系統主要承包商)', englishName: 'Leidos Holdings Inc.', category: '國防國安IT承包' },
  { symbol: 'LEN', name: '萊納房屋 (Lennar Corporation 全美頂級住宅營造建商)', englishName: 'Lennar Corporation Class A', category: '住宅營造建商' },
  { symbol: 'LH', name: '萊博康 (Labcorp 全美領先醫學檢驗與診斷實驗室)', englishName: 'Laboratory Corp of America', category: '臨床診斷實驗室' },
  { symbol: 'LHX', name: 'L3哈里斯 (L3Harris 戰場戰術通訊與電子戰系統)', englishName: 'L3Harris Technologies Inc.', category: '軍用電子戰系統' },
  { symbol: 'LIN', name: '林德集團 (Linde 全球最大工業氣體與半導體特氣霸主)', englishName: 'Linde plc', category: '工業氣體龍頭' },
  { symbol: 'LKQ', name: 'LKQ回收汽車零件 (全美最大拆車件與售後配件批發)', englishName: 'LKQ Corporation', category: '拆車配件批發' },
  { symbol: 'LLY', name: '禮來製藥 (Eli Lilly 猛漲減肥藥Mounjaro與糖尿病)', englishName: 'Eli Lilly and Company', category: '減肥藥與生物製藥' },
  { symbol: 'LMT', name: '洛克希德馬丁 (F-35 隱形戰鬥機與愛國者飛彈製造商)', englishName: 'Lockheed Martin Corporation', category: '戰機與飛彈防衛' },
  { symbol: 'LNT', name: '阿蘭特能源 (Alliant Energy 威斯康辛風力電力公用)', englishName: 'Alliant Energy Corporation', category: '綠能電力公用' },
  { symbol: 'LOW', name: '勞氏 (Lowe\'s 全美第二大家居裝修建材量販店)', englishName: 'Lowe\'s Companies Inc.', category: '居家建材裝修' },
  { symbol: 'LRCX', name: '科林研發 (Lam Research 半導體薄膜沉積與蝕刻設備)', englishName: 'Lam Research Corporation', category: '半導體蝕刻設備' },
  { symbol: 'LULU', name: '露露樂蒙 (Lululemon 頂級瑜伽運動服飾時尚品牌)', englishName: 'Lululemon Athletica Inc.', category: '高階運動服飾' },
  { symbol: 'LUV', name: '西南航空 (Southwest Airlines 全美最大低成本廉航)', englishName: 'Southwest Airlines Co.', category: '低成本航空客運' },
  { symbol: 'LVS', name: '拉斯維加斯金沙集團 (金沙中國/濱海灣金沙賭場渡假村)', englishName: 'Las Vegas Sands Corp.', category: '博弈綜合渡假村' },
  { symbol: 'LW', name: '藍威斯頓 (Lamb Weston 全球麥當勞專用冷凍薯條第一廠)', englishName: 'Lamb Weston Holdings Inc.', category: '冷凍馬鈴薯食品' },
  { symbol: 'LYB', name: '利安德巴塞爾 (LyondellBasell 全球最大聚丙烯塑膠化工)', englishName: 'LyondellBasell Industries N.V.', category: '石化高分子材料' },
  { symbol: 'LYV', name: '理想國演藝 (Live Nation 演唱會主辦與Ticketmaster售票)', englishName: 'Live Nation Entertainment Inc.', category: '全球演唱會娛樂' },
  { symbol: 'MA', name: '萬事達卡 (Mastercard 全球信用卡清算網絡第二大巨頭)', englishName: 'Mastercard Incorporated', category: '全球支付清算' },
  { symbol: 'MAA', name: '中大西洋公寓 (Mid-America 陽光帶高品質出租公寓REIT)', englishName: 'Mid-America Apartment Communities', category: '多戶公寓地產REIT' },
  { symbol: 'MAR', name: '萬豪國際 (Marriott 麗思卡爾頓/喜來登/W飯店全球第一)', englishName: 'Marriott International Inc.', category: '全球最大五星酒店' },
  { symbol: 'MAS', name: '美商美斯 (Masco 漢斯格雅Hansgrohe頂級衛浴水龍頭)', englishName: 'Masco Corporation', category: '衛浴建材製造' },
  { symbol: 'MCD', name: '麥當勞 (McDonald\'s 全球最大連鎖速食漢堡帝國)', englishName: 'McDonald\'s Corporation', category: '全球速食帝國' },
  { symbol: 'MCHP', name: '微芯科技 (Microchip 全球單晶片微控制器MCU領導廠)', englishName: 'Microchip Technology Inc.', category: '微控制器MCU' },
  { symbol: 'MCK', name: '麥克森 (McKesson 全美第一大處方藥批發與醫藥物流)', englishName: 'McKesson Corporation', category: '處方藥物流配送' },
  { symbol: 'MCO', name: '穆迪 (Moody\'s 權威債券信用評級與金融分析)', englishName: 'Moody\'s Corporation', category: '債券信用評級' },
  { symbol: 'MDLZ', name: '億滋國際 (Mondelez 奧利奧Oreo餅乾與吉百利巧克力)', englishName: 'Mondelez International Inc.', category: '餅乾休閒零食' },
  { symbol: 'MDT', name: '美敦力 (Medtronic 心臟起搏器與外科手術醫療器材)', englishName: 'Medtronic plc', category: '心臟微創醫療器材' },
  { symbol: 'MET', name: '大都會人壽 (MetLife 全美老牌大型人壽與養老保險)', englishName: 'MetLife Inc.', category: '人壽與年金保險' },
  { symbol: 'META', name: 'Meta Platforms (Facebook / Instagram / WhatsApp / AI母公司)', englishName: 'Meta Platforms Inc.', category: '社交網絡與元宇宙' },
  { symbol: 'MGM', name: '美高梅國際酒店 (MGM Resorts 拉斯維加斯頂級賭場度假城)', englishName: 'MGM Resorts International', category: '賭場飯店娛樂' },
  { symbol: 'MHK', name: '莫霍克工業 (Mohawk 全球最大地板地毯磁磚製造商)', englishName: 'Mohawk Industries Inc.', category: '地板地毯建材' },
  { symbol: 'MKC', name: '味好美 (McCormick 全球第一大香辛料與火鍋調味料)', englishName: 'McCormick & Company Inc.', category: '香料與複合調味' },
  { symbol: 'MKTX', name: '市場軸線 (MarketAxess 全球機構級公司債電子撮合平台)', englishName: 'MarketAxess Holdings Inc.', category: '債券交易Fintech' },
  { symbol: 'MLM', name: '馬丁瑪麗埃塔 (Martin Marietta 高鐵公路砂石骨料混凝土)', englishName: 'Martin Marietta Materials Inc.', category: '基礎設施砂石骨料' },
  { symbol: 'MMC', name: '達信保險顧問 (Marsh McLennan 全球最大風險與保險經紀)', englishName: 'Marsh & McLennan Companies', category: '風險與保險經紀' },
  { symbol: 'MMM', name: '3M公司 (3M 膠帶/防護口罩/便利貼/特種黏合劑)', englishName: '3M Company', category: '多元科技材料' },
  { symbol: 'MNST', name: '怪獸飲料 (Monster Energy 全球熱銷機能能量飲料霸主)', englishName: 'Monster Beverage Corporation', category: '機能能量飲料' },
  { symbol: 'MO', name: '奧馳亞集團 (Altria 萬寶路Marlboro香菸在美獨家專賣)', englishName: 'Altria Group Inc.', category: '傳統菸草香菸' },
  { symbol: 'MOH', name: '莫利納醫療 (Molina Healthcare 聯邦貧民醫療保險運營商)', englishName: 'Molina Healthcare Inc.', category: '政府醫保補助' },
  { symbol: 'MOS', name: '美盛公司 (The Mosaic Company 鉀肥磷肥全球主要供應商)', englishName: 'The Mosaic Company', category: '農業鉀肥磷肥' },
  { symbol: 'MPC', name: '馬拉松原油 (Marathon Petroleum 全美產能第一大獨立煉油商)', englishName: 'Marathon Petroleum Corp.', category: '原油加工與煉製' },
  { symbol: 'MPWR', name: '芯源系統 (Monolithic Power AI伺服器高壓高階電源管理IC)', englishName: 'Monolithic Power Systems Inc.', category: '電源管理晶片' },
  { symbol: 'MRK', name: '默克藥廠 (Merck 癌症免疫神藥K藥Keytruda發明者)', englishName: 'Merck & Co. Inc.', category: '腫瘤免疫新藥' },
  { symbol: 'MRNA', name: '莫德納 (Moderna mRNA新冠疫苗與個體化癌症疫苗先鋒)', englishName: 'Moderna Inc.', category: 'mRNA生物科技' },
  { symbol: 'MS', name: '摩根士丹利 (Morgan Stanley 華爾街財富管理與投資銀行)', englishName: 'Morgan Stanley', category: '財富管理與投行' },
  { symbol: 'MSCI', name: '明晟 (MSCI 全球投資基準指數與ESG評級編制者)', englishName: 'MSCI Inc.', category: '金融指數編制' },
  { symbol: 'MSFT', name: '微軟 (Microsoft Windows / Azure雲端 / Office 365 / OpenAI重押)', englishName: 'Microsoft Corporation', category: '軟體與AI雲端' },
  { symbol: 'MSI', name: '摩托羅拉系統 (Motorola Solutions 警察軍用防爆對講通信)', englishName: 'Motorola Solutions Inc.', category: '專網安全通信' },
  { symbol: 'MTB', name: 'M&T銀行 (美東東北部優質區域商業銀行)', englishName: 'M&T Bank Corporation', category: '區域商業銀行' },
  { symbol: 'MTCH', name: 'Match Group (Tinder / Hinge 全球線上約會交友App龍頭)', englishName: 'Match Group Inc.', category: '線上交友約會' },
  { symbol: 'MTD', name: '梅特勒-托利多 (Mettler-Toledo 全球實驗室十萬分之一超微量天平)', englishName: 'Mettler-Toledo International Inc.', category: '超微量精密天平' },
  { symbol: 'MU', name: '美光科技 (Micron Technology 高頻寬記憶體HBM3e與DRAM/NAND)', englishName: 'Micron Technology Inc.', category: '記憶體半導體' },
  { symbol: 'NCLH', name: '挪威郵輪 (Norwegian Cruise Line 自由風奢華海島郵輪)', englishName: 'Norwegian Cruise Line Holdings', category: '國際豪華郵輪' },
  { symbol: 'NDAQ', name: '那斯達克交易所 (Nasdaq 科技股交易所與金融軟體系統)', englishName: 'Nasdaq Inc.', category: '科技股交易所' },
  { symbol: 'NDSN', name: '諾信 (Nordson 半導體晶片封裝精密微量點膠機與塗層)', englishName: 'Nordson Corporation', category: '晶片封裝點膠設備' },
  { symbol: 'NEE', name: '新紀元能源 (NextEra Energy 全球最大風力與太陽能清潔公用)', englishName: 'NextEra Energy Inc.', category: '清潔綠色能源' },
  { symbol: 'NEM', name: '紐蒙特礦業 (Newmont Corporation 全球產量第一大黃金開採商)', englishName: 'Newmont Corporation', category: '金礦貴金屬開採' },
  { symbol: 'NFLX', name: '網飛 (Netflix 全球付費訂閱用戶最多影視串流霸主)', englishName: 'Netflix Inc.', category: '影視串流娛樂' },
  { symbol: 'NI', name: '源輝能源 (NiSource 印第安納與俄亥俄電力天然氣電網)', englishName: 'NiSource Inc.', category: '電力燃氣公用' },
  { symbol: 'NKE', name: '耐吉 (NIKE 全球運動鞋與運動服飾第一品牌)', englishName: 'NIKE Inc. Class B', category: '運動鞋服霸主' },
  { symbol: 'NOC', name: '諾斯洛普格魯曼 (Northrop Grumman B-21 隱形戰略轟炸機造商)', englishName: 'Northrop Grumman Corporation', category: '隱形戰略轟炸機' },
  { symbol: 'NOW', name: 'ServiceNow (企業數位IT工作流程自動化雲端平台)', englishName: 'ServiceNow Inc.', category: '企業IT流程雲端' },
  { symbol: 'NRG', name: 'NRG能源 (全美領先零售電力批發與微電網調度商)', englishName: 'NRG Energy Inc.', category: '電力零售與調度' },
  { symbol: 'NSC', name: '諾福克南方鐵路 (Norfolk Southern 美國東部一級貨運鐵路幹線)', englishName: 'Norfolk Southern Corporation', category: '一級貨運鐵路' },
  { symbol: 'NTAP', name: 'NetApp (企業混合雲全快閃儲存數據管理架構)', englishName: 'NetApp Inc.', category: '企業數據儲存' },
  { symbol: 'NTRS', name: '北方信託 (Northern Trust 富豪私人家族辦公室託管銀行)', englishName: 'Northern Trust Corporation', category: '私人家族託管' },
  { symbol: 'NUE', name: '紐柯鋼鐵 (Nucor 全美第一大電弧爐短流程綠色廢鋼煉鋼)', englishName: 'Nucor Corporation', category: '短流程綠色鋼鐵' },
  { symbol: 'NVDA', name: '輝達 (NVIDIA 全球AI算力晶片/GPU/CUDA平台絕對霸主)', englishName: 'NVIDIA Corporation', category: 'AI算力GPU晶片' },
  { symbol: 'NVR', name: 'NVR房屋 (全美最高毛利與高ROE輕資產預製建築建商)', englishName: 'NVR Inc.', category: '預製輕資產建商' },
  { symbol: 'NWL', name: '紐威品牌 (Newell Brands 派克鋼筆/橡皮人保鮮盒)', englishName: 'Newell Brands Inc.', category: '品牌消費品' },
  { symbol: 'NWS', name: '新聞集團 B (News Corp 澳洲與英國傳媒集團)', englishName: 'News Corporation Class B', category: '新聞出版傳媒' },
  { symbol: 'NWSA', name: '新聞集團 A (News Corp 華爾街日報/道瓊社母公司)', englishName: 'News Corporation Class A', category: '財經新聞媒體' },
  { symbol: 'NXPI', name: '恩智浦半導體 (NXP 車用微控制器晶片與安全NFC晶片)', englishName: 'NXP Semiconductors N.V.', category: '車用半導體' },
  { symbol: 'O', name: 'Realty Income (月月配息全美商用單一租戶超商藥局收租REIT)', englishName: 'Realty Income Corporation', category: '月月配收租REIT' },
  { symbol: 'ODFL', name: '老自治領貨運 (Old Dominion 零擔物流卡車高毛利第一名)', englishName: 'Old Dominion Freight Line', category: '高品質零擔物流' },
  { symbol: 'OKE', name: '歐克天然氣 (ONEOK 橫跨中部天然氣液體NGL管網與加工)', englishName: 'ONEOK Inc.', category: '天然氣液體管網' },
  { symbol: 'OMC', name: '宏盟集團 (Omnicom Group 全球四大品牌廣告公關傳媒)', englishName: 'Omnicom Group Inc.', category: '品牌行銷公關' },
  { symbol: 'ON', name: '安森美半導體 (onsemi 碳化矽SiC高壓功率元件與車用感測)', englishName: 'ON Semiconductor Corp.', category: '碳化矽功率元件' },
  { symbol: 'ORCL', name: '甲骨文 (Oracle 資料庫系統與OCI高效能AI雲端算力機房)', englishName: 'Oracle Corporation', category: '企業資料庫與雲端' },
  { symbol: 'ORLY', name: '歐萊禮汽車零件 (O\'Reilly 專業修車技師與DIY連鎖門市)', englishName: 'O\'Reilly Automotive Inc.', category: '汽車維修零件通路' },
  { symbol: 'OTIS', name: '奧的斯電梯 (Otis 全球高樓手扶梯與電梯垂直升降霸主)', englishName: 'Otis Worldwide Corporation', category: '電梯垂直升降' },
  { symbol: 'OXY', name: '西方石油 (Occidental Petroleum 二疊紀頁岩油與巴菲特重押)', englishName: 'Occidental Petroleum Corp.', category: '頁岩油與碳中和' },
  { symbol: 'PANW', name: 'Palo Alto Networks (全球第一大新世代防火牆與零信任資安)', englishName: 'Palo Alto Networks Inc.', category: '零信任網路資安' },
  { symbol: 'PARA', name: '派拉蒙全球 (Paramount 派拉蒙影業與CBS電視網)', englishName: 'Paramount Global Class B', category: '影視影業傳媒' },
  { symbol: 'PAYC', name: '沛康薪酬 (Paycom Software 雲端全自動化薪資與人資App)', englishName: 'Paycom Software Inc.', category: '薪資人資雲端' },
  { symbol: 'PAYX', name: '沛齊 (Paychex 全美中小企業薪酬外包與員工福利託管)', englishName: 'Paychex Inc.', category: '中小企業薪酬外包' },
  { symbol: 'PCAR', name: '帕卡卡車 (PACCAR 肯沃斯Kenworth/彼得比爾特重型卡車)', englishName: 'PACCAR Inc.', category: '重型聯結拖車' },
  { symbol: 'PCG', name: '太平洋瓦電 (PG&E 北加州與舊金山矽谷電力天然氣公用)', englishName: 'PG&E Corporation', category: '加州電網公用' },
  { symbol: 'PEG', name: '公用事業企業集團 (PSEG 新澤西輸配電網與無碳核能)', englishName: 'Public Service Enterprise Group', category: '電力公用事業' },
  { symbol: 'PEP', name: '百事公司 (PepsiCo 百事可樂/樂事洋芋片/桂格燕麥食品)', englishName: 'PepsiCo Inc.', category: '食品飲料多品牌' },
  { symbol: 'PFE', name: '輝瑞製藥 (Pfizer 跨國綜合生物製藥與疫苗)', englishName: 'Pfizer Inc.', category: '跨國西藥廠' },
  { symbol: 'PFG', name: '信安金融 (Principal Financial 全美企業401k退休金受託機構)', englishName: 'Principal Financial Group Inc.', category: '401k退休資產管理' },
  { symbol: 'PG', name: '寶僑 (P&G 幫寶適/幫寶適/海倫仙度絲/歐樂B/吉列刮鬍刀)', englishName: 'The Procter & Gamble Company', category: '全球日用消費護理' },
  { symbol: 'PGR', name: '前進保險 (Progressive 浮動費率精準計費車險霸主)', englishName: 'The Progressive Corporation', category: '汽車財產保險' },
  { symbol: 'PH', name: '派克漢尼汾 (Parker Hannifin 航空航海液壓傳動與密封元件)', englishName: 'Parker-Hannifin Corporation', category: '液壓運動與控制' },
  { symbol: 'PHM', name: '普爾特房屋 (PulteGroup 全美大型預製住宅社區建商)', englishName: 'PulteGroup Inc.', category: '住宅營建開發' },
  { symbol: 'PKG', name: '美國包裝公司 (Packaging Corp 工業紙箱與瓦楞紙盒生產)', englishName: 'Packaging Corp of America', category: '瓦楞紙包裝盒' },
  { symbol: 'PLD', name: '普洛斯 (Prologis 亞馬遜全球物流自動化倉儲地產REIT)', englishName: 'Prologis Inc.', category: '物流倉儲地產REIT' },
  { symbol: 'PLTR', name: '帕蘭提爾 (Palantir 美國國防國安AI與企業大數據操作系統AIP)', englishName: 'Palantir Technologies Inc.', category: '大數據與國防AI' },
  { symbol: 'PM', name: '菲利普莫里斯 (Philip Morris IQOS加熱菸無煙轉型跨國龍頭)', englishName: 'Philip Morris International', category: '減害加熱菸草' },
  { symbol: 'PNC', name: 'PNC金融服務 (全美優質大型超級區域商業銀行)', englishName: 'The PNC Financial Services Group', category: '全美前十大銀行' },
  { symbol: 'PNR', name: '濱特爾 (Pentair 全球泳池水泵淨水過濾與工業水處理解決方案)', englishName: 'Pentair plc', category: '智慧泳池水處理' },
  { symbol: 'PNW', name: '頂峰西能源 (Pinnacle West 鳳凰城與亞利桑那電網公用)', englishName: 'Pinnacle West Capital Corp.', category: '亞利桑那電力公用' },
  { symbol: 'PODD', name: 'Insulet (Omnipod 貼片式無管路智慧胰島素幫浦系統)', englishName: 'Insulet Corporation', category: '無管路胰島素泵' },
  { symbol: 'POOL', name: '泳池公司 (Pool Corp 全球最大游泳池建材設備耗材批發通路)', englishName: 'Pool Corporation', category: '泳池設備B2B批發' },
  { symbol: 'PPG', name: 'PPG工業 (全球頂級航太汽車與工業防腐專用油漆塗料)', englishName: 'PPG Industries Inc.', category: '特種防腐塗料' },
  { symbol: 'PPL', name: 'PPL電力 (賓州與肯塔基州特高壓智慧輸配電網公用)', englishName: 'PPL Corporation', category: '電力公用事業' },
  { symbol: 'PRU', name: '保德信金融 (Prudential Financial 保險與固定收益資產管理)', englishName: 'Prudential Financial Inc.', category: '保險與資產管理' },
  { symbol: 'PSA', name: '大眾倉儲 (Public Storage 全美橘色連鎖自助迷你倉儲REIT)', englishName: 'Public Storage', category: '個人自助倉儲REIT' },
  { symbol: 'PSX', name: '菲利普斯66 (Phillips 66 煉化、加油站零售與高階石化原料)', englishName: 'Phillips 66', category: '石油煉化與零售' },
  { symbol: 'PTC', name: 'PTC參數技術 (Creo 3D CAD電腦輔助設計與物聯網軟體)', englishName: 'PTC Inc.', category: '3D CAD工業軟體' },
  { symbol: 'PWR', name: '匡達服務 (Quanta Services AI大型資料中心高壓電網與風力工程)', englishName: 'Quanta Services Inc.', category: 'AI電網基建工程' },
  { symbol: 'PYPL', name: 'PayPal (全球跨境第三方線上支付與Venmo錢包)', englishName: 'PayPal Holdings Inc.', category: '全球數位支付' },
  { symbol: 'QCOM', name: '高通 (Qualcomm 驍龍Snapdragon手機晶片與5G專利基帶)', englishName: 'QUALCOMM Incorporated', category: '手機5G晶片專利' },
  { symbol: 'QRVO', name: '威訊聯合半導體 (Qorvo 手機與國防射頻RF濾波器晶片)', englishName: 'Qorvo Inc.', category: '射頻濾波器晶片' },
  { symbol: 'RCL', name: '皇家加勒比郵輪 (Royal Caribbean 海洋標誌號豪華郵輪渡假)', englishName: 'Royal Caribbean Cruises Ltd.', category: '全球奢華郵輪' },
  { symbol: 'REG', name: '攝政地產 (Regency Centers 全美全食超市WholeFoods商場REIT)', englishName: 'Regency Centers Corporation', category: '高端生鮮商場REIT' },
  { symbol: 'REGN', name: '再生元製藥 (Regeneron 雙特異性抗體與黃斑部病變Eylea眼科藥)', englishName: 'Regeneron Pharmaceuticals', category: '單株抗體生物藥' },
  { symbol: 'RF', name: '地區金融 (Regions Financial 美國東南部高品質區域商業銀行)', englishName: 'Regions Financial Corporation', category: '東南部商業銀行' },
  { symbol: 'RJF', name: '雷蒙詹姆斯金融 (Raymond James 獨立理財顧問與投行資管)', englishName: 'Raymond James Financial Inc.', category: '獨立理財顧問' },
  { symbol: 'RL', name: '雷夫羅倫 (Ralph Lauren 美式經典休閒馬球POLO名牌精品服飾)', englishName: 'Ralph Lauren Corporation', category: '經典美式名牌' },
  { symbol: 'RMD', name: '瑞思邁 (ResMed 全球第一大睡眠呼吸中止症正壓呼吸機與雲端監控)', englishName: 'ResMed Inc.', category: '睡眠呼吸醫療機' },
  { symbol: 'ROK', name: '洛克威爾自動化 (Rockwell 智慧製造PLC控制器與工業軟體)', englishName: 'Rockwell Automation Inc.', category: '工控PLC自動化' },
  { symbol: 'ROL', name: '羅林斯 (Rollins 奧爾金Orkin全美商用住宅專業白蟻害蟲防治)', englishName: 'Rollins Inc.', category: '專業病媒防治' },
  { symbol: 'ROP', name: '羅珀科技 (Roper Technologies 垂直領域利基企業軟體投資收購)', englishName: 'Roper Technologies Inc.', category: '高利潤垂直軟體' },
  { symbol: 'ROST', name: '羅斯百貨 (Ross Stores 尋寶式平價正品名牌折扣服裝量販店)', englishName: 'Ross Stores Inc.', category: '正品折扣服飾' },
  { symbol: 'RSG', name: '共和廢品 (Republic Services 全美第二大固體廢棄物清運與掩埋)', englishName: 'Republic Services Inc.', category: '環保垃圾收運' },
  { symbol: 'RTX', name: '雷神科技 (RTX 普惠飛機發動機/愛國者防空雷達/戰斧飛彈製造)', englishName: 'RTX Corporation', category: '軍工雷達與發動機' },
  { symbol: 'RVTY', name: '瑞萊特 (Revvity 全球新生兒遺傳疾病篩檢與生科檢測試劑)', englishName: 'Revvity Inc.', category: '生醫檢測試劑' },
  { symbol: 'SBAC', name: 'SBA通訊 (SBA Communications 全美及中南美無線基地台電塔REIT)', englishName: 'SBA Communications Corp.', category: '通訊鐵塔基站REIT' },
  { symbol: 'SBUX', name: '星巴克 (Starbucks 全球最大義式咖啡連鎖與臻選烘焙工坊)', englishName: 'Starbucks Corporation', category: '連鎖義式精品咖啡' },
  { symbol: 'SCHW', name: '嘉信理財 (Charles Schwab 零手續費零售券商與資產管理霸主)', englishName: 'The Charles Schwab Corp.', category: '零手續費零售券商' },
  { symbol: 'SHW', name: '宣偉漆 (Sherwin-Williams 全美第一大建築與工業專用油漆塗料)', englishName: 'The Sherwin-Williams Company', category: '建築汽車油漆塗料' },
  { symbol: 'SJM', name: '斯味可 (The J.M. Smucker 美國老牌果醬與Jif花生醬/寵物糧)', englishName: 'The J.M. Smucker Company', category: '果醬與寵物食品' },
  { symbol: 'SLB', name: '斯倫貝謝 (SLB 全球最大跨國油田鑽井與數位油藏工程服務)', englishName: 'Schlumberger Limited', category: '油田鑽井技術' },
  { symbol: 'SMCI', name: '美超微電腦 (Supermicro 輝達認證液冷散熱AI高效能伺服器)', englishName: 'Super Micro Computer Inc.', category: '液冷AI伺服器' },
  { symbol: 'SNA', name: '實耐寶 (Snap-on 專業汽修技師頂級手工具與汽車電腦診斷儀)', englishName: 'Snap-on Incorporated', category: '頂級汽修手工具' },
  { symbol: 'SNPS', name: '新思科技 (Synopsys 全球晶片設計EDA軟體與半導體IP專利霸主)', englishName: 'Synopsys Inc.', category: '半導體設計EDA' },
  { symbol: 'SO', name: '南方電力 (The Southern Company 美國東南部核能與特高壓電網)', englishName: 'The Southern Company', category: '核能電力公用' },
  { symbol: 'SPG', name: '西蒙地產 (Simon Property 全美最大精品暢貨中心Premium Outlets)', englishName: 'Simon Property Group Inc.', category: '名品商場Outlet' },
  { symbol: 'SPGI', name: '標普全球 (S&P Global 標普500指數發明者與全美第一大債信評級)', englishName: 'S&P Global Inc.', category: '金融指數與債信評級' },
  { symbol: 'SRE', name: '森普拉能源 (Sempra 南加州天然氣輸配與德州LNG液化天然氣出口)', englishName: 'Sempra', category: '天然氣電網LNG' },
  { symbol: 'STE', name: '思泰瑞 (STERIS 全球醫院手術室高溫滅菌設備與內視鏡消毒劑)', englishName: 'STERIS plc', category: '醫院滅菌消毒設備' },
  { symbol: 'STLD', name: '鋼動力 (Steel Dynamics 全美先進短流程綠色電弧爐特種合金鋼)', englishName: 'Steel Dynamics Inc.', category: '電弧爐特種合金鋼' },
  { symbol: 'STT', name: '道富銀行 (State Street 全球託管銀行與SPDR標普500 ETF發行商)', englishName: 'State Street Corporation', category: '資產託管與ETF' },
  { symbol: 'STX', name: '希捷科技 (Seagate 全球大容量企業級機械硬碟HDD製造龍頭)', englishName: 'Seagate Technology Holdings', category: '企業大容量硬碟' },
  { symbol: 'STZ', name: '星座品牌 (Constellation Brands 可樂娜Corona/莫德羅Modelo啤酒)', englishName: 'Constellation Brands Inc.', category: '進口暢銷啤酒' },
  { symbol: 'SWK', name: '史丹利百得 (Stanley Black & Decker 史丹利五金與得偉DeWalt工具)', englishName: 'Stanley Black & Decker Inc.', category: '五金電動工具' },
  { symbol: 'SWKS', name: '思佳訊 (Skyworks 蘋果iPhone 5G射頻前端功率放大器晶片)', englishName: 'Skyworks Solutions Inc.', category: '手機5G射頻晶片' },
  { symbol: 'SYF', name: '同步金融 (Synchrony 亞馬遜/沃爾瑪大型零售商聯名信用卡發卡商)', englishName: 'Synchrony Financial', category: '聯名信用卡發卡' },
  { symbol: 'SYK', name: '史賽克 (Stryker 骨科人工髖膝關節與智慧手術室機器人導航)', englishName: 'Stryker Corporation', category: '骨科人工關節醫療' },
  { symbol: 'SYY', name: '西斯科 (Sysco 全球最大餐廳飯店學校食材供應鏈冷鏈配送體系)', englishName: 'Sysco Corporation', category: '餐飲冷鏈配送體系' },
  { symbol: 'T', name: 'AT&T (美國電話電報 跨國電信通訊與5G光纖寬頻網絡運營商)', englishName: 'AT&T Inc.', category: '5G電信通訊網絡' },
  { symbol: 'TAP', name: '摩森康勝 (Molson Coors 庫爾斯淡啤酒Coors Light與精釀啤酒)', englishName: 'Molson Coors Beverage Co.', category: '啤酒飲料釀造' },
  { symbol: 'TDG', name: '全美達 (TransDigm 專利航太核心替換零件與高毛利防務零件)', englishName: 'TransDigm Group Inc.', category: '航太專利零件霸主' },
  { symbol: 'TDY', name: '特利丹科技 (Teledyne 深海聲納探測與軍用紅外線熱成像感測器)', englishName: 'Teledyne Technologies Inc.', category: '軍工紅外熱成像' },
  { symbol: 'TECH', name: '生物技術公司 (Bio-Techne 全球蛋白質研究與抗體生物活性試劑)', englishName: 'Bio-Techne Corp.', category: '生物醫學試劑' },
  { symbol: 'TEL', name: '泰科電子 (TE Connectivity 全球車用高壓連接器與感測元件龍頭)', englishName: 'TE Connectivity Ltd.', category: '車用高壓連接器' },
  { symbol: 'TER', name: '泰瑞達 (Teradyne 半導體晶圓自動化測試機台與優傲工業協作機器人)', englishName: 'Teradyne Inc.', category: '半導體測試機台' },
  { symbol: 'TFX', name: '泰利福 (Teleflex 血管介入心臟急救導管與重症監護專用醫療耗材)', englishName: 'Teleflex Incorporated', category: '重症急救導管耗材' },
  { symbol: 'TGT', name: '目標百貨 (Target 美國大型精品連鎖百貨與流行服飾生活量販店)', englishName: 'Target Corporation', category: '大型精品生活量販' },
  { symbol: 'TJX', name: 'TJX公司 (T.J. Maxx / Marshalls 全球名牌折扣服飾尋寶連鎖門市)', englishName: 'The TJX Companies Inc.', category: '名牌折價連鎖百貨' },
  { symbol: 'TMO', name: '賽默飛世爾 (Thermo Fisher 全球最大科學儀器/實驗室耗材/CDMO)', englishName: 'Thermo Fisher Scientific Inc.', category: '全球科學儀器巨擘' },
  { symbol: 'TMUS', name: 'T-Mobile美國 (全美覆蓋最廣Ultra Capacity 5G電信網絡運營商)', englishName: 'T-Mobile US Inc.', category: '5G高速電信網絡' },
  { symbol: 'TPR', name: '掛毯集團 (Tapestry Coach / Kate Spade / Stuart Weitzman輕奢精品)', englishName: 'Tapestry Inc.', category: '輕奢名牌皮件精品' },
  { symbol: 'TRGP', name: '塔爾加資源 (Targa Resources 二疊紀天然氣液體NGL收集與管網)', englishName: 'Targa Resources Corp.', category: '天然氣液體NGL' },
  { symbol: 'TRMB', name: '天寶導航 (Trimble 智慧農業GPS無人自動駕駛與建築工程測繪)', englishName: 'Trimble Inc.', category: '高精度衛星測繪GPS' },
  { symbol: 'TROW', name: '普信集團 (T. Rowe Price 歷史悠久主動型共同基金與退休資產管理)', englishName: 'T. Rowe Price Group Inc.', category: '主動型基金管理' },
  { symbol: 'TRV', name: '旅行家保險 (The Travelers Companies 全美商業與個人財產保險)', englishName: 'The Travelers Companies Inc.', category: '商業綜合財產保險' },
  { symbol: 'TSCO', name: '拖拉機供應 (Tractor Supply 鄉村生活農用機具/寵物糧/戶外服裝)', englishName: 'Tractor Supply Company', category: '鄉村生活雜貨量販' },
  { symbol: 'TSLA', name: '特斯拉 (Tesla 全球電動車/FSD全自動駕駛/儲能Megapack/Optimus)', englishName: 'Tesla Inc.', category: '電動車與人工智慧' },
  { symbol: 'TSN', name: '泰森食品 (Tyson Foods 全美第一大雞肉牛肉豬肉生鮮肉品屠宰加工)', englishName: 'Tyson Foods Inc. Class A', category: '生鮮肉品加工屠宰' },
  { symbol: 'TT', name: '特靈科技 (Trane 商業與工業智慧節能冷氣暖通空調HVAC系統)', englishName: 'Trane Technologies plc', category: '商業智慧暖通HVAC' },
  { symbol: 'TTWO', name: 'Take-Two互動 (俠盜獵車手GTA 6 / NBA 2K系列遊戲全球發行商)', englishName: 'Take-Two Interactive Software', category: '3A主機遊戲發行' },
  { symbol: 'TXN', name: '德州儀器 (TI 全球類比晶片與嵌入式微控制器類比半導體霸主)', englishName: 'Texas Instruments Incorporated', category: '全球類比晶片霸主' },
  { symbol: 'TYL', name: '泰勒科技 (Tyler Technologies 全美地方公部門政府與法院專用ERP)', englishName: 'Tyler Technologies Inc.', category: '公部門政府專用軟體' },
  { symbol: 'UAL', name: '聯合航空 (United Airlines 跨大西洋與跨太平洋主要國際樞紐航司)', englishName: 'United Airlines Holdings Inc.', category: '國際跨洋航空客運' },
  { symbol: 'UBER', name: 'Uber (全球最大共乘叫車/Uber Eats外送/Uber Freight貨運平台)', englishName: 'Uber Technologies Inc.', category: '全球共乘叫車平台' },
  { symbol: 'UDR', name: '聯合自治區房產 (UDR 全美高薪科技都會區高端奢華公寓出租REIT)', englishName: 'UDR Inc.', category: '高階出租公寓REIT' },
  { symbol: 'UHS', name: '環球健康服務 (Universal Health 全美急症醫院與精神心理健康機構)', englishName: 'Universal Health Services Inc.', category: '心理衛生與綜合醫院' },
  { symbol: 'ULTA', name: 'Ulta美容 (Ulta Beauty 全美最大一站式化妝品香水與美髮沙龍連鎖)', englishName: 'Ulta Beauty Inc.', category: '美妝護膚沙龍連鎖' },
  { symbol: 'UNH', name: '聯合健康 (UnitedHealth 全球最大健康醫療保險與Optum醫護體系)', englishName: 'UnitedHealth Group Inc.', category: '全球最大健康醫療' },
  { symbol: 'UNP', name: '聯合太平洋 (Union Pacific 橫貫美國西部與墨西哥邊境一級貨運鐵路)', englishName: 'Union Pacific Corporation', category: '跨州一級重載鐵路' },
  { symbol: 'UPS', name: '優比速 (UPS 全球最大綜合物流快遞與供應鏈解決方案包裹網絡)', englishName: 'United Parcel Service Inc.', category: '全球物流包裹快遞' },
  { symbol: 'URI', name: '聯合租賃 (United Rentals 北美最大建築重型機具與發電機工程租賃)', englishName: 'United Rentals Inc.', category: '工程重機具設備租賃' },
  { symbol: 'USB', name: '美國合眾銀行 (U.S. Bancorp 中西部老牌穩健大型區域商業銀行)', englishName: 'U.S. Bancorp', category: '全美前五大商業銀行' },
  { symbol: 'V', name: 'Visa (全球最大電子支付卡交易授權清算與代幣化安全網絡)', englishName: 'Visa Inc.', category: '全球支付清算巨擘' },
  { symbol: 'VICI', name: 'VICI地產 (拉斯維加斯凱撒宮/百樂宮/威尼斯人頂級賭場地產REIT)', englishName: 'VICI Properties Inc.', category: '奢華賭場度假REIT' },
  { symbol: 'VLO', name: '瓦萊羅能源 (Valero 全美產能效率最高獨立石油煉製與生質柴油)', englishName: 'Valero Energy Corporation', category: '石油煉化與生質燃料' },
  { symbol: 'VLTO', name: '韋爾拓 (Veralto 全球水質精確分析檢測與包裝條碼追溯檢驗儀器)', englishName: 'Veralto Corporation', category: '水質檢測與產品包裝' },
  { symbol: 'VMC', name: '伏爾甘材料 (Vulcan Materials 全美最大砂石骨料碎石水泥混凝土製造)', englishName: 'Vulcan Materials Company', category: '砂石骨料水泥建材' },
  { symbol: 'VRSK', name: '維里斯克 (Verisk Analytics 全球財產保險精算風控大數據與氣候模型)', englishName: 'Verisk Analytics Inc.', category: '保險精算風控數據' },
  { symbol: 'VRSN', name: '威 sign (VeriSign 全球.com與.net根網域權威解析獨家特許營運商)', englishName: 'VeriSign Inc.', category: '根網域權威運營' },
  { symbol: 'VRTX', name: '福泰製藥 (Vertex 囊腫性纖維化小分子標靶與CRISPR基因編輯療法)', englishName: 'Vertex Pharmaceuticals', category: '罕見病基因治療' },
  { symbol: 'VST', name: '維斯達能源 (Vistra 全天候AI資料中心超大型清潔電力與儲能供應商)', englishName: 'Vistra Corp.', category: 'AI清潔能源供應' },
  { symbol: 'VTR', name: '溫塔斯 (Ventas 全美領先銀髮高齡照護社區與醫療辦公大樓REIT)', englishName: 'Ventas Inc.', category: '銀髮照護醫療REIT' },
  { symbol: 'VZ', name: '威瑞森電信 (Verizon Communications 全美覆蓋最廣5G無限通訊網絡)', englishName: 'Verizon Communications Inc.', category: '5G行動通訊電信' },
  { symbol: 'WAB', name: '西屋制動 (Wabtec 全球鐵路柴油電力機車頭與煞車安全系統製造)', englishName: 'Westinghouse Air Brake Tech', category: '鐵路機車裝備製造' },
  { symbol: 'WAT', name: '沃特世 (Waters 全球實驗室高階液相層析儀與質譜儀分離分析設備)', englishName: 'Waters Corporation', category: '高階質譜分析儀器' },
  { symbol: 'WBA', name: '沃爾格林聯合博姿 (Walgreens Boots 全美大型連鎖社區處方藥局)', englishName: 'Walgreens Boots Alliance Inc.', category: '連鎖社區藥妝超商' },
  { symbol: 'WBD', name: '華納兄弟探索 (Warner Bros. Discovery HBO / Max串流 / DC宇宙)', englishName: 'Warner Bros. Discovery Inc.', category: '影視傳媒與串流娛樂' },
  { symbol: 'WDC', name: '威騰電子 (Western Digital 威騰NAND快閃記憶體與企業機械硬碟)', englishName: 'Western Digital Corporation', category: '快閃記憶體與硬碟' },
  { symbol: 'WEC', name: 'WEC能源 (威斯康辛與密西根電力天然氣特許公用事業網絡)', englishName: 'WEC Energy Group Inc.', category: '電力天然氣公用' },
  { symbol: 'WELL', name: '衛健地產 (Welltower 全球最大銀髮高齡安養社區與門診醫療REIT)', englishName: 'Welltower Inc.', category: '銀髮高齡醫療REIT' },
  { symbol: 'WFC', name: '富國銀行 (Wells Fargo 全美歷史悠久零售房貸與商業金融銀行巨頭)', englishName: 'Wells Fargo & Company', category: '全美零售商業銀行' },
  { symbol: 'WM', name: '廢物管理 (Waste Management 全美第一大固體垃圾清運回收與掩埋)', englishName: 'Waste Management Inc.', category: '固體廢棄物環保清運' },
  { symbol: 'WMB', name: '威廉斯 (Williams 橫跨全美 Transco 骨幹天然氣集輸長途管道網絡)', englishName: 'The Williams Companies Inc.', category: '長途天然氣集輸管網' },
  { symbol: 'WMT', name: '沃爾瑪 (Walmart 全球營業額第一大跨國平價零售與電子商務實體霸主)', englishName: 'Walmart Inc.', category: '全球平價零售量販' },
  { symbol: 'WRB', name: '伯克利保險 (W. R. Berkley 全球專業特種超額商業責任保險)', englishName: 'W. R. Berkley Corporation', category: '專業特種商業保險' },
  { symbol: 'WST', name: '西氏醫藥包裝 (West Pharmaceutical 針劑無菌橡膠活塞瓶塞包裝)', englishName: 'West Pharmaceutical Services', category: '針劑無菌醫藥包裝' },
  { symbol: 'WTW', name: '韋萊韜悅 (Willis Towers Watson 跨國企業風險管理保險與人資顧問)', englishName: 'Willis Towers Watson Public Ltd.', category: '企業風險人資諮詢' },
  { symbol: 'WY', name: '惠好 (Weyerhaeuser 北美最大永續林地管理木材與原木製造REIT)', englishName: 'Weyerhaeuser Company', category: '永續林地木材REIT' },
  { symbol: 'WYNN', name: '永利渡假村 (Wynn Resorts 拉斯維加斯與澳門頂級奢華博弈度假酒店)', englishName: 'Wynn Resorts Limited', category: '奢華度假賭場酒店' },
  { symbol: 'XEL', name: '埃克塞爾能源 (Xcel Energy 中西部綠能風力發電與智慧電網公用)', englishName: 'Xcel Energy Inc.', category: '風力綠能電力公用' },
  { symbol: 'XOM', name: '埃克森美孚 (ExxonMobil 全球最大垂直整合跨國石油天然氣工業霸主)', englishName: 'Exxon Mobil Corporation', category: '全球綜合石油天然氣' },
  { symbol: 'XYL', name: '賽萊默 (Xylem 全球智慧水科技水泵防洪排澇與污水處理系統)', englishName: 'Xylem Inc.', category: '智慧水處理防洪系統' },
  { symbol: 'YUM', name: '百勝餐飲 (Yum! Brands 肯德基KFC / 必勝客 / 塔可鐘全球速食)', englishName: 'Yum! Brands Inc.', category: '全球速食連鎖餐飲' },
  { symbol: 'ZBH', name: '捷邁邦美 (Zimmer Biomet 人工髖關節與膝關節植入物與手術導航)', englishName: 'Zimmer Biomet Holdings Inc.', category: '骨科人工關節植入物' },
  { symbol: 'ZBRA', name: '斑馬技術 (Zebra Technologies 工業級條碼掃描槍/RFID/手持終端)', englishName: 'Zebra Technologies Corp.', category: '工業條碼RFID設備' },
  { symbol: 'ZTS', name: '碩騰 (Zoetis 原輝瑞動物保健/全球第一大伴侶寵物與家畜藥物疫苗)', englishName: 'Zoetis Inc.', category: '全球第一大動物製藥' },
];

function cleanChineseName(rawName, symbol) {
  if (symbol === 'NVDA') return '輝達';
  if (symbol === 'AAPL') return '蘋果';
  if (symbol === 'MSFT') return '微軟';
  if (symbol === 'AMZN') return '亞馬遜';
  if (symbol === 'GOOGL') return 'Alphabet (Google)';
  if (symbol === 'GOOG') return 'Alphabet (Google)';
  if (symbol === 'META') return 'Meta (臉書)';
  if (symbol === 'TSLA') return '特斯拉';
  if (symbol === 'NFLX') return '網飛 (Netflix)';
  if (symbol === 'DIS') return '迪士尼';
  if (symbol === 'NKE') return '耐吉';
  if (symbol === 'SBUX') return '星巴克';
  if (symbol === 'MCD') return '麥當勞';
  if (symbol === 'BRK.B') return '波克夏海瑟威 B';
  if (symbol === 'BRK.A') return '波克夏海瑟威 A';
  if (symbol === 'TSM') return '台積電 ADR';
  if (symbol === 'ASML') return '艾司摩爾 ADR';
  if (symbol === 'AVGO') return '博通';
  if (symbol === 'AMD') return '超微半導體';
  if (symbol === 'INTC') return '英特爾';
  if (symbol === 'QCOM') return '高通';
  if (symbol === 'TXN') return '德州儀器';
  if (symbol === 'MU') return '美光科技';
  if (symbol === 'AMAT') return '應用材料';
  if (symbol === 'LRCX') return '科林研發';
  if (symbol === 'KLAC') return '科磊';
  if (symbol === 'PLTR') return '帕蘭提爾';
  if (symbol === 'ARM') return '安謀科技';
  if (symbol === 'ORCL') return '甲骨文';
  if (symbol === 'CRM') return '賽富時';
  if (symbol === 'ADBE') return 'Adobe';
  if (symbol === 'CSCO') return '思科';
  if (symbol === 'IBM') return 'IBM';
  if (symbol === 'NOW') return 'ServiceNow';
  if (symbol === 'INTU') return '直覺軟體';
  if (symbol === 'SNOW') return 'Snowflake';
  if (symbol === 'CRWD') return 'CrowdStrike';
  if (symbol === 'PANW') return 'Palo Alto Networks';
  if (symbol === 'NET') return 'Cloudflare';
  if (symbol === 'UBER') return 'Uber (優步)';
  if (symbol === 'ABNB') return 'Airbnb (愛彼迎)';
  if (symbol === 'SPOT') return 'Spotify';
  if (symbol === 'COIN') return 'Coinbase';
  if (symbol === 'HOOD') return 'Robinhood (羅賓漢)';
  if (symbol === 'JPM') return '摩根大通';
  if (symbol === 'BAC') return '美國銀行';
  if (symbol === 'WFC') return '富國銀行';
  if (symbol === 'C') return '花旗集團';
  if (symbol === 'GS') return '高盛集團';
  if (symbol === 'MS') return '摩根士丹利';
  if (symbol === 'SCHW') return '嘉信理財';
  if (symbol === 'BLK') return '貝萊德';
  if (symbol === 'BX') return '黑石集團';
  if (symbol === 'V') return 'Visa';
  if (symbol === 'MA') return '萬事達卡';
  if (symbol === 'AXP') return '美國運通';
  if (symbol === 'PYPL') return 'PayPal';
  if (symbol === 'LLY') return '禮來製藥';
  if (symbol === 'NVO') return '諾和諾德 ADR';
  if (symbol === 'UNH') return '聯合健康';
  if (symbol === 'JNJ') return '嬌生';
  if (symbol === 'ABBV') return '艾伯維';
  if (symbol === 'MRK') return '默克藥廠';
  if (symbol === 'PFE') return '輝瑞製藥';
  if (symbol === 'TMO') return '賽默飛世爾';
  if (symbol === 'ABT') return '亞培';
  if (symbol === 'DHR') return '丹納赫';
  if (symbol === 'ISRG') return '直覺外科 (達文西手術)';
  if (symbol === 'COST') return '好市多';
  if (symbol === 'WMT') return '沃爾瑪';
  if (symbol === 'HD') return '家得寶';
  if (symbol === 'PG') return '寶僑';
  if (symbol === 'KO') return '可口可樂';
  if (symbol === 'PEP') return '百事公司';
  if (symbol === 'CAT') return '開拓重工';
  if (symbol === 'GE') return '奇異航太';
  if (symbol === 'BA') return '波音';
  if (symbol === 'LMT') return '洛克希德馬丁';
  if (symbol === 'RTX') return '雷神科技';
  if (symbol === 'XOM') return '埃克森美孚';
  if (symbol === 'CVX') return '雪佛龍';
  if (symbol === 'O') return 'Realty Income';
  if (symbol === 'PLD') return '普洛斯';
  if (symbol === 'AMT') return '美國電塔';
  if (symbol === 'EQIX') return '易昆尼克斯';
  if (symbol === 'VOO') return 'Vanguard標普500 ETF';
  if (symbol === 'SPY') return 'SPDR標普500 ETF';
  if (symbol === 'IVV') return 'iShares核心標普500 ETF';
  if (symbol === 'QQQ') return 'Invesco那斯達克100 ETF';
  if (symbol === 'QQQM') return 'Invesco那指100微型 ETF';
  if (symbol === 'VT') return 'Vanguard全世界股票ETF';
  if (symbol === 'VTI') return 'Vanguard全美市場股票ETF';
  if (symbol === 'TLT') return 'iShares 20年期以上美國公債ETF';

  const m = rawName.match(/^([^\(（]+)(?:[\(（](.+)[\)）])?$/);
  if (m) {
    const main = m[1].trim();
    const paren = m[2] ? m[2].trim() : '';
    if (paren && paren.length <= 10 && !paren.includes(' ') && !paren.includes('母公司')) {
      return `${main} (${paren})`;
    }
    return main;
  }
  return rawName.trim();
}

for (const item of extraComponents) {
  usMap.set(item.symbol.toUpperCase(), {
    ...item,
    name: cleanChineseName(item.name, item.symbol.toUpperCase()),
    symbol: item.symbol.toUpperCase(),
    market: 'US',
    source: 'US_POPULAR',
  });
}

const finalUSList = Array.from(usMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));

console.log('Final Unique US Stocks Count:', finalUSList.length);

const generatedFileContent = `import { StockDictionaryItem } from '../types/stockDictionary';

/**
 * 台股主流靜態種子資料庫
 */
export const STATIC_TW_STOCKS: StockDictionaryItem[] = [${twBlock}];

/**
 * 美股全量 500+ 檔標普500成分股、那斯達克100與主流 ETF 種子資料庫 (${finalUSList.length} 檔)
 */
export const STATIC_US_STOCKS: StockDictionaryItem[] = [
${finalUSList
  .map(
    (item) => {
      const cleanName = cleanChineseName(item.name, item.symbol);
      const safeName = cleanName.replace(/'/g, "\\'");
      const safeEng = (item.englishName || '').replace(/'/g, "\\'");
      const safeCat = (item.category || '').replace(/'/g, "\\'");
      return `  { symbol: '${item.symbol}', name: '${safeName}', englishName: '${safeEng}', market: 'US', category: '${safeCat}', source: 'US_POPULAR' },`;
    }
  )
  .join('\n')}
];

/**
 * 完整靜態字典清單
 */
export const STATIC_STOCK_DICTIONARY: StockDictionaryItem[] = [
  ...STATIC_TW_STOCKS,
  ...STATIC_US_STOCKS,
];

/**
 * 快速鍵值字典：以代碼大寫為 Key，對應繁體中文名稱
 */
export const STATIC_SECURITY_NAMES: Record<string, string> = STATIC_STOCK_DICTIONARY.reduce(
  (acc, item) => {
    acc[item.symbol.toUpperCase()] = item.name;
    return acc;
  },
  {} as Record<string, string>
);
`;

fs.writeFileSync(targetPath, generatedFileContent, 'utf8');
console.log('Successfully wrote to:', targetPath);
