# Issue #02: 在庫持倉美股日 K 棒自動注入與真實 CMF 資金流計算

## 狀態
`ready-for-agent`

## 說明
在 `ChipsWorkspace.tsx` 中，為持倉中美股標的載入 30 日歷史日 K 棒 (`candles`)，使 `computeChaikinMoneyFlow` 能算出真實的機構吸籌與出貨強度，消除 $Y=0$ 死線。

## 驗收標準
1. 美股持倉標的傳入包含 high, low, open, close, volume 之日 K 棒。
2. 美股在泡泡圖中的 Y 軸評分不再為 0，能動態分類至四象限。
3. 單元測試驗證通過。
