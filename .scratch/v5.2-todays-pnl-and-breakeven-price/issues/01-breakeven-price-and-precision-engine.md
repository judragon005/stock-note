# Ticket 01: 精確損益平衡保本價求解器與會計精度加固 (Breakeven Price & Precision Engine)

## 需求說明
- 於 `src/engine/calculator.ts` 實作 `calculateBreakevenPrice(shares, totalCostBasis, market, symbol, account)`：
  - 支援台股現股 (0.3% 稅)、股票型 ETF (0.1% 稅)、債券型 ETF (0% 稅)。
  - 支援券商手續費折讓率 (如 2.8折、2折) 與最低低消 (預設 20 元) 階梯補償。
  - 支援美股零手續費與複委託手續費計算法。
  - 內建離散整數捨去 (Floor) 閉環驗證，確保以保本價賣出的淨所得 100% $\ge$ 總成本基準。
- 修復現金減資超額退款轉列已實現損益（技術債 #0013）：當退款高於持股成本基準時，成本歸零，超額退款轉入 `realizedPnL`。
- 美股小數點碎股萬分位精度強制收斂。
- 撰寫 `src/engine/calculator.test.ts` 完整 TDD 單元測試（現股、ETF、債券、美股、低消階梯、減資超額退款），達成 100% 測試覆蓋。

**Status:** done

- [x] 實作 `calculateBreakevenPrice` 演算法。
- [x] 修復現金減資超額退款與碎股浮點數精度。
- [x] 完成 `src/engine/calculator.test.ts` 新增測試並 100% 通過。
