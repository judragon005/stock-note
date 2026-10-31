# 09 — 雙動能與持股箱子真實湖倉 K 線水合、自訂停損/處置股/FOMO 防追高整合與一鍵戰術跳轉 (Lakehouse OHLCV Hydration, Holding Risk/Disposition/FOMO Signals & 1-Click Deep Links)

**What to build:**
自動自本地 SQLite (`/api/market/history/:symbol`) 與 IndexedDB 水合雙動能基準池 (`SPY`, `QQQ`, `SMH`, `TLT`, `GLD`, `0050.TW`, `0056.TW`) 與在倉股之真實歷史 OHLCV 日 K，消滅雙動能 `-999%` 與平坦假 K 線；在「持股多空行動訊號」中整合個股 `TradePlan` 自訂停損停利觸價 (`riskAlertEngine`)、處置/注意股標籤 (`dispositionWindowEngine`)、過熱時之個人歷史追高勝率警語 (`behavioralAuditEngine`)，並提供一鍵開啟「全息技術面 (`OmniTechnicalInspectorModal`)」、「個股 AI 戰情室 (`AiForceDashboardView`)」與「快速下單 (`TradeModal`)」按鈕（異常優先展開、正常震盪可收合）。

**Blocked by:** 01 — 戰情室元件預重構與台美紅綠漲跌主題色全面對齊

**Status:** ready-for-agent

- [x] 雙動能基準池與在倉持股自動自本地湖倉/IndexedDB 水合真實 OHLCV 日 K，不再出現 `-999%` 或 `open=high=low=close` 平坦假 K 線
- [x] 持股訊號列整合 `evaluateRiskStatus`（自訂停損/停利觸價）、`resolveDispositionAttentionStatus`（處置/注意股徽章）與 `calculateBehavioralAuditReport`（過熱時提示歷史追高勝率）
- [x] 持股訊號列支援異常優先展開/正常收合，並提供一鍵開啟全息技術面、個股 AI 戰情室與下單彈窗按鈕

