import React, { useMemo, useState } from 'react';
import { Calendar, Layers, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import type {
  CatalystCategory,
  CatalystImpact,
  MarketViewTab,
  TimelineHorizon,
  UpcomingCatalyst,
} from '../../types/macro';
import { groupCatalystsByTimeline } from '../../engine/macroAdvisorEngine';
import { ModalShell } from '../common/ModalShell';
import type { MarketType } from '../../types/stock';

export interface CatalystCalendarCardProps {
  catalysts: UpcomingCatalyst[];
  marketView: MarketViewTab;
  onAddCustom: (input: {
    name: string;
    date: string;
    category: CatalystCategory;
    impact: CatalystImpact;
    description: string;
  }) => void;
  onDeleteCustom: (id: string) => void;
  onResetDefaults: () => void;
  onInspectTechnical?: (symbol: string, market: MarketType) => void;
}

export const CatalystCalendarCard: React.FC<CatalystCalendarCardProps> = ({
  catalysts,
  marketView,
  onAddCustom,
  onDeleteCustom,
  onResetDefaults,
  onInspectTechnical,
}) => {
  const [timelineHorizon, setTimelineHorizon] = useState<TimelineHorizon | 'ALL'>('ALL');
  const [catalystFilter, setCatalystFilter] = useState<string>('ALL');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomDate, setNewCustomDate] = useState('');
  const [newCustomCategory, setNewCustomCategory] = useState<CatalystCategory>('CUSTOM');
  const [newCustomImpact, setNewCustomImpact] = useState<CatalystImpact>('MEDIUM');
  const [newCustomDesc, setNewCustomDesc] = useState('');

  const groupedCatalysts = useMemo(() => groupCatalystsByTimeline(catalysts), [catalysts]);

  const filteredCatalysts = useMemo(() => {
    let result = catalysts;
    if (marketView === 'TW') {
      result = result.filter((c) => c.targetMarket === 'TW' || c.targetMarket === 'ALL' || !c.targetMarket);
    } else if (marketView === 'US') {
      result = result.filter((c) => c.targetMarket === 'US' || c.targetMarket === 'ALL' || !c.targetMarket);
    }

    if (catalystFilter === 'INFLATION_EMPLOYMENT') {
      result = result.filter((c) => c.category === 'INFLATION' || c.category === 'EMPLOYMENT');
    } else if (catalystFilter === 'EARNINGS_DIVIDEND') {
      result = result.filter((c) => c.category === 'EARNINGS_DIVIDEND' || c.category === 'EARNINGS');
    } else if (catalystFilter === 'CUSTOM') {
      result = result.filter((c) => c.isCustom);
    } else if (catalystFilter !== 'ALL') {
      result = result.filter((c) => c.category === catalystFilter);
    }

    if (timelineHorizon === 'TODAY') {
      result = result.filter((c) => c.daysLeft === 0);
    } else if (timelineHorizon === 'WEEK') {
      result = result.filter((c) => c.daysLeft >= 1 && c.daysLeft <= 7);
    } else if (timelineHorizon === 'MONTH') {
      result = result.filter((c) => c.daysLeft >= 8 && c.daysLeft <= 30);
    }
    return result;
  }, [catalysts, catalystFilter, marketView, timelineHorizon]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomName.trim() || !newCustomDate) return;
    onAddCustom({
      name: newCustomName.trim(),
      date: newCustomDate,
      category: newCustomCategory,
      impact: newCustomImpact,
      description: newCustomDesc.trim() || '使用者自訂重要日程與事件提醒。',
    });
    setNewCustomName('');
    setNewCustomDate('');
    setNewCustomDesc('');
    setIsCustomModalOpen(false);
  };

  return (
    <div className="card">
      <div className="warroom-section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: 'var(--accent-purple)' }} />
            關鍵財經催化劑倒數日曆 (Catalyst Calendar)
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            FOMC 利率決議 · CPI/就業 · 在倉持股除息/法說會（點名個股可一鍵跳轉技術面）
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCustomModalOpen(true)}
            style={{ fontSize: '0.78rem', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Plus size={14} />
            新增自訂事件
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onResetDefaults}
            style={{ fontSize: '0.78rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="一鍵清除自訂並重置為官方預設日曆"
          >
            <RefreshCw size={13} />
            重置
          </button>
          <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            倒數雷達 ({filteredCatalysts.length})
          </span>
        </div>
      </div>

      {/* 三段時序雷達切換 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '14px 0 6px 0', padding: '10px 14px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(51, 65, 85, 0.4)' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <Layers size={13} />
          時序雷達：
        </span>
        {[
          { id: 'ALL', label: `全時序 (${catalysts.length})` },
          { id: 'TODAY', label: `🔥 今日登場 (${groupedCatalysts.today.length})` },
          { id: 'WEEK', label: `⚡ 7 日焦點 (${groupedCatalysts.within7Days.length})` },
          { id: 'MONTH', label: `📅 30 日遠端 (${groupedCatalysts.within30Days.length})` },
        ].map((tab) => {
          const active = timelineHorizon === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTimelineHorizon(tab.id as TimelineHorizon | 'ALL')}
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: active ? '1px solid var(--accent-purple)' : '1px solid transparent',
                background: active ? 'rgba(139, 92, 246, 0.25)' : 'rgba(15, 23, 42, 0.5)',
                color: active ? '#c084fc' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: active ? 700 : 500,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 分類膠囊篩選 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '14px 0 16px 0' }}>
        {[
          { id: 'ALL', label: `全部 (${catalysts.length})` },
          { id: 'CENTRAL_BANK', label: `🏛️ 央行利率 (${catalysts.filter((c) => c.category === 'CENTRAL_BANK').length})` },
          { id: 'INFLATION_EMPLOYMENT', label: `📊 通膨就業 (${catalysts.filter((c) => c.category === 'INFLATION' || c.category === 'EMPLOYMENT').length})` },
          { id: 'EARNINGS_DIVIDEND', label: `🎯 持股除息與法說 (${catalysts.filter((c) => c.category === 'EARNINGS_DIVIDEND' || c.category === 'EARNINGS').length})` },
          { id: 'DERIVATIVE_SETTLEMENT', label: `⚡ 期貨結算 (${catalysts.filter((c) => c.category === 'DERIVATIVE_SETTLEMENT').length})` },
          { id: 'CUSTOM', label: `✏️ 自訂備忘 (${catalysts.filter((c) => c.isCustom).length})` },
        ].map((tab) => {
          const active = catalystFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCatalystFilter(tab.id)}
              style={{
                fontSize: '0.76rem',
                padding: '5px 12px',
                borderRadius: '20px',
                border: active ? '1px solid var(--accent-primary, #3b82f6)' : '1px solid rgba(148, 163, 184, 0.2)',
                background: active ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                color: active ? 'var(--accent-primary, #3b82f6)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: active ? 700 : 500,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {filteredCatalysts.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '32px 16px',
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '12px',
            border: '1px dashed rgba(148, 163, 184, 0.25)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
            近期無特定分類之重大財經事件
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setCatalystFilter('ALL')} style={{ fontSize: '0.78rem' }}>
            查看全部事件
          </button>
        </div>
      ) : (
        <div className="warroom-grid-4">
          {filteredCatalysts.map((event) => {
            const isToday = event.daysLeft === 0;
            const isUrgent = event.daysLeft <= 3;
            const cleanSym = event.symbol ? event.symbol.replace('.TW', '') : undefined;
            const mkt: MarketType =
              event.targetMarket === 'US' || (event.symbol && !event.symbol.endsWith('.TW') && !/^\d/.test(event.symbol))
                ? 'US'
                : 'TW';

            return (
              <div
                key={event.id}
                className="warroom-stat-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderColor: isToday
                    ? 'rgba(239, 68, 68, 0.6)'
                    : isUrgent && event.impact === 'HIGH'
                      ? 'rgba(245, 158, 11, 0.5)'
                      : undefined,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                        {event.category === 'CENTRAL_BANK'
                          ? '🏛️ 央行'
                          : event.category === 'INFLATION'
                            ? '📊 通膨'
                            : event.category === 'EMPLOYMENT'
                              ? '💼 就業'
                              : event.category === 'EARNINGS_DIVIDEND' || event.category === 'EARNINGS'
                                ? '🎯 除息/法說'
                                : event.category === 'DERIVATIVE_SETTLEMENT'
                                  ? '⚡ 結算'
                                  : '✏️ 自訂'}
                      </span>
                      {event.impact && (
                        <span className="badge" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                          {event.impact === 'HIGH' ? '🔴 高衝擊' : event.impact === 'MEDIUM' ? '🟡 中度' : '🟢 溫和'}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: isToday ? 'var(--loss-color)' : 'var(--accent-primary)' }}>
                        {isToday ? '今天!' : `倒數 ${event.daysLeft} 天`}
                      </span>
                      {event.isCustom && (
                        <button
                          type="button"
                          onClick={() => onDeleteCustom(event.id)}
                          title="刪除此自訂事件"
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {event.name}
                  </div>
                  <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    日期：{event.date}
                  </div>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {event.description}
                  </p>
                  {cleanSym && onInspectTechnical && (event.category === 'EARNINGS_DIVIDEND' || event.category === 'EARNINGS') && (
                    <button
                      type="button"
                      onClick={() => onInspectTechnical(cleanSym, mkt)}
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: '8px', fontSize: '0.7rem', padding: '2px 8px', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8' }}
                    >
                      📈 技術面 ({cleanSym})
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModalShell
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        maxWidth="440px"
        padding="24px"
        ariaLabel="新增自訂關鍵財經事件"
        contentStyle={{
          background: 'var(--bg-secondary, #1e293b)',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          borderRadius: '14px',
        }}
      >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
                新增自訂關鍵財經事件
              </h3>
              <button type="button" onClick={() => setIsCustomModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>事件名稱 *</label>
                <input
                  type="text"
                  required
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.25)', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>發生日期 *</label>
                  <input
                    type="date"
                    required
                    value={newCustomDate}
                    onChange={(e) => setNewCustomDate(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.25)', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>衝擊等級</label>
                  <select
                    value={newCustomImpact}
                    onChange={(e) => setNewCustomImpact(e.target.value as CatalystImpact)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.25)', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary)' }}
                  >
                    <option value="HIGH">🔴 高衝擊</option>
                    <option value="MEDIUM">🟡 中度</option>
                    <option value="LOW">🟢 溫和</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>事件類別</label>
                <select
                  value={newCustomCategory}
                  onChange={(e) => setNewCustomCategory(e.target.value as CatalystCategory)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.25)', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary)' }}
                >
                  <option value="CUSTOM">✏️ 自訂備忘事件</option>
                  <option value="CENTRAL_BANK">🏛️ 央行與利率決議</option>
                  <option value="INFLATION">📊 通膨與物價指數</option>
                  <option value="EMPLOYMENT">💼 勞動與就業報告</option>
                  <option value="EARNINGS_DIVIDEND">🎯 持股除息與法說會</option>
                  <option value="DERIVATIVE_SETTLEMENT">⚡ 期貨與衍生品結算</option>
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>說明備忘</label>
                <textarea
                  rows={2}
                  value={newCustomDesc}
                  onChange={(e) => setNewCustomDesc(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.25)', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCustomModalOpen(false)}>取消</button>
                <button type="submit" className="btn btn-primary">確認儲存</button>
              </div>
            </form>
      </ModalShell>
    </div>
  );
};
