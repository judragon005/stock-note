import React, { useState, useEffect } from 'react';

/**
 * 將時間物件精確格式化為台北時區 (UTC+8) 的 24 小時制 HH:mm:ss 字串
 */
export function formatTaipeiClock(date: Date): string {
  return date.toLocaleTimeString('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 自封閉即時走動台北交易時鐘元件
 *
 * 設計亮點 (PRD #0138)：
 * 1. 自封閉狀態管理 (Self-Contained State)：每 1000ms 僅更新自身節點，完全不觸發父層 Header 或整個應用程式重新渲染。
 * 2. 台北時區強制鎖定 (Asia/Taipei)：無論使用者本地作業系統處於何種時區，均精確顯示台北證券交易所標準作戰時間。
 * 3. 資源友善：卸載時自動清除 interval 定時器，杜絕記憶體洩漏。
 */
export const RealtimeMarketClock: React.FC = () => {
  const [clockStr, setClockStr] = useState<string>(() => formatTaipeiClock(new Date()));

  useEffect(() => {
    // 立即更新一次對齊當前秒
    setClockStr(formatTaipeiClock(new Date()));

    const timer = setInterval(() => {
      setClockStr(formatTaipeiClock(new Date()));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <span
      data-testid="realtime-market-clock"
      className="mono"
      style={{
        fontWeight: 600,
        letterSpacing: '0.5px',
        color: 'var(--text-primary)',
      }}
      title="台北標準時間 (每秒動態走動)"
    >
      {clockStr}
    </span>
  );
};
