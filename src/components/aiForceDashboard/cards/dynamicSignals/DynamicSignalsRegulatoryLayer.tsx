import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

export interface DynamicSignalsRegulatoryLayerProps {
  regulatoryBadge?: string;
  brokerMarginAlert?: string;
}

/**
 * Card 12 專業監理層：交易所處置/注意標籤與券商融資斷頭警戒 (Spec 0241 T05 / Debt 0049)
 */
export const DynamicSignalsRegulatoryLayer: React.FC<DynamicSignalsRegulatoryLayerProps> = ({
  regulatoryBadge,
  brokerMarginAlert,
}) => {
  if (!regulatoryBadge && !brokerMarginAlert) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {regulatoryBadge && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <AlertTriangle size={11} />
          <span>{regulatoryBadge}</span>
        </div>
      )}
      {brokerMarginAlert && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <ShieldAlert size={11} />
          <span>{brokerMarginAlert}</span>
        </div>
      )}
    </div>
  );
};
