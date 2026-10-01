# 21 — 沉浸式 7 步投研全螢幕彈窗主元件

**What to build:** 
建立 `src/components/equityDeepDive/EquityDeepDiveModal.tsx`：
1. 全螢幕遮罩與深色玻璃擬態主容器，點擊外側或關閉按鈕安全返回。
2. 頂部工具列：標的資訊、全量複製按鈕、Canvas 快照下載按鈕。
3. 主體內容：排版渲染 7 個 `EquityDeepDiveStepCard`。
4. 底部／第 7 步內嵌投資筆記即時回填編輯器（買進理由、目標價、停損價、週期、指標），支援一鍵儲存與持倉同步核取方塊。

**Blocked by:** 17 — 觀察名單自動歸檔與持倉目標價/停損價雙向回填, 19 — Canvas 決策卡向量排版、Badge 繪製與 PNG 匯出管線, 20 — 7 步投研折疊卡片與單步複製 UI 元件

**Status:** ready-for-agent

- [ ] 支援沉浸式彈出與平滑關閉
- [ ] 支援一鍵複製全部 7 步提示詞
- [ ] 支援儲存筆記並觸發同步
- [ ] 支援直接下載 Canvas 決策快照
- [ ] 單元測試 100% 覆蓋
