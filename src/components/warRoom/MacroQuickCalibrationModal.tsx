import React, { useState, useEffect } from 'react';
import type { MacroIndicatorSnapshot } from '../../types/macro';

export interface MacroCalibrationFormState {
  us10y: string;
  us2y: string;
  vix: string;
  fearAndGreedIndex: string;
  twFuturesNetOi: string;
  twMarginMaintenance: string;
  creditSpreadOAS: string;
  cdsInsuranceIndex: string;
  goldPrice: string;
  soxIndex: string;
  tsmAdrPrice: string;
  tsmTwPrice: string;
  taiexIndex: string;
  soxBias20Ma: string;
  taiexBias20Ma: string;
  dxy: string;
  oilPrice: string;
  cccSpreadOAS: string;
  usIsmPmi: string;
  twPmi: string;
}

const EXTRA_CALIBRATION_FIELDS: Array<{
  key: keyof MacroCalibrationFormState;
  label: string;
  step: string;
  placeholder?: string;
}> = [
  { key: 'taiexIndex', label: '台股加權指數 (^TWII)', step: '1', placeholder: '如 23150' },
  { key: 'soxBias20Ma', label: '費半 20MA 乖離率 (%)', step: '0.1', placeholder: '如 2.4' },
  { key: 'taiexBias20Ma', label: '台股 20MA 乖離率 (%)', step: '0.1', placeholder: '如 1.2' },
  { key: 'dxy', label: '美元指數 (DXY)', step: '0.1', placeholder: '如 104.2' },
  { key: 'oilPrice', label: 'WTI 原油 (USD/桶)', step: '0.1', placeholder: '如 72.5' },
  { key: 'cccSpreadOAS', label: 'CCC 級垃圾債利差 OAS (%)', step: '0.01', placeholder: '如 8.5' },
  { key: 'usIsmPmi', label: '美國 ISM 製造業 PMI', step: '0.1', placeholder: '如 50.5' },
  { key: 'twPmi', label: '台灣製造業 PMI', step: '0.1', placeholder: '如 52.0' },
];

export interface MacroQuickCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  macroSnapshot: MacroIndicatorSnapshot;
  onSave: (updatedSnapshot: MacroIndicatorSnapshot) => void;
}

export const MacroQuickCalibrationModal: React.FC<MacroQuickCalibrationModalProps> = ({
  isOpen,
  onClose,
  macroSnapshot,
  onSave,
}) => {
  const [formData, setFormData] = useState<MacroCalibrationFormState>({
    us10y: '',
    us2y: '',
    vix: '',
    fearAndGreedIndex: '',
    twFuturesNetOi: '',
    twMarginMaintenance: '',
    creditSpreadOAS: '',
    cdsInsuranceIndex: '',
    goldPrice: '',
    soxIndex: '',
    tsmAdrPrice: '',
    tsmTwPrice: '',
    taiexIndex: '',
    soxBias20Ma: '',
    taiexBias20Ma: '',
    dxy: '',
    oilPrice: '',
    cccSpreadOAS: '',
    usIsmPmi: '',
    twPmi: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        us10y: macroSnapshot.us10y.toString(),
        us2y: macroSnapshot.us2y.toString(),
        vix: macroSnapshot.vix.toString(),
        fearAndGreedIndex: macroSnapshot.fearAndGreedIndex.toString(),
        twFuturesNetOi: (macroSnapshot.twFuturesNetOi ?? -15000).toString(),
        twMarginMaintenance: (macroSnapshot.twMarginMaintenance ?? 165.2).toString(),
        creditSpreadOAS: (macroSnapshot.creditSpreadOAS ?? 3.5).toString(),
        cdsInsuranceIndex: (macroSnapshot.cdsInsuranceIndex ?? 65).toString(),
        goldPrice: (macroSnapshot.goldPrice ?? 3350).toString(),
        soxIndex: (macroSnapshot.soxIndex ?? 5200).toString(),
        tsmAdrPrice: (macroSnapshot.tsmAdrPrice ?? 195).toString(),
        tsmTwPrice: (macroSnapshot.tsmTwPrice ?? 1050).toString(),
        taiexIndex: macroSnapshot.taiexIndex !== undefined ? macroSnapshot.taiexIndex.toString() : '',
        soxBias20Ma: macroSnapshot.soxBias20Ma !== undefined ? macroSnapshot.soxBias20Ma.toString() : '',
        taiexBias20Ma: macroSnapshot.taiexBias20Ma !== undefined ? macroSnapshot.taiexBias20Ma.toString() : '',
        dxy: (macroSnapshot.dxy ?? 101.5).toString(),
        oilPrice: (macroSnapshot.oilPrice ?? 75).toString(),
        cccSpreadOAS: macroSnapshot.cccSpreadOAS !== undefined ? macroSnapshot.cccSpreadOAS.toString() : '',
        usIsmPmi: macroSnapshot.usIsmPmi !== undefined ? macroSnapshot.usIsmPmi.toString() : '',
        twPmi: macroSnapshot.twPmi !== undefined ? macroSnapshot.twPmi.toString() : '',
      });
    }
  }, [isOpen, macroSnapshot]);

  if (!isOpen) return null;

  const handleChange = (field: keyof MacroCalibrationFormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const us10yNum = parseFloat(formData.us10y) || 3.85;
    const us2yNum = parseFloat(formData.us2y) || 3.95;
    const vixNum = parseFloat(formData.vix) || 18.5;
    const fgNum = parseInt(formData.fearAndGreedIndex, 10) || 50;
    const oiNum = parseInt(formData.twFuturesNetOi, 10) || -15000;
    const marginNum = parseFloat(formData.twMarginMaintenance) || 165.2;
    const oasNum = parseFloat(formData.creditSpreadOAS) || 3.5;
    const cdsNum = parseFloat(formData.cdsInsuranceIndex) || 65;
    const goldNum = parseFloat(formData.goldPrice) || 3350;
    const soxNum = parseFloat(formData.soxIndex) || macroSnapshot.soxIndex || 5200;
    const tsmAdrNum = parseFloat(formData.tsmAdrPrice) || macroSnapshot.tsmAdrPrice || 195;
    const tsmTwNum = parseFloat(formData.tsmTwPrice) || macroSnapshot.tsmTwPrice || 1050;

    const fxRate = macroSnapshot.usdToTwd || 32.15;
    const convertedTwd = Number(((tsmAdrNum * fxRate) / 5).toFixed(2));
    const premiumPct =
      tsmTwNum > 0 ? Number((((convertedTwd - tsmTwNum) / tsmTwNum) * 100).toFixed(2)) : 0;

    const parseOptNum = (raw: string, prev?: number): number | undefined => {
      if (!raw.trim()) return prev;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : prev;
    };

    const yieldSpread = Math.round((us10yNum - us2yNum) * 100) / 100;
    const updated: MacroIndicatorSnapshot = {
      ...macroSnapshot,
      us10y: us10yNum,
      us2y: us2yNum,
      yieldSpread,
      isYieldInverted: yieldSpread < 0,
      vix: vixNum,
      vixLevel: vixNum >= 30 ? 'PANIC' : vixNum >= 20 ? 'ELEVATED' : 'NORMAL',
      fearAndGreedIndex: fgNum,
      fearAndGreedLevel:
        fgNum <= 25
          ? 'EXTREME_FEAR'
          : fgNum <= 45
            ? 'FEAR'
            : fgNum <= 55
              ? 'NEUTRAL'
              : fgNum <= 75
                ? 'GREED'
                : 'EXTREME_GREED',
      twFuturesNetOi: oiNum,
      twMarginMaintenance: marginNum,
      creditSpreadOAS: oasNum,
      cdsInsuranceIndex: cdsNum,
      goldPrice: goldNum,
      soxIndex: soxNum,
      tsmAdrPrice: tsmAdrNum,
      tsmTwPrice: tsmTwNum,
      tsmAdrConvertedTwd: convertedTwd,
      tsmAdrPremiumPercent: premiumPct,
      taiexIndex: parseOptNum(formData.taiexIndex, macroSnapshot.taiexIndex),
      soxBias20Ma: parseOptNum(formData.soxBias20Ma, macroSnapshot.soxBias20Ma),
      taiexBias20Ma: parseOptNum(formData.taiexBias20Ma, macroSnapshot.taiexBias20Ma),
      dxy: parseOptNum(formData.dxy, macroSnapshot.dxy) ?? macroSnapshot.dxy,
      oilPrice: parseOptNum(formData.oilPrice, macroSnapshot.oilPrice) ?? macroSnapshot.oilPrice,
      cccSpreadOAS: parseOptNum(formData.cccSpreadOAS, macroSnapshot.cccSpreadOAS),
      usIsmPmi: parseOptNum(formData.usIsmPmi, macroSnapshot.usIsmPmi),
      twPmi: parseOptNum(formData.twPmi, macroSnapshot.twPmi),
      asOfTimestamp: new Date().toISOString(),
      sourceStatus: 'CALIBRATED',
      date: new Date().toISOString().split('T')[0],
      updatedAt: Date.now(),
    };

    onSave(updated);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    background: 'var(--bg-primary, #0f172a)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-secondary, #1e293b)',
          borderRadius: '16px',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          width: '100%',
          maxWidth: '600px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>✏️</span>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              10 秒極簡快速校準宏觀數據 (含跨市費半與台積電 ADR)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '1.2rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              margin: '0 0 16px 0',
              lineHeight: 1.5,
            }}
          >
            手動覆寫最新數據以消除離線滯後。儲存後將即時重算雙溫度計、台積電 ADR 溢折價並注入晨會簡報。
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                美債 10 年期殖利率 (%)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.us10y}
                onChange={(e) => handleChange('us10y', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                美債 2 年期殖利率 (%)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.us2y}
                onChange={(e) => handleChange('us2y', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                VIX 恐慌指數
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.vix}
                onChange={(e) => handleChange('vix', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                國際黃金現貨/期貨 GC=F (USD/oz)
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.goldPrice}
                onChange={(e) => handleChange('goldPrice', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                費城半導體 (^SOX)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.soxIndex}
                onChange={(e) => handleChange('soxIndex', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                台積電 ADR (TSM USD)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.tsmAdrPrice}
                onChange={(e) => handleChange('tsmAdrPrice', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                台積電現貨 (2330 TWD)
              </label>
              <input
                type="number"
                step="1"
                value={formData.tsmTwPrice}
                onChange={(e) => handleChange('tsmTwPrice', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                外資台指期未平倉淨口數 (負為空單)
              </label>
              <input
                type="number"
                step="100"
                placeholder="如 -35000"
                value={formData.twFuturesNetOi}
                onChange={(e) => handleChange('twFuturesNetOi', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                全市場融資維持率 (%)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="如 165.2"
                value={formData.twMarginMaintenance}
                onChange={(e) => handleChange('twMarginMaintenance', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                高收益債信用利差 OAS (%)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="如 3.5"
                value={formData.creditSpreadOAS}
                onChange={(e) => handleChange('creditSpreadOAS', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                CDS 信用違約交換指數 (基點)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="如 65"
                value={formData.cdsInsuranceIndex}
                onChange={(e) => handleChange('cdsInsuranceIndex', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                CNN 恐懼貪婪指數 (0~100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={formData.fearAndGreedIndex}
                onChange={(e) => handleChange('fearAndGreedIndex', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '10px', marginBottom: '18px' }}>
            {EXTRA_CALIBRATION_FIELDS.map((f) => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {f.label}
                </label>
                <input
                  type="number"
                  step={f.step}
                  placeholder={f.placeholder}
                  value={formData[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ fontSize: '0.82rem', padding: '7px 16px' }}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', padding: '7px 18px' }}
            >
              💾 儲存並即時重算
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
