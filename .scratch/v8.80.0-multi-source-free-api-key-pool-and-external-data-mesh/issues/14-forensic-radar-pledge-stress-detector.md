# 14-forensic-radar-pledge-stress-detector

## Description
將董監質押與內部人申報轉讓指標正式整合進 `src/engine/forensicRadarEngine.ts`。建立防雷偵測門檻：當標的「董監質押比率 > 50%」或「質押比率單季暴增 > 20%」或「高管大量申報轉讓」時，觸發高風險紅燈警戒並扣減治理評分。

## Target Files
- `src/engine/forensicRadarEngine.ts`
- `src/engine/forensicRadarEngine.test.ts`

## Acceptance Criteria
- [x] 擴充法證分析評估維度，加入「董監事持股質押風險 (Director Pledge Risk)」。
- [x] 判定規則：
  - 質押率 $\ge 50\%$：直接標記為【極高斷頭風險 (CRITICAL)】，法證雷達扣除 30 分。
  - 質押率介於 $30\% \sim 50\%$：標記為【警戒 (WARNING)】，扣除 15 分。
  - 當月有高管申報轉讓持股 $\ge 500$ 張：標記為【內部人減持警示】。
- [x] 產生對應的使用者繁體中文警示診斷摘要。
- [x] 編寫測試驗證質押率 60% 時精準觸發紅燈警報與扣分。

## Status
- [x] done
