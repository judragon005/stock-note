# Issue 01: 戰情室 AI 晨報強制過濾在倉持股 (shares > 0)

## 狀態
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`warroom`, `bugfix`

## 需求
1. 在 `WarRoomWorkspace.tsx` 萃取 `holdingSignals` 時，過濾 `h.shares > 0`。
2. 確保已全數平倉之標的（`shares === 0`）絕不進入達瓦斯箱體與 AI 晨報點名清單。
