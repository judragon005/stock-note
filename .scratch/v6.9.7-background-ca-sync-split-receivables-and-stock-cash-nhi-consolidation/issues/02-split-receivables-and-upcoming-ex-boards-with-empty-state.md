# Ticket 02: 雙看板獨立垂直拆分與空狀態占位排版 (Dual Kanban Board Separation)

## 任務描述
將原「除權息待入帳行事曆與即將除息公告」綜合看板，垂直拆分為兩個獨立的高質感 Glass Card 區塊：
1. ⚡ **除息待入帳行事曆 (Receivable Dividends Pending Payment)**：已過除息基準日但未過發放日之應收股利款項。
2. 📢 **即將除息公告看板 (Upcoming Corporate Actions & Ex-Dividends)**：尚未除息之未來除息日程。

並在無項目時各自呈現專用空狀態占位卡片，確保版面不坍塌。

## 涉及檔案
- `src/components/DividendLogView.tsx`

## 驗收標準 (Acceptance Criteria)
1. 上下拆分為兩個獨立 Glass Card 區塊，標題與統計徽章各自獨立。
2. 待入帳看板過濾 `status === 'PENDING_PAYMENT'`；即將除息看板過濾 `status === 'UPCOMING_EX'`。
3. 當無待入帳項目時，待入帳看板呈現「目前暫無除息待入帳款項，除息基準日過後之應收股利將自動列於此處」之占位卡片。
4. 當無即將除息項目時，即將除息看板呈現「目前在倉標的暫無最新除息公告日程」之占位卡片。
5. 兩看板維持固定雙欄舒展排版，參數與金額 100% 絕不折行。
