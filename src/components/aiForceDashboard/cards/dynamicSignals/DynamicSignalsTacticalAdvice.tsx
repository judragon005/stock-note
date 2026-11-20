import React from 'react';

export interface DynamicSignalsTacticalAdviceProps {
  vwapBiasStdText?: string;
  keySupportPrice?: number;
  keyPressurePrice?: number;
  actionableAdvice?: string;
  verdictColor: string;
}

/**
 * Card 12 決策與白話操作情境解析層：法人 VWAP 偏離、關鍵水線與 AI 指引 (Spec 0241 T05 / Debt 0049)
 */
export const DynamicSignalsTacticalAdvice: React.FC<DynamicSignalsTacticalAdviceProps> = ({
  vwapBiasStdText,
  keySupportPrice,
  keyPressurePrice,
  actionableAdvice,
  verdictColor,
}) => (
  <>
    {(vwapBiasStdText || keySupportPrice != null || keyPressurePrice != null) && (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '5px 8px',
          background: 'rgba(30, 41, 59, 0.45)',
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: '#cbd5e1',
        }}
      >
        {vwapBiasStdText && (
          <div>
            <span style={{ color: '#94a3b8' }}>VWAP: </span>
            <span style={{ fontWeight: 700, color: '#38bdf8' }}>{vwapBiasStdText}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          {keySupportPrice != null && (
            <div>
              <span style={{ color: '#94a3b8' }}>防守: </span>
              <span style={{ fontWeight: 700, color: '#34d399' }}>{keySupportPrice}</span>
            </div>
          )}
          {keyPressurePrice != null && (
            <div>
              <span style={{ color: '#94a3b8' }}>壓力: </span>
              <span style={{ fontWeight: 700, color: '#f87171' }}>{keyPressurePrice}</span>
            </div>
          )}
        </div>
      </div>
    )}

    {actionableAdvice && (
      <div
        style={{
          padding: '8px 10px',
          borderRadius: '6px',
          background: 'rgba(15, 23, 42, 0.6)',
          borderLeft: `3px solid ${verdictColor}`,
          fontSize: '0.75rem',
          lineHeight: 1.55,
          color: '#e2e8f0',
          marginTop: '2px',
          marginBottom: '4px',
        }}
      >
        <div style={{ color: verdictColor, fontWeight: 800, marginBottom: '4px', fontSize: '0.75rem' }}>
          【AI 決策情境解析】
        </div>
        <div>{actionableAdvice}</div>
      </div>
    )}
  </>
);
