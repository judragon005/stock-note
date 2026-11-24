# 05 — Card 01 主 K 線圖補齊 J 線／查價列與受控時框／副圖雙向同步介面

**Parent:** #605 (Spec 0245)

**What to build:** 升級主 K 線圖（Card 01）：將週 K／月 K 切換之副圖序列計算遷移至單趟 $O(N)$ 引擎、於 KD 副圖與頂部查價狀態列補齊 `J` 值繪製與數值讀出，並開放可選受控屬性（`timeframe` / `onTimeframeChange`、`subchartMode` / `onSubchartModeChange`），使父容器能與 `Card 01B` 雙向即時同步，同時保留無傳入時的既有非受控預設行為。

**Blocked by:** 03 — 單趟 O(N) KDJ(含 J) / MACD / RSI(6·14) 序列引擎與盤中零量定錨隔離

**Status:** ready-for-agent

- [ ] 切換至週 K 或月 K 時使用單趟 $O(N)$ 引擎計算指標，消除重複切片開銷且維持所有既有副圖精準繪製
- [ ] 副圖切換至 KD 模式時，SVG 同步呈現 K / D / J 三條折線，查價狀態列清晰顯示 `K / D / J` 數值
- [ ] 支援可選受控 `timeframe` 與 `subchartMode` 屬性雙向通知；未傳入受控屬性時完全相容既有獨立互動與重設視圖行為
- [ ] 既有主 K 線圖單元測試全部綠燈，並補齊受控同步與 J 值顯示斷言
