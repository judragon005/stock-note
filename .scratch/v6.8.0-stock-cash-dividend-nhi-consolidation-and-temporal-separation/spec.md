# 規格書 0056：配股配息二代健保合併計算與時間軸分離架構

詳細規格請參閱 [0056-stock-cash-dividend-nhi-consolidation-and-temporal-separation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0056-stock-cash-dividend-nhi-consolidation-and-temporal-separation-spec.md)。

## 狀態
- **標籤**：`ready-for-agent`
- **版本**：v6.8.0
- **涵蓋重點**：
  1. 永豐金 31,000 股配息 1.1 + 配股 0.2 實收 NT$ 33,250 驗證與二代健保 NT$ 850 自動代扣。
  2. 除權息日 (Ex-Date)、現金發放日 (Cash Pay Date) 與配股上市入庫日 (Stock Pay Date) 三階段時間軸分離。
  3. 待入帳配股與應收現金在途平滑，杜絕除權空窗期損益假摔。
  4. 智慧掃描同標的同除權息日之關聯事件合併計算與自動扣抵草稿產出。
