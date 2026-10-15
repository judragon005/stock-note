# Ticket 16: AiForceDashboardView 底層掛載集成與 Sticky 吸附列避讓樣式

## 1. 任務目標
將 `WarRoomPromptCard` 正式掛載至 `src/components/aiForceDashboard/AiForceDashboardView.tsx`。
精準定位在各任務視圖（任務一至任務五）下方，且在底部固定吸附之 `TaskViewsSwitcher` 之上。外層容器設置 `marginBottom: '16px'` 與安全 `paddingBottom`，徹底避免視覺重疊或遮擋。

## 2. 修改範圍
* `src/components/aiForceDashboard/AiForceDashboardView.tsx`:
  - 引入 `WarRoomPromptCard`。
  - 呼叫 `createWarRoomPromptDigest(report, _holdings)`。
  - 將卡片置於 571 行前（在 TaskViewsSwitcher 之前）：
    ```tsx
    {/* ⚡ 全域外聯 AI 戰情提示詞中樞 (Spec 0181 / Issue #243) */}
    <div style={{ marginTop: '16px', marginBottom: '16px' }}>
      <WarRoomPromptCard digest={warRoomDigest} />
    </div>
    ```

## 3. 實作重點
* 確保卡片在任務一（綜合戰情）、任務二（技術警示）、任務三（KD+MA）、任務四（MACD）、任務五（原始資料）切換時**始終在底部可見**。

## 4. 驗收標準 (AC)
- [ ] 卡片置於戰情室底層，邊距舒適，無元素互相重疊。
- [ ] 切換至其他任務視圖時，卡片依然穩定渲染。
