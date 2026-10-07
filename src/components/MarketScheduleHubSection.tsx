import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  CheckCircle2,
  Copy,
  Check,
  Trash2,
  Terminal,
  RefreshCw,
  FolderGit2,
  Zap,
  Play,
  Database,
} from 'lucide-react';
import { MarketCacheSummary, loadMarketCacheSummary } from '../engine/marketCacheLoader';

export interface BackfillStatus {
  isRunning: boolean;
  market: 'ALL' | 'TW' | 'US';
  progressPct: number;
  currentTask: string;
  currentDate: string | null;
  completedDays: number;
  totalDays: number;
  tw: { status: string; totalQuotes: number; totalChips: number };
  us: { status: string; totalQuotes: number; successCount: number; failCount: number };
  error: string | null;
  startedAt: number | null;
  updatedAt: number;
}

// 系統命令與腳本路徑常數 (Spec 0133)
export const WINDOWS_SCHEDULE_COMMANDS = {
  SETUP_BAT_PATH: 'scripts\\market-sync\\setup-windows-task.bat',
  UNINSTALL: 'schtasks /delete /tn "StockTracker_TW_Sync" /f & schtasks /delete /tn "StockTracker_US_Sync" /f',
  UNINSTALL_TW: 'schtasks /delete /tn "StockTracker_TW_Sync" /f',
  UNINSTALL_US: 'schtasks /delete /tn "StockTracker_US_Sync" /f',
  TEST_TW_CMD: 'node scripts/market-sync/sync-tw-market.cjs',
  TEST_US_CMD: 'node scripts/market-sync/sync-us-market.cjs',
};

// 格式化水線摘要文字
export function formatScheduleSummaryText(
  summary: MarketCacheSummary | null,
  market: 'TW' | 'US'
): string {
  const scheduleTime = market === 'TW' ? '16:00' : '08:00';
  if (!summary) {
    return `⚪ 未偵測到排程執行數據 (每日 ${scheduleTime} 排程執行後將自動產出)`;
  }
  const durationSec = (summary.durationMs / 1000).toFixed(1);
  return `✔ 已同步最新數據 (${summary.date}，涵蓋 ${summary.totalSymbols.toLocaleString()} 檔標的，耗時 ${durationSec} 秒)`;
}

export const MarketScheduleHubSection: React.FC = () => {
  const [twSummary, setTwSummary] = useState<MarketCacheSummary | null>(null);
  const [usSummary, setUsSummary] = useState<MarketCacheSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Spec 0168 / Ticket 09: 台美雙軌全歷史回補狀態 ---
  const [backfillMarket, setBackfillMarket] = useState<'ALL' | 'TW' | 'US'>('ALL');
  const [backfillDays, setBackfillDays] = useState<number>(250);
  const [backfillStatus, setBackfillStatus] = useState<BackfillStatus | null>(null);
  const [isStartingBackfill, setIsStartingBackfill] = useState<boolean>(false);
  const [backfillFeedback, setBackfillFeedback] = useState<string | null>(null);

  const fetchSummaries = async () => {
    setIsLoading(true);
    try {
      const [tw, us] = await Promise.all([
        loadMarketCacheSummary('TW'),
        loadMarketCacheSummary('US'),
      ]);
      setTwSummary(tw);
      setUsSummary(us);
    } catch {
      // 容錯降級
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBackfillStatus = async () => {
    try {
      if (typeof fetch === 'function') {
        const res = await fetch('/api/market/backfill-status');
        if (res.ok) {
          const data = await res.json();
          setBackfillStatus(data);
        }
      }
    } catch {
      // 容錯降級
    }
  };

  const handleStartBackfill = async () => {
    setIsStartingBackfill(true);
    setBackfillFeedback(null);
    try {
      if (typeof fetch === 'function') {
        const res = await fetch(`/api/market/backfill-all?market=${backfillMarket}&days=${backfillDays}`, {
          method: 'POST',
        });
        if (res.ok) {
          const data = await res.json();
          setBackfillFeedback(data.message || '回補任務已在背景啟動！');
          await fetchBackfillStatus();
        } else {
          setBackfillFeedback('啟動失敗，請稍後再試。');
        }
      }
    } catch (err: any) {
      setBackfillFeedback(`連線錯誤: ${err.message}`);
    } finally {
      setIsStartingBackfill(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
    fetchBackfillStatus();

    const interval = setInterval(() => {
      fetchBackfillStatus();
    }, 3000);

    return () => {
      clearInterval(interval);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current as any);
      }
    };
  }, []);

  const handleCopy = async (key: string, text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current as any);
      }
      setCopiedKey(key);
      copyTimerRef.current = setTimeout(() => {
        setCopiedKey(null);
        copyTimerRef.current = null;
      }, 2000);
    } catch {
      alert(`請手動複製指令：\n${text}`);
    }
  };

  return (
    <div
      style={{
        marginTop: '24px',
        background: 'var(--card-bg, #1e293b)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* 標題與簡介 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                全市場每日盤後自動化與 Windows 排程管理
              </h3>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  fontWeight: 600,
                }}
              >
                靜默背景執行 · 本地離線快取
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              提供排程執行水線監控、一鍵複製安裝與卸載命令，無須常駐微服務，由 Windows 系統級 Task Scheduler 全自動執行。
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchSummaries}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontSize: '0.78rem',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? '重新整理中...' : '重新整理快取狀態'}
        </button>
      </div>

      {/* 排程水線監控卡片 (雙欄) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        {/* 台股排程卡片 */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#34d399', fontSize: '0.88rem' }}>
              <CheckCircle2 size={16} /> 🇹🇼 台股盤後排程 (TWSE / TPEx)
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>每日 16:00 執行</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: twSummary ? '#f8fafc' : 'var(--text-muted)', lineHeight: 1.5 }}>
            {formatScheduleSummaryText(twSummary, 'TW')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(51, 65, 85, 0.5)', paddingTop: '8px', marginTop: '4px' }}>
            <span>任務名稱: <code style={{ color: '#38bdf8' }}>StockTracker_TW_Sync</code></span>
            <button
              type="button"
              aria-label="複製台股手動測試命令"
              onClick={() => handleCopy('test_tw', WINDOWS_SCHEDULE_COMMANDS.TEST_TW_CMD)}
              style={{
                background: 'transparent',
                border: 'none',
                color: copiedKey === 'test_tw' ? '#34d399' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.7rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="複製手動測試命令"
            >
              {copiedKey === 'test_tw' ? <Check size={11} /> : <Copy size={11} />}
              <span>{copiedKey === 'test_tw' ? '已複製測試指令' : '手動測試指令'}</span>
            </button>
          </div>
        </div>

        {/* 美股排程卡片 */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#38bdf8', fontSize: '0.88rem' }}>
              <CheckCircle2 size={16} /> 🇺🇸 美股盤後排程 (NYSE / NASDAQ)
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>每日 08:00 執行</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: usSummary ? '#f8fafc' : 'var(--text-muted)', lineHeight: 1.5 }}>
            {formatScheduleSummaryText(usSummary, 'US')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(51, 65, 85, 0.5)', paddingTop: '8px', marginTop: '4px' }}>
            <span>任務名稱: <code style={{ color: '#38bdf8' }}>StockTracker_US_Sync</code></span>
            <button
              type="button"
              aria-label="複製美股手動測試命令"
              onClick={() => handleCopy('test_us', WINDOWS_SCHEDULE_COMMANDS.TEST_US_CMD)}
              style={{
                background: 'transparent',
                border: 'none',
                color: copiedKey === 'test_us' ? '#34d399' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.7rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="複製手動測試命令"
            >
              {copiedKey === 'test_us' ? <Check size={11} /> : <Copy size={11} />}
              <span>{copiedKey === 'test_us' ? '已複製測試指令' : '手動測試指令'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- Spec 0168 / Ticket 09: 台美雙軌零 CSV 背景全歷史回補控制台 --- */}
      <div
        className="glass-card"
        style={{
          marginTop: '20px',
          padding: '20px',
          borderRadius: '14px',
          border: '1px solid rgba(139, 92, 246, 0.35)',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                padding: '7px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.25))',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                color: '#c084fc',
              }}
            >
              <Zap size={18} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>台美雙軌零 CSV 背景全歷史回補</span>
                <span style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 500 }}>(Zero-CSV Full History Backfill)</span>
              </h4>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                直接連線 TWSE/TPEx 官方 4 大每日全市場日報與美股分級隊列。用時間換空間，電腦不關機即可無痛補齊歷史至 SQLite 湖倉，支援 SQLite 斷點續傳。
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                padding: '3px 10px',
                borderRadius: '6px',
                background: backfillStatus?.isRunning
                  ? 'rgba(245, 158, 11, 0.15)'
                  : backfillStatus?.progressPct === 100
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(148, 163, 184, 0.12)',
                border: backfillStatus?.isRunning
                  ? '1px solid rgba(245, 158, 11, 0.4)'
                  : backfillStatus?.progressPct === 100
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : '1px solid rgba(148, 163, 184, 0.25)',
                color: backfillStatus?.isRunning ? '#fbbf24' : backfillStatus?.progressPct === 100 ? '#34d399' : '#94a3b8',
                fontWeight: 600,
              }}
            >
              <Database size={12} />
              {backfillStatus?.isRunning
                ? `⚡ 背景回補運行中 (${backfillStatus.currentTask === 'TW' ? '🇹🇼 台股' : '🇺🇸 美股'})`
                : backfillStatus?.progressPct === 100
                ? '✔ 全歷史回補已完成'
                : '⚪ 待命就緒'}
            </span>
          </div>
        </div>

        {/* 控制設定列 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>目標市場：</span>
              <select
                value={backfillMarket}
                onChange={(e) => setBackfillMarket(e.target.value as any)}
                disabled={backfillStatus?.isRunning}
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.76rem',
                }}
              >
                <option value="ALL">🇹🇼 + 🇺🇸 台美雙軌全市場</option>
                <option value="TW">🇹🇼 僅台股官方全市場</option>
                <option value="US">🇺🇸 僅美股分級隊列</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>回補交易日數：</span>
              <select
                value={backfillDays}
                onChange={(e) => setBackfillDays(Number(e.target.value))}
                disabled={backfillStatus?.isRunning}
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.76rem',
                }}
              >
                <option value="60">60 交易日 (約一季短天期)</option>
                <option value="120">120 交易日 (約半年中天期)</option>
                <option value="250">250 交易日 (約一年完整年線)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {backfillFeedback && (
              <span style={{ fontSize: '0.74rem', color: '#38bdf8' }}>{backfillFeedback}</span>
            )}
            <button
              type="button"
              onClick={handleStartBackfill}
              disabled={backfillStatus?.isRunning || isStartingBackfill}
              className="btn btn-primary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 600,
                opacity: backfillStatus?.isRunning ? 0.7 : 1,
              }}
            >
              {backfillStatus?.isRunning ? (
                <>
                  <RefreshCw size={13} className="spin" />
                  <span>背景回補運行中 (可隨時關閉網頁)...</span>
                </>
              ) : (
                <>
                  <Play size={13} />
                  <span>啟動背景全回補</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 即時進度條與指標數據 (若有任務在執行或已執行過) */}
        {(backfillStatus?.isRunning || (backfillStatus && backfillStatus.completedDays > 0)) && (
          <div
            style={{
              marginTop: '14px',
              padding: '14px',
              borderRadius: '10px',
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.76rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {backfillStatus.isRunning
                  ? `正在回補 ${backfillStatus.currentTask === 'TW' ? '🇹🇼 台股' : '🇺🇸 美股'} (日期: ${backfillStatus.currentDate || '計算中...'})`
                  : '歷史回補進度：'}
              </span>
              <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                {backfillStatus.progressPct}% ({backfillStatus.completedDays} / {backfillStatus.totalDays} 天)
              </span>
            </div>

            {/* 進度條 */}
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, backfillStatus.progressPct))}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #8b5cf6 0%, #3b82f6 50%, #10b981 100%)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>

            {/* 數據小徽章 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>🇹🇼 台股收盤日 K 筆數</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
                  {backfillStatus.tw.totalQuotes.toLocaleString()} 筆
                </div>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>🏛️ 三大法人籌碼記錄</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#c084fc', marginTop: '2px' }}>
                  {backfillStatus.tw.totalChips.toLocaleString()} 筆
                </div>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>🇺🇸 美股採集標的</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
                  {backfillStatus.us.successCount.toLocaleString()} 檔
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 排程管理核心專案與卸載專區 (使用者痛點直接解答) */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* 卸載專區 (紅/橘色警示外框) */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '10px',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={16} color="#f87171" />
              <span style={{ fontWeight: 700, color: '#f87171', fontSize: '0.85rem' }}>
                一鍵卸載與停用 Windows 定時排程
              </span>
            </div>
            <button
              type="button"
              aria-label="一鍵複製完整卸載排程指令"
              onClick={() => handleCopy('uninstall_all', WINDOWS_SCHEDULE_COMMANDS.UNINSTALL)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '6px',
                background: copiedKey === 'uninstall_all' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                border: copiedKey === 'uninstall_all' ? '1px solid #10b981' : '1px solid rgba(239, 68, 68, 0.4)',
                color: copiedKey === 'uninstall_all' ? '#34d399' : '#fca5a5',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {copiedKey === 'uninstall_all' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedKey === 'uninstall_all' ? '已複製卸載指令！' : '一鍵複製完整卸載指令 (CMD / PowerShell)'}</span>
            </button>
          </div>

          <p style={{ margin: '0 0 10px', fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            由於純前端網頁受限於瀏覽器安全沙盒 (Sandbox Security)，無法直接越權調用作業系統核心指令。若您想完全停用或刪除排程，您可任選以下兩種極簡方式：
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <div>
              <strong style={{ color: '#f8fafc' }}>方式一（終端機一鍵執行）：</strong>
              複製上方指令，在 CMD 或 PowerShell 貼上並按下 Enter 即可同時乾淨刪除台美雙市場排程。
            </div>
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '6px 10px', borderRadius: '6px', fontFamily: 'monospace', color: '#cbd5e1', overflowX: 'auto' }}>
              {WINDOWS_SCHEDULE_COMMANDS.UNINSTALL}
            </div>
            <div style={{ marginTop: '2px' }}>
              <strong style={{ color: '#f8fafc' }}>方式二（批次檔選單）：</strong>
              直接雙擊專案目錄下的 <code style={{ color: '#38bdf8' }}>{WINDOWS_SCHEDULE_COMMANDS.SETUP_BAT_PATH}</code>，輸入選項 <code style={{ color: '#fbbf24' }}>[2]</code> 即可一鍵移除。
            </div>
          </div>
        </div>

        {/* 安裝與重置排程 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <Terminal size={16} color="#38bdf8" />
              <span>初次安裝或重新啟用排程</span>
            </div>
            <button
              type="button"
              aria-label="複製安裝批次檔相對路徑"
              onClick={() => handleCopy('bat_path', WINDOWS_SCHEDULE_COMMANDS.SETUP_BAT_PATH)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: copiedKey === 'bat_path' ? '#34d399' : 'var(--text-secondary)',
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              {copiedKey === 'bat_path' ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedKey === 'bat_path' ? '已複製批次檔路徑' : '複製批次檔相對路徑'}</span>
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            若您重灌電腦、更換磁碟或尚未啟用排程，請開啟檔案總管執行專案目錄下的 <code style={{ color: '#38bdf8' }}>{WINDOWS_SCHEDULE_COMMANDS.SETUP_BAT_PATH}</code>，並選擇 <code style={{ color: '#34d399' }}>[1] 安裝 / 更新排程任務</code>。批次檔會全自動定位 Node.js 執行路徑與無黑框背景靜默包裝。
          </p>
        </div>

        {/* 專案路徑更名或搬遷注意指引 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px dashed rgba(245, 158, 11, 0.3)',
            fontSize: '0.74rem',
            color: '#fbbf24',
            lineHeight: 1.5,
          }}
        >
          <FolderGit2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>專案目錄更名或磁碟機搬遷注意事項：</strong>
            Windows 工作排程器於建立時會綁定當下的絕對路徑。若您搬遷了本專案資料夾，請先執行上方<strong>「一鍵卸載」</strong>清理舊路徑殘留，並於新目錄重新執行 <code style={{ color: '#fff' }}>setup-windows-task.bat</code> 即刻完成路徑重綁定。
          </div>
        </div>
      </div>
    </div>
  );
};
