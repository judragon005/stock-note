# Ticket 09: 提示詞模板注入客觀反討好紅隊指令與下檔風險審判

## 1. 任務目標
在提示詞合約中植入「紅隊對抗條款 (Adversarial Red-Team Directive)」，打破大語言模型的「討好偏見 (Sycophancy Trap)」。強制外部 AI 扮演冷酷無情的避險基金風控官（Chief Risk Officer），無論多頭指標多強，必須挑出至少 2~3 個下檔暴雷風險點與硬性失效條件。

## 2. 修改範圍
* `src/engine/strategicPromptEngine.ts`:
  - 注入 `<adversarial_red_team_instruction>`：
    ```markdown
    【強制反思反討好規則】：
    嚴禁為了迎合使用者持倉心態而給出模糊的樂觀判斷！
    你必須扮演嚴苛的避險基金風控官，強制挑出該標的目前最致命的 2~3 個潛在下檔暴雷破綻或主力誘多出貨跡象。
    若發現指標有空頭背離或破線風險，請直接提出清倉警訊與防守失效價。
    ```

## 3. 驗收標準 (AC)
- [ ] 提示詞輸出文本明確包含反討好與紅隊風控審判指令。
