# ADR-0081: TPEx 櫃買三大法人管線接入、圖卡對角智慧避讓與雙向正交蜂巢排斥系統

## 狀態 (Status)
**已接受 (Accepted)** - 2026-09-07

## 背景與問題陳述 (Context & Problem Statement)
1. **8299 群聯法人全為 0 (資料源上市單盲)**：原 smartMoneyFetcher.ts 僅抓取 TWSE 上市日報，8299 群聯屬 TPEx 櫃買中心上櫃股票，查無數據導致歷史與即時法人張數全部歸 0。
2. **Tooltip 浮窗自蓋目標泡泡**：Tooltip 採固定左下角定位 (ottom: 16px; left: 16px)，當使用者查看左下象限之泡泡時，浮窗 100% 擋住目標泡泡本體。
3. **文案與數據矛盾**：法人進出 0 張時，若價格下跌直接被歸類為「冷凍提款」，輸出「大機構大舉提款」之矛盾幻覺。
4. **垂直糖葫蘆串珠**：漲跌幅接近 0% 之多檔標的在縱軸擠壓，演算法僅在 Y 軸推開，排成一列垂直串。

## 決策 (Decision)
1. **TPEx 櫃買三大法人日報雙軌管線 (TPEx Pipeline & Union)**：
   - 擴充 parseTpexInstitutionalReport 解析櫃買中心官方日報，換算為張數。
   - 每次抓取時並行請求 TWSE 與 TPEx 並合併聯集，快取至 IndexedDB，完整覆蓋上市與上櫃全市場股票。
2. **Tooltip 象限對角智慧避讓 (Smart Diagonal Pinning)**：
   - 實作 calculateTooltipPlacement(cx, cy, width, height)，依目標泡泡坐標對角定位（左半側排至右側、下半部排至頂部），目標泡泡 100% 露出。
3. **雙向正交蜂巢排斥 (Bidirectional Orthogonal Dispersion)**：
   - 在 esolveBubbleCollisions 中，不僅水平串時注入垂直正交力，當 $|\Delta x| < 6$ 垂直串時亦主動注入水平正交力，展開為自然二維蜂巢狀。
4. **法人零量能中立保護診斷 (Zero-Volume Neutral Guard)**：
   - 當法人買賣為 0 時，標註「散戶/量縮偏弱區」，文案說明三大法人進出平緩，杜絕驚悚矛盾詞彙。

## 後果 (Consequences)
- 8299 群聯等上櫃標的具備真實非 0 之三大法人籌碼與動態軌跡。
- Tooltip 浮窗絕不遮擋任何正在被點選或懸浮的泡泡。
- 徹底消滅垂直一字排開現象。
- 診斷結論與法人數據 100% 一致。
