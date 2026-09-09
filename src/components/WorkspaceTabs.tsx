import React from 'react';
import { PieChart, TrendingUp, History, Settings, Wallet, Coins, Activity, Compass, Flame } from 'lucide-react';

export type WorkspaceTabKey = 'portfolio' | 'warroom' | 'musclebooker' | 'fire' | 'growth' | 'chips' | 'dividend' | 'cash' | 'ledger' | 'settings' | 'friction';

interface WorkspaceTabsProps {
  activeTab: WorkspaceTabKey;
  onChangeTab: (tab: WorkspaceTabKey) => void;
  holdingsCount: number;
  tradesCount: number;
  accountsCount: number;
  dividendTradesCount?: number;
  receivableDividendsCount?: number;
  cashTransactionsCount?: number;
  totalSavedFriction?: number;
}

export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({
  activeTab,
  onChangeTab,
  holdingsCount,
  tradesCount,
  accountsCount,
  dividendTradesCount = 0,
  receivableDividendsCount = 0,
  cashTransactionsCount = 0,
  totalSavedFriction = 0,
}) => {
  // 向後相容 friction 映射至 settings
  const normalizedActiveTab = activeTab === 'friction' ? 'settings' : activeTab;

  const tabs: {
    key: WorkspaceTabKey;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    badgeColor?: string;
    badgeBg?: string;
  }[] = [
    {
      key: 'portfolio',
      label: '投資組合與庫存',
      icon: <PieChart size={16} />,
      badge: `${holdingsCount} 標的`,
      badgeColor: '#60a5fa',
      badgeBg: 'rgba(59, 130, 246, 0.15)',
    },
    {
      key: 'warroom',
      label: '宏觀戰情室',
      icon: <Compass size={16} />,
      badge: 'AI 作戰方針',
      badgeColor: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
    },
    {
      key: 'musclebooker',
      label: '肌肉書僮·動能雷達',
      icon: <Flame size={16} />,
      badge: '短線聖經',
      badgeColor: '#f43f5e',
      badgeBg: 'rgba(244, 63, 94, 0.15)',
    },
    {
      key: 'fire',
      label: '退休與複利飛輪',
      icon: <TrendingUp size={16} />,
      badge: 'FIRE 導航',
      badgeColor: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
    },
    {
      key: 'growth',
      label: '資產成長 (NAV)',
      icon: <TrendingUp size={16} />,
      badge: '全歷史折線',
      badgeColor: '#34d399',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
    },
    {
      key: 'chips',
      label: '籌碼與動態星圖',
      icon: <Activity size={16} />,
      badge: '聰明錢泡泡',
      badgeColor: '#f472b6',
      badgeBg: 'rgba(244, 114, 182, 0.15)',
    },
    {
      key: 'dividend',
      label: '股利日誌與現金流',
      icon: <Coins size={16} />,
      badge: receivableDividendsCount > 0 ? `${receivableDividendsCount} 待發放` : `${dividendTradesCount} 筆入帳`,
      badgeColor: receivableDividendsCount > 0 ? '#fbbf24' : '#34d399',
      badgeBg: receivableDividendsCount > 0 ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.15)',
    },

    {
      key: 'cash',
      label: '現金與借貸',
      icon: <Wallet size={16} />,
      badge: `${cashTransactionsCount} 筆流水`,
      badgeColor: '#38bdf8',
      badgeBg: 'rgba(56, 189, 248, 0.15)',
    },
    {
      key: 'ledger',
      label: '歷史交易帳本',
      icon: <History size={16} />,
      badge: `${tradesCount} 筆`,
      badgeColor: '#a78bfa',
      badgeBg: 'rgba(139, 92, 246, 0.15)',
    },
    {
      key: 'settings',
      label: '設定中心',
      icon: <Settings size={16} />,
      badge: totalSavedFriction > 0 ? `省 NT$ ${Math.round(totalSavedFriction).toLocaleString()}` : `${accountsCount} 帳戶`,
      badgeColor: '#fb923c',
      badgeBg: 'rgba(249, 115, 22, 0.15)',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '20px',
        background: 'rgba(15, 23, 42, 0.5)',
        padding: '6px',
        borderRadius: '14px',
        border: '1px solid rgba(51, 65, 85, 0.35)',
        overflowX: 'auto',
        backdropFilter: 'blur(10px)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = normalizedActiveTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChangeTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: '10px',
              border: isActive
                ? '1px solid rgba(59, 130, 246, 0.45)'
                : '1px solid transparent',
              background: isActive
                ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)'
                : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isActive ? '0 4px 14px rgba(59, 130, 246, 0.2)' : 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                color: isActive ? '#60a5fa' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.2s ease',
              }}
            >
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 7px',
                  borderRadius: '12px',
                  background: isActive ? 'rgba(59, 130, 246, 0.25)' : (tab.badgeBg || 'rgba(0, 0, 0, 0.3)'),
                  color: isActive ? '#93c5fd' : (tab.badgeColor || 'var(--text-muted)'),
                  fontWeight: 600,
                  border: isActive ? '1px solid rgba(147, 197, 253, 0.3)' : '1px solid transparent',
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
