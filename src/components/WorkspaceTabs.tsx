import React from 'react';
import { PieChart, History, Settings } from 'lucide-react';

export type WorkspaceTabKey = 'portfolio' | 'ledger' | 'settings' | 'friction';

interface WorkspaceTabsProps {
  activeTab: WorkspaceTabKey;
  onChangeTab: (tab: WorkspaceTabKey) => void;
  holdingsCount: number;
  tradesCount: number;
  accountsCount: number;
  totalSavedFriction?: number;
}

export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({
  activeTab,
  onChangeTab,
  holdingsCount,
  tradesCount,
  accountsCount,
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
  }[] = [
    {
      key: 'portfolio',
      label: '投資組合與庫存',
      icon: <PieChart size={16} />,
      badge: `${holdingsCount} 標的`,
      badgeColor: '#3b82f6',
    },
    {
      key: 'ledger',
      label: '歷史交易帳本',
      icon: <History size={16} />,
      badge: `${tradesCount} 筆`,
      badgeColor: '#10b981',
    },
    {
      key: 'settings',
      label: '設定',
      icon: <Settings size={16} />,
      badge: totalSavedFriction > 0 ? `省 NT$ ${Math.round(totalSavedFriction).toLocaleString()}` : `${accountsCount} 帳戶`,
      badgeColor: '#f59e0b',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '12px',
        overflowX: 'auto',
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
              padding: '10px 18px',
              borderRadius: '12px',
              border: isActive ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
              background: isActive
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)'
                : 'rgba(30, 41, 59, 0.4)',
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: isActive ? '#60a5fa' : 'var(--text-muted)' }}>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.3)',
                  color: isActive ? '#ffffff' : tab.badgeColor || 'var(--text-muted)',
                  fontWeight: 600,
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
