# Issue #271: feat(lakehouse): 全市場全歷史湖倉架構解耦、250日預載視窗與跨模組本地優先整合工程 (Spec 0188)

- **狀態**：`ready-for-agent`
- **類別**：`enhancement`
- **對應規格**：[`docs/specs/0188-full-market-all-history-lakehouse-and-preload-decoupling-spec.md`](../../docs/specs/0188-full-market-all-history-lakehouse-and-preload-decoupling-spec.md)
- **遠端 GitHub Issue**：[#271](https://github.com/judragon005/stock-note/issues/271)

## 需求總覽

解開「資料庫儲存深度（全歷史湖倉）」與「應用層載入視窗（最近 250 天預載）」的架構混淆，拔除大盤基準 SPY 假數據，打通歷史淨值與除權息之本地資料庫優先通道，並強化回補雙軌進度顯示與看門狗尾盤自動補漏。

詳細內容請參閱對應規格書。
