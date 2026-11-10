import React from 'react';
import { X, Zap, Shield, Compass, TrendingUp, CheckCircle2 } from 'lucide-react';
import { ZavyComprehensiveAnalysisReport } from '../../types/zavySlowWealth';

interface ZavyTenSecondsModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ZavyComprehensiveAnalysisReport;
}

export const ZavyTenSecondsModal: React.FC<ZavyTenSecondsModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  if (!isOpen) return null;

  const { tenSecondsExecutiveSummary, trackA } = report;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '640px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部標題 */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.05))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <Zap size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>
                Zavy 10 秒快速校準儀
              </h3>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                過濾短線市場噪音 · 回歸大局觀與個人邊界
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 核心四大結論 */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tenSecondsExecutiveSummary.map((item, index) => {
            const icons = [
              <Compass size={18} color="#38bdf8" />,
              <TrendingUp size={18} color="#10b981" />,
              <Shield size={18} color="#f59e0b" />,
              <CheckCircle2 size={18} color="#a855f7" />,
            ];

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: '14px',
                  padding: '14px 16px',
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: '1px solid #1e293b',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ marginTop: '2px', flexShrink: 0 }}>{icons[index % icons.length]}</div>
                <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#e2e8f0' }}>{item}</div>
              </div>
            );
          })}

          {/* 總結核心行動指引 */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981' }}>
              🎯 原作者核心提醒：把路走完
            </div>
            <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
              製造業上行期中的下跌皆為「波浪回檔」，切勿對每日新聞與漣漪起反應。保持
              {trackA.finalSuggestedEquityExposurePercent}% 核心曝險，利用股息增量加碼防彈衣，安心慢富。
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #334155',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#0f172a',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            確認並回到全景工作區
          </button>
        </div>
      </div>
    </div>
  );
};

