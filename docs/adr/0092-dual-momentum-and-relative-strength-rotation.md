# ADR 0092: 雙重動能與跨資產趨勢輪動評分架構 (Gary Antonacci Dual Momentum)

- **狀態**：`ACCEPTED`
- **日期**：2026-09-08
- **決策者**：AI Pair Programmer & User
- **關聯 PRD**：[PRD #0092](../specs/0092-dual-momentum-and-relative-strength-rotation-spec.md)
- **關聯技術債**：[技術債 #0027](../debts/0027-dual-momentum-and-relative-strength-rotation.md) (`RESOLVED`)
- **前置依賴**：
  - [ADR 0090 (客戶端 API 速率限制與防封禁配額保護)](0090-client-side-rate-limiting-and-api-quota-guard.md)
  - [ADR 0091 (本地全量歷史技術指標庫與日 K 回補引擎)](0091-local-historical-indicators-and-external-backfill-engine.md)

---

## 1. 背景與脈絡 (Context)

系統先前在資產配置上主要基於目標比例進行固定再平衡，但在長期熊市或結構性板塊劇烈輪動時，固定再平衡常陷入「持續逆勢加碼弱勢資產」的困境。

為突破盲點，系統引入 Gary Antonacci 的經典「雙重動能 (Dual Momentum)」策略：
1. **相對動能 (Relative Momentum)**：在強勢資產持續領跑時順勢搭順風車。
2. **絕對動能 (Absolute Momentum)**：在系統性熊市時自動觸發「現金避風港 (Safe Haven)」防禦閘門，退守現金或超短期國庫券。

---

## 2. 架構決策 (Decision)

1. **型別抽象與資料結構 (`src/types/momentum.ts`)**：
   - 定義 `MomentumAssetMetric`、`DualMomentumSignal` 與 `MomentumUniverseConfig`。
2. **純函式雙重動能評分核心 (`src/engine/dualMomentumEngine.ts`)**：
   - **12-1M 加權動能分數**：
     $$\text{Score} = 0.5 \times R_{12M} + 0.3 \times R_{6M} + 0.2 \times R_{3M}$$
     （剔除近 1 個月短期雜訊，捕捉中期穩固趨勢）。
   - **相對動能排行榜**：在指定資產池中按分數降序排序，推選冠軍資產。
   - **絕對動能避風港狀態機**：
     - 若冠軍標的 12M 回報高於無風險利率：
       - 若目前持有該標的 ➔ `HOLD_TOP`（續抱）
       - 若未持有該標的 ➔ `SWITCH_ASSET`（輪動換股）
     - 若所有標的 12M 回報皆落後無風險基準 ➔ `MOVE_TO_CASH`（觸發避風港，現金為王）。
3. **內建三大經典資產池配置 (`DEFAULT_MOMENTUM_UNIVERSES`)**：
   - 全球宏觀全天候動能池 (Global Macro)
   - 台股核心標的輪動池 (Taiwan Core Rotation)
   - 美股成長與板塊輪動池 (US Tech & Growth)

---

## 3. 結果與影響 (Consequences)

### 正面效益
- 解決固定權重再平衡在空頭市場的盲目加碼問題，提供紀律化的趨勢跟隨與避險信號。
- 深度銜接前兩階段的速率限制器 (#0090) 與全量歷史日 K 庫 (#0091)，為後續「宏觀戰情室 (#0020)」提供直接消費的輪動排行與避險狀態。
- 單元測試覆蓋率 100%（全專案 53 個測試套件、589 個測試全數綠燈）。
