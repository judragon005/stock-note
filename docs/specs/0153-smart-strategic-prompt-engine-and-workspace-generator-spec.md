# 0153 Spec: 智策精煉投資決策多維提示詞引擎與工作區數據注入生成器規格書 (Issue #135)

## 1. 概述與狀態 (Overview & Status)

**狀態：規劃中 / 待實作 (PLANNED / DRAFT - Reserved for Issue #135)**  
**關聯 Issue：** [Issue #135](https://github.com/judragon005/stock-note/issues/135)

本規格書對齊遠端 Issue #135，保留為「智策精煉投資決策多維提示詞引擎與工作區數據注入生成器」之專用功能編號。在專案歷史演進中，開發團隊先行動工了 Spec 0154 (Issue #136, PR #137)，使本功能編號保留待續。本文件正式補齊規格占位，確保專案序號連續性。

---

## 2. 核心功能規劃 (Feature Scope)

依據 Issue #135 需求定義：
1. **建立專屬提示詞知識庫規格文檔**：
   - 制定《智策精煉投資決策多維提示詞模板 (V1.0)》，涵蓋基本面、籌碼面、技術面、總經風險與部位風控維度。
2. **開發智策提示詞數據組裝引擎 (`strategicPromptEngine`)**：
   - 將專案既有 12 大量化與鑑識引擎作為單一真實數據源 (SSOT)，動態注入個股之 VWAP、RSI、籌碼集中度、董監質押率與本益成長比。
3. **前端個股分析工作區 (`StockAnalysisWorkspace`) 整合**：
   - 整合一鍵生成與複製面板，支援 7 大維度與全量 Master Prompt 一鍵導出至剪貼簿，提供外部大型語言模型進行深度覆盤。

---

## 3. 架構決策關聯 (Architecture Link)
- 關聯架構決策：[ADR 0153: 智策精煉投資決策多維提示詞引擎架構規劃](file:///d:/APP/股票紀錄/docs/adr/0153-smart-strategic-prompt-engine.md)
