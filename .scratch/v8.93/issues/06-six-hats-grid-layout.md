# Ticket 06: 六頂思考帽 6 欄水平平行卡片網格 (Six Hats Grid)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/analysis/StrategicPromptPanel.tsx`
* **測試檔案**：`src/components/analysis/StrategicPromptPanel.test.tsx`

## 2. 需求描述 (Description)
1. 實作原生 CSS 網格：`display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;`。
2. 每張思考帽卡片具備專屬色標背景（白、紅、黑、黃、綠、藍）、Emoji、中文名稱、核心關注點。
3. 底部配置單頂思考帽獨立複製按鈕，點選具備 Active 邊框高亮反饋。
4. 徹底消除 6 頂思考帽在畫面上垂直擠成一列的跑版問題。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 6 頂思考帽水平網格自適應排開。
* [ ] 單獨抽離複製與 Active 選取切換正常。
