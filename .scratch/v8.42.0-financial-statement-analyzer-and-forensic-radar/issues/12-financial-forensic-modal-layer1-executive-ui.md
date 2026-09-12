# 12 — Layer 1 UI: Executive Summary & Health Traffic Lights

**What to build:**
實作三層漸進式決策視窗頂部第 1 層元件 `src/components/financial/FinancialHeroLayer.tsx`。
直觀呈現：
1. 0~100 分圓環評分徽章與狀態標籤 (`EXCELLENT` | `HEALTHY` | `WARNING` | `DANGEROUS`)
2. 四大維度指示燈（獲利能力、安全性、營運效率、現金流健康）
3. 產業屬性標籤（🏦 金融保險豁免模式 / ⚠️ 景氣循環高點提醒）
4. 0 秒白話核心操盤結論一句話橫幅

**Blocked by:** 10-financial-executive-summary-and-scoring-engine.md

**Status:** done

- [x] 實作 `FinancialHeroLayer.tsx` 元件，符合現代 Glassmorphism 視覺風格
- [x] 支援紅綠與國際色彩主題切換 (`taiwan` vs `international`)
- [x] 支援響應式手機端折疊排版
- [x] 單元測試驗證分數渲染、各狀態燈號色彩與文字展示正確性
