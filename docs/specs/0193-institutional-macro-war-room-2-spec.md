# 需求規格說明書 (PRD) - 0193: 法人旗艦級宏觀戰情室 2.0 (Institutional Macro War Room 2.0)

## Problem Statement

現有宏觀戰情室（Market War Room）雖然建立了四層基礎骨架，但存在三大致命缺陷與多項關鍵盲點：
1. **假數據殘留與規範違背**：雙重動能輪動模組寫死了 145 行模擬數據（`MOCK_MOMENTUM_PRICES`），嚴重違反專案的 `zeroMockPolicy`，且未與系統已建立的全歷史日 K 湖倉（Lakehouse）實質連動。
2. **缺乏機構級信用與流動性金絲雀**：僅有美債 10Y/2Y 殖利率，完全缺乏企業信用利差（High Yield OAS）與債券履約違約互換保險指數（CDS / CDX Index），無法在流動性危機爆發前夕收到風控警報。
3. **台美雙市場混雜未分流**：美股由利率、通膨與信用主導，台股由外資期貨空單、匯率與融資維持率主導。兩者混雜造成訊號失真。
4. **缺乏實戰在險價值與壓力測試**：個人防護盾僅呈現靜態維持率，未提供機構風控標準的單日 95% 在險價值（1-Day 95% VaR）與極簡快速壓力測試。
5. **API 配額與相容性隱患**：頻繁切換頁籤存在重複請求消耗免費配額之風險，且讀取舊版 LocalStorage 存在 `undefined.toFixed()` 白屏崩潰之威脅。

---

## Solution

將宏觀戰情室全面重構為「法人旗艦級宏觀戰情室 2.0 (Institutional Macro War Room 2.0)」：
1. **宏觀水溫計與三秒決策動線**：建立 0~100 綜合水溫計（Macro Thermometer），給出明確的建議股票總倉位上限與【防禦/平衡/進攻】姿態。
2. **頂部台美專屬雙軌切換 (TW / US / Global)**：
   - 🇹🇼 台股視角：外資台指期淨未平倉口數、全市場融資維持率（130% 斷頭線）、台幣匯率與土洋對作雷達。
   - 🇺🇸 美股視角：10Y/2Y 利差倒掛形態、高收益債利差 (HY OAS)、CDS 債券履約違約保險指數 (CDX) 與 VIX 恐慌指數。
3. **100% Zero Mock 湖倉動態驅動**：徹底剷除所有寫死假數據，介接本機全歷史日 K 庫，動態計算 12-1M 滾動動能得分與 4% 無風險利率避風港。
4. **法人風控在險指標 (1-Day 95% VaR) 與 3 階急速壓力測試**：純數學公式秒算單日最大潛在損失，提供 `[-10%]`、`[-20%]`、`[-30%]` 快速維持率精算與追繳缺口推估。
5. **彭博式三段時序雷達 (Timeline Radar)**：收斂催化劑日曆為「今日登場」、「7 日焦點」、「30 日遠端」，整合在線月營收截止倒數與除息扣點防假跌破。
6. **API 治理與相容防護**：直接消費既有 `SmartKeyRotator` 金鑰池，實作當日 24H 快取鎖與舊版 Schema 自動清洗，確保 100% 離線可用與零崩潰。

---

## User Stories

1. 作為台美雙市場投資者，我希望能在頂部一秒切換「🇹🇼 台股」、「🇺🇸 美股」與「🌐 全球」視角，以便在不同市場開盤時聚焦專屬指針。
2. 作為穩健型投資者，我希望看到一個清晰的 0~100「宏觀水溫計」，以便直觀掌握今日應維持的總股票曝險上限（如 40% 或 70%）。
3. 作為機構級投資者，我希望監控美高收益債利差 (OAS) 與 CDS 信用違約互換保險指數，以便在金融體系出現信用緊縮或違約風險前提前防禦。
4. 作為台股交易者，我希望看到外資台指期淨未平倉空單口數與全市場融資維持率，以便在空單暴增或散戶融資瀕臨 130% 斷頭時做出客觀決策。
5. 作為質押借款使用者，我希望能點擊「-10% 震盪」、「-20% 回檔」、「-30% 崩盤」按鈕，以便 1 秒看清大盤重挫時我的維持率跌至幾%、需補繳多少保證金。
6. 作為風控型投資者，我希望看到「單日 95% 在險價值 (1-Day 95% VaR)」，以便清楚掌握在 95% 信心水準下單日極端最壞損失金額。
7. 作為台美持股者，我希望看到美股部位的匯率敏感度 (FX Delta)，以便了解台幣每升值 1 元對我總資產的實質匯損影響。
8. 作為動能策略追求者，我希望跨資產雙重動能完全由真實歷史日 K 線計算，以便獲得 100% 真實可靠的 12-1M 排行與避風港狀態。
9. 作為長線配置者，我希望看到「股債比 (SPY/TLT)」、「台股風格 (0050/0056)」等跨市場比率指針，以便掌握大局資金板塊輪動。
10. 作為個股投資者，我希望在催化劑雷達中看到「每月 10 號在線持股營收公布截止倒數」，以便在營收開獎前夕做好波段防守。
11. 作為除息旺季投資者，我希望看到持股除息預估蒸發的加權指數點數，以便區分大盤是自然扣點還是實質跌破。
12. 作為 API 使用者，我希望系統實作當日快取鎖定，以便頻繁切換頁籤時發出 0 次 API 請求，保護免費配額不被浪費。
13. 作為高鐵/飛機等離線環境使用者，我希望在斷網或無 Key 時系統自動以本地快照平滑運作，並支援手動離線校準數據。
14. 作為既有系統升級使用者，我希望讀取舊版 LocalStorage 資料時自動完成相容清洗，以便升級後絕不發生白屏崩潰。
15. 作為社群與筆記使用者，我希望能一鍵複製「繁體中文晨會簡報」，以便隨時將戰情報告分享至 LINE、Telegram 或貼入 Notion。

---

## Implementation Decisions

### 1. 模組架構與職責邊界
- **`src/types/macro.ts`**：
  - 定義 `MarketViewTab`（`'GLOBAL' | 'TW' | 'US'`）。
  - 定義 `MacroThermometer`（`score: number`, `stance: 'DEFENSIVE' | 'NEUTRAL' | 'AGGRESSIVE'`, `suggestedEquityAllocationPercent: number`）。
  - 擴充 `MacroIndicatorSnapshot`（`creditSpreadOAS`, `cdsInsuranceIndex`, `cdsRiskLevel`, `twFuturesNetOi`, `twMarginMaintenance`, `ratioIndicators`）。
  - 擴充 `MacroPortfolioShield`（`valueAtRisk95TWD`, `fxDeltaTWD`, `portfolioBeta`, `quickStressTest`）。
- **`src/engine/macroAdvisorEngine.ts`**：
  - 實作 `calculateMacroThermometer()`：根據利差倒掛、VIX、信用利差、外資期貨空單純數學合成水溫分與建議總倉位。
  - 實作 `calculate1DayVaR95()`：$$1.65 \times \frac{\text{年化波動度}}{\sqrt{252}} \times \text{NAV}$$。
  - 實作 `calculateQuickStressMatrix()`：純算術推估 -10%、-20%、-30% 下之維持率與追繳缺口。
- **`src/engine/dualMomentumEngine.ts`**：
  - 全面解耦並支援由外部傳入真實時序資料，維持 12-1M 加權計分與 4% 無風險利率比較邏輯。
- **`src/utils/macroPulseStorage.ts`**：
  - 實作 `sanitizeMacroRecord()`：升級相容清洗，補齊新欄位預設值，杜絕 `undefined` 調用錯誤。
  - 實作 `isSameDayCacheValid()`：當日 24H 快取判定。
- **`src/components/WarRoomWorkspace.tsx`**：
  - 徹底移除 145 行寫死假數據 `MOCK_MOMENTUM_PRICES`。
  - 頂部設置台美雙軌切換按鈕與宏觀水溫計卡片。
  - 催化劑重構為「彭博式三段時序雷達 (今日/本週/本月)」。
  - 保留 100% 原生 Vanilla CSS 設計系統，杜絕 Tailwind 類別。

---

## Testing Decisions

- **測試原則**：專注驗證公開介面行爲、純數學計算準確度與邊界相容性，不依賴 UI 內部實作細節。
- **測試切片模組**：
  1. `src/engine/macroAdvisorEngine.test.ts`：
     - 測試水溫計在不同指標組合下的評分與倉位邊界。
     - 測試 1-Day 95% VaR 與 3 階壓力測試數值精確度。
     - 測試零借款與跨幣別下的維持率邊界保護。
  2. `src/engine/dualMomentumEngine.test.ts`：
     - 測試以真實歷史日 K 輸入時之排序邏輯，確認完全無 Mock 依賴。
     - 測試全資產弱於 4% 時之現金避風港觸發。
  3. `src/utils/macroPulseStorage.test.ts`：
     - 測試舊版 V1 儲存資料的自動升級清洗（Sanitize），驗證安全補齊。
     - 測試當日快取鎖之有效性驗證。

---

## Out of Scope

1. **實盤自動落單交易 (Auto-Trading)**：本戰情室僅提供客觀數據與 AI 戰略指引，不包含券商下單 API 對接。
2. **重量級全月份格子月曆**：維持彭博式三段時序雷達，不引入第三方月曆日曆套件。
3. **非官方非授權網頁逆向爬蟲**：僅支援官方合規之 FRED、FinMind 與 TWSE OpenAPI，不支援易失效之個人部落格或論壇爬蟲。

---

## Further Notes

- 本規格為落實專案 `zeroMockPolicy` 與「法人級投資終端」之核心里程碑。
- 所有 UI 元件嚴格遵守專案深色毛玻璃金融終端美學，100% 離線可用，金鑰本地隔離，杜絕任何資訊外洩。
