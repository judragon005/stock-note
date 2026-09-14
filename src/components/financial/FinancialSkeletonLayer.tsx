import React from 'react';

/**
 * 券商級深色毛玻璃骨架屏 (Spec 0126 Ticket 04)
 * 提供版面零位移 (Zero-CLS) 佔位體驗與平滑脈衝流光
 */
export const FinancialSkeletonLayer: React.FC = () => {
  const pulseStyle: React.CSSProperties = {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '8px',
    animation: 'skeletonPulse 1.8s ease-in-out infinite',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        width: '100%',
      }}
    >
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.85; background-color: rgba(30, 41, 59, 0.5); }
          50% { opacity: 0.35; background-color: rgba(51, 65, 85, 0.6); }
        }
      `}</style>

      {/* Layer 1 骨架: Hero 決策層與四大卡片 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '20px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          borderRadius: '14px',
          border: '1px solid rgba(51, 65, 85, 0.5)',
        }}
      >
        {/* 頂部標題與週期佔位條 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ ...pulseStyle, width: '40px', height: '40px', borderRadius: '10px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ ...pulseStyle, width: '180px', height: '22px' }} />
              <div style={{ ...pulseStyle, width: '120px', height: '14px' }} />
            </div>
          </div>
          <div style={{ ...pulseStyle, width: '90px', height: '36px', borderRadius: '18px' }} />
        </div>

        {/* 總結方針佔位 */}
        <div style={{ ...pulseStyle, width: '100%', height: '72px', borderRadius: '10px' }} />

        {/* 四大燈號指標卡佔位 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginTop: '8px',
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                ...pulseStyle,
                height: '130px',
                borderRadius: '12px',
                border: '1px solid rgba(51, 65, 85, 0.4)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Layer 2 骨架: 趨勢圖表與杜邦分析 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '20px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          borderRadius: '14px',
          border: '1px solid rgba(51, 65, 85, 0.5)',
        }}
      >
        {/* 頁籤佔位 */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ ...pulseStyle, width: '100px', height: '32px' }} />
          <div style={{ ...pulseStyle, width: '100px', height: '32px' }} />
          <div style={{ ...pulseStyle, width: '100px', height: '32px' }} />
        </div>

        {/* 大圖表區域佔位 */}
        <div
          style={{
            ...pulseStyle,
            width: '100%',
            height: '240px',
            borderRadius: '10px',
          }}
        />
      </div>

      {/* Layer 3 骨架: 深度審查佔位 */}
      <div
        style={{
          ...pulseStyle,
          width: '100%',
          height: '110px',
          borderRadius: '14px',
          border: '1px solid rgba(51, 65, 85, 0.5)',
        }}
      />
    </div>
  );
};
