import React from 'react';
import { Compass, AlertTriangle } from 'lucide-react';
import { MacroCompassEvaluation, MacroIndicatorSnapshot } from '../../types/zavySlowWealth';

interface ZavyMacroCompassCardProps {
  evaluation: MacroCompassEvaluation;
  snapshot: MacroIndicatorSnapshot;
}

export const ZavyMacroCompassCard: React.FC<ZavyMacroCompassCardProps> = ({
  evaluation,
  snapshot,
}) => {
  const { tidal, wave, creditRadar } = evaluation;

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        border: '1px solid #334155',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* 標題列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={20} color="#38bdf8" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
            鏡頭一：總體經濟三級週期羅盤 (Macro Compass)
          </h3>
        </div>
        <div
          style={{
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '20px',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            fontWeight: 500,
          }}
        >
          信心度 {wave.confidenceScore}%
        </div>
      </div>

      {/* 三格指標矩陣 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
        {/* 1. 潮汐大週期 & 10Y 美債新常態 */}
        <div
          style={{
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #1e293b',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
            🌊 潮汐大週期 (30Y 景氣與利率中樞)
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', marginBottom: '8px' }}>
            生產力擴張期 · 10Y美債 {snapshot.treasuryYield10y?.toFixed(2) ?? '4.45'}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span
              style={{
                color:
                  tidal.treasury10yNewNormalStatus === 'IN_RANGE_4_TO_5_5'
                    ? '#10b981'
                    : '#f59e0b',
                fontWeight: 600,
              }}
            >
              [{tidal.treasury10yNewNormalStatus === 'IN_RANGE_4_TO_5_5' ? '新常態 4.0%~5.5% 平衡' : '區間外警戒'}]
            </span>
            <span style={{ color: '#64748b' }}>二次升息後利率新常態</span>
          </div>
        </div>

        {/* 2. 製造業庫存波浪週期 */}
        <div
          style={{
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #1e293b',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
            📈 波浪商業週期 (2-4Y 製造業循環)
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#38bdf8', marginBottom: '8px' }}>
            【{wave.phase}】{wave.cycleSummary}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            美 ISM: {snapshot.usIsmPmi ?? '51.5'} | 台 PMI: {snapshot.twPmi ?? '53.8'}
          </div>
        </div>

        {/* 3. 台灣小車 vs 美國大卡車 */}
        <div
          style={{
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #1e293b',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
            🚚 美台動能輪動 (大卡車 vs 小車)
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#f59e0b', marginBottom: '8px' }}>
            {wave.smallTruckVsBigTruckStatus.twStatus === 'LEADING_UP' ? '台灣小車率先向上領先' : '美台週期同步'}
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            {wave.smallTruckVsBigTruckStatus.commentary}
          </div>
        </div>
      </div>

      {/* 信用裂痕雷達 Banner */}
      <div
        style={{
          padding: '12px 16px',
          borderRadius: '10px',
          backgroundColor:
            creditRadar.creditRiskLevel === 'HIGH' || creditRadar.creditRiskLevel === 'CRITICAL'
              ? 'rgba(239, 68, 68, 0.15)'
              : creditRadar.isOasOverheatedLow
              ? 'rgba(245, 158, 11, 0.15)'
              : 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${
            creditRadar.creditRiskLevel === 'HIGH'
              ? 'rgba(239, 68, 68, 0.4)'
              : creditRadar.isOasOverheatedLow
              ? 'rgba(245, 158, 11, 0.3)'
              : 'rgba(16, 185, 129, 0.2)'
          }`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <AlertTriangle
            size={16}
            color={creditRadar.creditRiskLevel === 'HIGH' ? '#ef4444' : '#f59e0b'}
          />
          <span style={{ fontWeight: 600, color: '#f8fafc' }}>
            信用裂痕雷達：
          </span>
          <span style={{ color: '#cbd5e1' }}>
            高收益債 OAS {snapshot.highYieldSpreadOas?.toFixed(2) ?? '3.20'}% | CCC 垃圾債利差 {snapshot.cccHighYieldSpread?.toFixed(2) ?? '7.50'}%
          </span>
        </div>
        <div
          style={{
            fontSize: '12px',
            color: creditRadar.creditRiskLevel === 'HIGH' ? '#f87171' : '#34d399',
            fontWeight: 500,
          }}
        >
          {creditRadar.warningMessage || '✅ 信貸流動性充裕，無系統性違約裂痕'}
        </div>
      </div>
    </div>
  );
};

