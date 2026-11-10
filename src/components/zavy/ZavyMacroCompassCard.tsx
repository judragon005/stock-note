import React from 'react';
import { Compass, AlertTriangle } from 'lucide-react';
import { MacroCompassEvaluation, MacroIndicatorSnapshot } from '../../types/zavySlowWealth';
import { TermTooltip } from '../common/TermTooltip';
import {
  ZAVY_SLOW_WEALTH_GLOSSARY,
  formatWavePhaseLabel,
} from '../../constants/zavyGlossary';

interface ZavyMacroCompassCardProps {
  evaluation: MacroCompassEvaluation;
  snapshot: MacroIndicatorSnapshot;
}

export const ZavyMacroCompassCard: React.FC<ZavyMacroCompassCardProps> = ({
  evaluation,
  snapshot,
}) => {
  const { tidal, wave, creditRadar } = evaluation;
  const { twStatus, leadTimeMonths, commentary: truckCommentary } = wave.smallTruckVsBigTruckStatus;
  const wavePhaseLabel = formatWavePhaseLabel(wave.phase);

  const formatSignedPercent = (val?: number) => {
    if (typeof val !== 'number' || Number.isNaN(val)) return '--';
    return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;
  };

  const truckTitle =
    twStatus === 'LEADING_UP'
      ? `台灣小車率先向上領先${leadTimeMonths > 0 ? ` (領先約 ${leadTimeMonths} 個月)` : ''}`
      : twStatus === 'LEADING_DOWN'
      ? `台灣小車率先降溫轉弱${leadTimeMonths > 0 ? ` (領先約 ${leadTimeMonths} 個月)` : ''}`
      : '美台週期同步';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={20} color="#38bdf8" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
            <TermTooltip
              entry={ZAVY_SLOW_WEALTH_GLOSSARY.M01_threeTierCycle}
              dynamicDiagnosis={tidal.narrative}
              showIcon
            >
              鏡頭一：總體經濟三級週期羅盤 (Macro Compass)
            </TermTooltip>
          </h3>
        </div>
        <TermTooltip
          entry={ZAVY_SLOW_WEALTH_GLOSSARY.M00_confidenceScore}
          dynamicDiagnosis={`目前共有 ${Math.round((wave.confidenceScore / 100) * 6)} / 6 項核心總經指標已同步入庫（信心度代表數據完整度，非預測上漲機率）。`}
          underline={false}
        >
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
            數據完整信心度 {wave.confidenceScore}% ⓘ
          </div>
        </TermTooltip>
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
            <TermTooltip
              entry={ZAVY_SLOW_WEALTH_GLOSSARY.M02_treasury10yNewNormal}
              dynamicDiagnosis={tidal.narrative}
              showIcon
            >
              🌊 潮汐大週期 (30Y 景氣與利率中樞)
            </TermTooltip>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', marginBottom: '8px' }}>
            生產力擴張期 · 10Y美債 {snapshot.treasuryYield10y != null ? `${snapshot.treasuryYield10y.toFixed(2)}%` : '--'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginBottom: '6px' }}>
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
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.45' }}>
            {tidal.narrative}
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
            <TermTooltip
              entry={ZAVY_SLOW_WEALTH_GLOSSARY.M03_waveBusinessCyclePmi}
              dynamicDiagnosis={`目前判定為【${wavePhaseLabel}】：${wave.cycleSummary}`}
              showIcon
            >
              📈 波浪商業週期 (2-4Y 製造業循環)
            </TermTooltip>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#38bdf8', marginBottom: '8px' }}>
            【{wavePhaseLabel}】{wave.cycleSummary}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
            美 ISM: {snapshot.usIsmPmi != null ? snapshot.usIsmPmi : '--'} | 台 PMI: {snapshot.twPmi != null ? snapshot.twPmi : '--'}
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
            <TermTooltip
              entry={ZAVY_SLOW_WEALTH_GLOSSARY.M04_ordersMinusInventory}
              showIcon={false}
            >
              <span>
                美新訂單-存貨: {formatSignedPercent(snapshot.usNewOrdersMinusInventory)} | 台股營收擴散:{' '}
                {snapshot.twRevenueDiffusionIndex != null
                  ? `${snapshot.twRevenueDiffusionIndex.toFixed(1)}%`
                  : '--'}
              </span>
            </TermTooltip>
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
            <TermTooltip
              entry={ZAVY_SLOW_WEALTH_GLOSSARY.M05_smallTruckVsBigTruck}
              dynamicDiagnosis={wave.smallTruckVsBigTruckStatus.commentary}
              showIcon
            >
              🚚 美台動能輪動 (大卡車 vs 小車)
            </TermTooltip>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#f59e0b', marginBottom: '6px' }}>
            {truckTitle}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
            台外銷/營收年增: {formatSignedPercent(snapshot.twExportOrdersYoY)}
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            {truckCommentary}
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
            creditRadar.creditRiskLevel === 'HIGH' || creditRadar.creditRiskLevel === 'CRITICAL'
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
            color={
              creditRadar.creditRiskLevel === 'HIGH' || creditRadar.creditRiskLevel === 'CRITICAL'
                ? '#ef4444'
                : '#f59e0b'
            }
          />
          <span style={{ fontWeight: 600, color: '#f8fafc' }}>
            <TermTooltip
              entry={ZAVY_SLOW_WEALTH_GLOSSARY.M06_creditCrackRadar}
              dynamicDiagnosis={
                creditRadar.warningMessage || '✅ 信貸流動性充裕，無系統性違約裂痕'
              }
              showIcon
            >
              信用裂痕雷達：
            </TermTooltip>
          </span>
          <span style={{ color: '#cbd5e1' }}>
            高收益債 OAS {snapshot.highYieldSpreadOas != null ? `${snapshot.highYieldSpreadOas.toFixed(2)}%` : '--'} | CCC 垃圾債利差 {snapshot.cccHighYieldSpread != null ? `${snapshot.cccHighYieldSpread.toFixed(2)}%` : '--'}
          </span>
        </div>
        <div
          style={{
            fontSize: '12px',
            color:
              creditRadar.creditRiskLevel === 'HIGH' || creditRadar.creditRiskLevel === 'CRITICAL'
                ? '#f87171'
                : '#34d399',
            fontWeight: 500,
          }}
        >
          {creditRadar.warningMessage || '✅ 信貸流動性充裕，無系統性違約裂痕'}
        </div>
      </div>
    </div>
  );
};
