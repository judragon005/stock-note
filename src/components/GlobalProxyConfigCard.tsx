import React from 'react';
import { Globe, Save } from 'lucide-react';

export interface GlobalProxyConfigCardProps {
  customProxyUrl: string;
  onCustomProxyUrlChange: (url: string) => void;
  onSaveProxy: () => void;
}

export const GlobalProxyConfigCard: React.FC<GlobalProxyConfigCardProps> = ({
  customProxyUrl,
  onCustomProxyUrlChange,
  onSaveProxy,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '10px',
        padding: '10px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 300px' }}>
        <Globe size={16} color="#38bdf8" />
        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', whiteSpace: 'nowrap' }}>
          自訂代理伺服器端點 (Proxy URL):
        </label>
        <input
          type="text"
          data-testid="input-custom-proxy-url"
          value={customProxyUrl}
          onChange={(e) => onCustomProxyUrlChange(e.target.value)}
          placeholder="例: https://my-custom-proxy.workers.dev (選填，自建 Cloudflare Worker)"
          style={{
            flex: 1,
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '6px',
            padding: '5px 10px',
            fontSize: '0.78rem',
            color: '#f8fafc',
            outline: 'none',
          }}
        />
      </div>
      <button
        type="button"
        data-testid="btn-save-proxy-url"
        onClick={onSaveProxy}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          border: 'none',
          color: '#ffffff',
          fontSize: '0.76rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <Save size={13} />
        儲存代理
      </button>
    </div>
  );
};
