import React, { useState, useEffect, useMemo } from 'react';
import {
  TargetAllocationConfig,
  RebalancePlanResult,
  RebalanceMode,
  TargetAllocationItem,
} from '../types/allocation';
import { HoldingPosition, ColorThemeMode } from '../types/stock';
import {
  generateCashInRebalancePlan,
  generateFullRebalancePlan,
} from '../engine/rebalancingEngine';
import {
  loadTargetAllocations,
  saveTargetAllocations,
  loadActiveTargetAllocationId,
  saveActiveTargetAllocationId,
  validateAllocationSum,
  DEFAULT_MARKET_ALLOCATION,
  DEFAULT_SYMBOL_ALLOCATION,
} from '../utils/allocationStorage';
import {
  Scale,
  Settings2,
  CheckCircle2,
  Plus,
  Trash2,
  DollarSign,
  ArrowRightLeft,
  Sparkles,
} from 'lucide-react';

interface RebalancingViewProps {
  holdings: HoldingPosition[];
  usdToTwdRate: number;
  cashBalanceTwd?: number;
  colorTheme?: ColorThemeMode;
}

export const RebalancingView: React.FC<RebalancingViewProps> = ({
  holdings,
  usdToTwdRate,
  cashBalanceTwd = 0,
  colorTheme = 'taiwan',
}) => {
  // 1. 策略配置狀態
  const [configs, setConfigs] = useState<TargetAllocationConfig[]>(() => loadTargetAllocations());
  const [activeConfigId, setActiveConfigId] = useState<string>(() => loadActiveTargetAllocationId());
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // 編輯暫存
  const [editingConfig, setEditingConfig] = useState<TargetAllocationConfig | null>(null);

  // 2. 再平衡模式與注水金額
  const [mode, setMode] = useState<RebalanceMode>('CASH_IN');
  const [cashInflow, setCashInflow] = useState<number>(() => Math.max(0, cashBalanceTwd));

  // 監聽並保存
  useEffect(() => {
    saveTargetAllocations(configs);
  }, [configs]);

  useEffect(() => {
    saveActiveTargetAllocationId(activeConfigId);
  }, [activeConfigId]);

  // 當前啟用的策略配置
  const activeConfig = useMemo(() => {
    return (
      configs.find((c) => c.id === activeConfigId) ||
      configs[0] ||
      DEFAULT_MARKET_ALLOCATION
    );
  }, [configs, activeConfigId]);

  // 即時偏離度與再平衡結果計算
  const rebalancePlan: RebalancePlanResult = useMemo(() => {
    if (mode === 'CASH_IN') {
      return generateCashInRebalancePlan(
        activeConfig,
        holdings,
        Number(cashInflow) || 0,
        cashBalanceTwd,
        usdToTwdRate
      );
    }
    return generateFullRebalancePlan(activeConfig, holdings, cashBalanceTwd, usdToTwdRate);
  }, [activeConfig, holdings, mode, cashInflow, cashBalanceTwd, usdToTwdRate]);

  // 進入編輯模式
  const handleStartEdit = () => {
    setEditingConfig(JSON.parse(JSON.stringify(activeConfig)));
    setIsEditing(true);
  };

  // 取消編輯
  const handleCancelEdit = () => {
    setEditingConfig(null);
    setIsEditing(false);
  };

  // 儲存編輯
  const handleSaveEdit = () => {
    if (!editingConfig) return;
    const validation = validateAllocationSum(editingConfig.items);
    if (!validation.isValid) {
      alert(`目標比例總和必須為 100%（目前合計為 ${validation.totalPercent}%）`);
      return;
    }

    const updated = { ...editingConfig, updatedAt: Date.now() };
    setConfigs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setIsEditing(false);
    setEditingConfig(null);
  };

  // 建立新策略
  const handleCreateNewStrategy = (type: 'MARKET' | 'SYMBOL') => {
    const newStrategy: TargetAllocationConfig = {
      id: `custom-${Date.now()}`,
      type,
      name: type === 'MARKET' ? '自訂市場配置' : '自訂個股投資組合',
      items:
        type === 'MARKET'
          ? [
              { key: 'TW', name: '台股部位 (TW)', targetPercent: 50 },
              { key: 'US', name: '美股部位 (US)', targetPercent: 30 },
              { key: 'CASH', name: '現金儲備 (CASH)', targetPercent: 20 },
            ]
          : [
              { key: '0050', name: '元大台灣50', targetPercent: 50 },
              { key: '2330', name: '台積電', targetPercent: 50 },
            ],
      toleranceBandPercent: 5.0,
      updatedAt: Date.now(),
    };

    setConfigs((prev) => [...prev, newStrategy]);
    setActiveConfigId(newStrategy.id);
    setEditingConfig(JSON.parse(JSON.stringify(newStrategy)));
    setIsEditing(true);
  };

  // 刪除自訂策略
  const handleDeleteStrategy = (id: string) => {
    if (id === DEFAULT_MARKET_ALLOCATION.id || id === DEFAULT_SYMBOL_ALLOCATION.id) {
      alert('系統預設策略無法刪除');
      return;
    }
    if (confirm('確定要刪除此配置策略嗎？')) {
      const nextConfigs = configs.filter((c) => c.id !== id);
      setConfigs(nextConfigs);
      setActiveConfigId(nextConfigs[0]?.id || DEFAULT_MARKET_ALLOCATION.id);
      setIsEditing(false);
    }
  };

  // 編輯器項目修改
  const handleItemChange = (index: number, field: keyof TargetAllocationItem, value: any) => {
    if (!editingConfig) return;
    const nextItems = [...editingConfig.items];
    nextItems[index] = { ...nextItems[index], [field]: value };
    setEditingConfig({ ...editingConfig, items: nextItems });
  };

  // 編輯器新增項目
  const handleAddItem = () => {
    if (!editingConfig) return;
    const nextItems = [
      ...editingConfig.items,
      {
        key: editingConfig.type === 'MARKET' ? 'TW' : 'NEW_SYMBOL',
        name: '',
        targetPercent: 0,
      },
    ];
    setEditingConfig({ ...editingConfig, items: nextItems });
  };

  // 編輯器刪除項目
  const handleDeleteItem = (index: number) => {
    if (!editingConfig || editingConfig.items.length <= 1) {
      alert('配置策略至少需保留一個項目');
      return;
    }
    const nextItems = editingConfig.items.filter((_, idx) => idx !== index);
    setEditingConfig({ ...editingConfig, items: nextItems });
  };

  const validation = editingConfig ? validateAllocationSum(editingConfig.items) : { isValid: true, totalPercent: 100, difference: 0 };

  // 色彩配置
  const isTaiwanTheme = colorTheme === 'taiwan';
  const buyColor = isTaiwanTheme ? '#ef4444' : '#10b981'; // 買進/超配顏色
  const sellColor = isTaiwanTheme ? '#10b981' : '#ef4444'; // 賣出顏色

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. 頂部策略切換與設定列 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.4)',
          padding: '14px 18px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Scale size={18} color="#8b5cf6" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e2e8f0' }}>配置策略：</span>
          </div>

          <select
            value={activeConfigId}
            onChange={(e) => {
              setActiveConfigId(e.target.value);
              setIsEditing(false);
            }}
            disabled={isEditing}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid var(--border-color)',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {configs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type === 'MARKET' ? '市場維度' : '個股維度'})
              </option>
            ))}
          </select>

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            容忍區間: ±{activeConfig.toleranceBandPercent}%
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isEditing ? (
            <>
              <button
                onClick={handleStartEdit}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(30, 41, 59, 0.6)',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                }}
              >
                <Settings2 size={14} />
                編輯策略
              </button>
              <button
                onClick={() => handleCreateNewStrategy('SYMBOL')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--primary-color)',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                新增策略
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancelEdit}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!validation.isValid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  background: validation.isValid ? '#10b981' : '#64748b',
                  color: '#fff',
                  cursor: validation.isValid ? 'pointer' : 'not-allowed',
                }}
              >
                <CheckCircle2 size={14} />
                儲存策略
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. 策略編輯面板 (展開時顯示) */}
      {isEditing && editingConfig && (
        <div
          className="glass-card"
          style={{
            padding: '18px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid #8b5cf6',
            borderRadius: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#a78bfa' }}>
              ⚙️ 編輯配置策略：{editingConfig.name}
            </h3>
            {editingConfig.id !== DEFAULT_MARKET_ALLOCATION.id &&
              editingConfig.id !== DEFAULT_SYMBOL_ALLOCATION.id && (
                <button
                  onClick={() => handleDeleteStrategy(editingConfig.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={12} />
                  刪除此策略
                </button>
              )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                策略名稱
              </label>
              <input
                type="text"
                value={editingConfig.name}
                onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.85rem',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                偏離容忍門檻 (±%)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="20"
                value={editingConfig.toleranceBandPercent}
                onChange={(e) =>
                  setEditingConfig({
                    ...editingConfig,
                    toleranceBandPercent: Math.max(1, Number(e.target.value) || 5),
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          {/* 項目清單 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 40px', gap: '10px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              <span>代碼 / 識別鍵</span>
              <span>標的名稱</span>
              <span>目標佔比 (%)</span>
              <span>操作</span>
            </div>

            {editingConfig.items.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 40px', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={item.key}
                  onChange={(e) => handleItemChange(idx, 'key', e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                />
                <input
                  type="text"
                  placeholder="標的名稱 (選填)"
                  value={item.name || ''}
                  onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                />
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={item.targetPercent}
                  onChange={(e) => handleItemChange(idx, 'targetPercent', Number(e.target.value) || 0)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    textAlign: 'right',
                  }}
                />
                <button
                  onClick={() => handleDeleteItem(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <button
              onClick={handleAddItem}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px dashed var(--border-color)',
                background: 'transparent',
                color: '#60a5fa',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              新增項目
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>合計目標比例：</span>
              <span
                style={{
                  fontWeight: 700,
                  color: validation.isValid ? '#10b981' : '#ef4444',
                }}
              >
                {validation.totalPercent}%
              </span>
              {!validation.isValid && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>
                  (需調整 {validation.difference > 0 ? `-${validation.difference}%` : `+${Math.abs(validation.difference)}%`})
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. 偏離度視覺化對比卡片 (Drift Visual Comparison) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
        }}
      >
        {rebalancePlan.recommendations.map((item) => {
          const isBalanced = item.status === 'BALANCED';
          const isSevere = item.status === 'SEVERE_DRIFT';
          const badgeBg = isBalanced
            ? 'rgba(16, 185, 129, 0.15)'
            : isSevere
            ? 'rgba(239, 68, 68, 0.15)'
            : 'rgba(245, 158, 11, 0.15)';
          const badgeColor = isBalanced ? '#10b981' : isSevere ? '#ef4444' : '#f59e0b';
          const badgeText = isBalanced ? '🟢 正常平衡' : isSevere ? '🔴 顯著失衡' : '🟡 輕度偏離';

          return (
            <div
              key={item.key}
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                padding: '16px',
                borderRadius: '10px',
                border: `1px solid ${isSevere ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                    {item.key}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                    {item.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: badgeBg,
                    color: badgeColor,
                  }}
                >
                  {badgeText}
                </span>
              </div>

              {/* 雙色長條對比 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: '#94a3b8' }}>實際佔比：{item.currentPercent.toFixed(1)}%</span>
                  <span style={{ color: '#c084fc', fontWeight: 600 }}>目標：{item.targetPercent.toFixed(1)}%</span>
                </div>

                <div
                  style={{
                    height: '8px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {/* 目標刻度指示 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${Math.min(100, item.targetPercent)}%`,
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      background: '#c084fc',
                      zIndex: 2,
                    }}
                    title={`目標 ${item.targetPercent}%`}
                  />
                  {/* 實際進度條 */}
                  <div
                    style={{
                      width: `${Math.min(100, item.currentPercent)}%`,
                      height: '100%',
                      background: item.driftPercent > 0 ? buyColor : '#3b82f6',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* 偏離度資訊 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginTop: '2px' }}>
                <span style={{ color: 'var(--text-muted)' }}>偏離幅度：</span>
                <span
                  className="mono"
                  style={{
                    fontWeight: 700,
                    color: item.driftPercent > 0 ? buyColor : sellColor,
                  }}
                >
                  {item.driftPercent > 0 ? `+${item.driftPercent.toFixed(1)}%` : `${item.driftPercent.toFixed(1)}%`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. 再平衡下單試算工作台 (Rebalancing Workspace) */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#f59e0b" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
              再平衡下單推薦試算台 (Actionable Rebalancing Plan)
            </h3>
          </div>

          {/* 模式切換 */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(30, 41, 59, 0.8)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              onClick={() => setMode('CASH_IN')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: mode === 'CASH_IN' ? 'var(--primary-color)' : 'transparent',
                color: mode === 'CASH_IN' ? '#fff' : 'var(--text-muted)',
              }}
            >
              <DollarSign size={14} />
              定期注水加碼 (只買不賣)
            </button>
            <button
              onClick={() => setMode('FULL_REBALANCE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: mode === 'FULL_REBALANCE' ? 'var(--primary-color)' : 'transparent',
                color: mode === 'FULL_REBALANCE' ? '#fff' : 'var(--text-muted)',
              }}
            >
              <ArrowRightLeft size={14} />
              全量買賣再平衡
            </button>
          </div>
        </div>

        {/* 注水加碼參數輸入區 */}
        {mode === 'CASH_IN' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '18px',
              padding: '12px 16px',
              background: 'rgba(30, 41, 59, 0.4)',
              borderRadius: '8px',
              border: '1px dashed var(--border-color)',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600 }}>
              本次預計注水加碼金額 (TWD)：
            </span>
            <input
              type="number"
              step="10000"
              min="0"
              value={cashInflow}
              onChange={(e) => setCashInflow(Math.max(0, Number(e.target.value) || 0))}
              style={{
                width: '180px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-color)',
                color: '#34d399',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            />
            {cashBalanceTwd > 0 && (
              <button
                onClick={() => setCashInflow(cashBalanceTwd)}
                style={{
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid rgba(52, 211, 153, 0.4)',
                  background: 'rgba(52, 211, 153, 0.1)',
                  color: '#34d399',
                  cursor: 'pointer',
                }}
              >
                帶入可用現金 (NT$ {Math.round(cashBalanceTwd).toLocaleString()})
              </button>
            )}
          </div>
        )}

        {/* 下單建議清單表格 */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>建議動作</th>
                <th style={{ padding: '10px 12px' }}>標的代碼 / 項目</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>最新市價</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>佔比走向</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>建議下單金額 (TWD)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>建議下單股數</th>
              </tr>
            </thead>
            <tbody>
              {rebalancePlan.recommendations.map((rec) => {
                const isBuy = rec.action === 'BUY';
                const isSell = rec.action === 'SELL';
                const actionBadgeBg = isBuy
                  ? 'rgba(16, 185, 129, 0.15)'
                  : isSell
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(100, 116, 139, 0.15)';
                const actionBadgeColor = isBuy ? '#10b981' : isSell ? '#ef4444' : '#94a3b8';
                const actionText = isBuy ? '加碼買進' : isSell ? '減碼賣出' : '維持現狀';

                return (
                  <tr
                    key={rec.key}
                    style={{
                      borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
                      background: isBuy || isSell ? 'rgba(30, 41, 59, 0.2)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: actionBadgeBg,
                          color: actionBadgeColor,
                        }}
                      >
                        {actionText}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div className="mono" style={{ fontWeight: 700, color: '#fff' }}>
                        {rec.key}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rec.name}</div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }} className="mono">
                      {rec.currentPrice > 0 ? (
                        rec.currency === 'USD' ? (
                          `$${rec.currentPrice.toFixed(2)}`
                        ) : (
                          `$${rec.currentPrice.toLocaleString()}`
                        )
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{rec.currentPercent.toFixed(1)}%</span>
                      <span style={{ margin: '0 6px', color: '#8b5cf6' }}>➔</span>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{rec.targetPercent.toFixed(1)}%</span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div
                        className="mono"
                        style={{
                          fontWeight: 700,
                          color: isBuy ? '#10b981' : isSell ? '#ef4444' : 'var(--text-muted)',
                        }}
                      >
                        {rec.recommendedAmountTwd > 0
                          ? `NT$ ${rec.recommendedAmountTwd.toLocaleString()}`
                          : '-'}
                      </div>
                      {rec.currency === 'USD' && rec.recommendedAmountOriginal > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ≈ ${rec.recommendedAmountOriginal.toLocaleString()} USD
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }} className="mono">
                      {rec.recommendedShares > 0 ? (
                        <span style={{ fontWeight: 700, color: '#e2e8f0' }}>
                          {rec.recommendedLotsSummary || `${rec.recommendedShares} 股`}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 底部總計與摩擦成本 */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>
              總預估買進：
              <strong style={{ color: '#10b981', marginLeft: '4px' }}>
                NT$ {rebalancePlan.summary.totalBuyAmountTwd.toLocaleString()}
              </strong>
            </span>
            {mode === 'FULL_REBALANCE' && (
              <span>
                總預估賣出：
                <strong style={{ color: '#ef4444', marginLeft: '4px' }}>
                  NT$ {rebalancePlan.summary.totalSellAmountTwd.toLocaleString()}
                </strong>
              </span>
            )}
          </div>

          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            預估交易摩擦成本 (費+稅)：
            <span style={{ color: '#f59e0b', fontWeight: 600, marginLeft: '4px' }}>
              ≈ NT$ {rebalancePlan.summary.estimatedFrictionTwd.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
