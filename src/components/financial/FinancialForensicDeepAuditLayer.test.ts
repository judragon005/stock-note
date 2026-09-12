import { describe, it, expect } from 'vitest';
import {
  getAnomalySeverityBadgeInfo,
  getAuditOpinionBadgeInfo,
} from './FinancialForensicDeepAuditLayer';
import { isBigFourFirm } from '../../types/financialForensic';

describe('FinancialForensicDeepAuditLayer (Layer 3 UI Logic & Tests)', () => {
  it('1. 鑑識異常嚴重度標籤映射正確', () => {
    const danger = getAnomalySeverityBadgeInfo('DANGEROUS');
    expect(danger.text).toContain('高危警報');
    expect(danger.bgClass).toContain('rose');

    const warning = getAnomalySeverityBadgeInfo('WARNING');
    expect(warning.text).toContain('關注警戒');
    expect(warning.bgClass).toContain('amber');
  });

  it('2. 會計師查核意見等級標籤正確映射', () => {
    const cleanOpinion = getAuditOpinionBadgeInfo('UNQUALIFIED');
    expect(cleanOpinion.text).toContain('無保留意見');
    expect(cleanOpinion.isClean).toBe(true);

    const qualifiedOpinion = getAuditOpinionBadgeInfo('QUALIFIED');
    expect(qualifiedOpinion.text).toContain('保留意見');
    expect(qualifiedOpinion.isClean).toBe(false);

    const adverseOpinion = getAuditOpinionBadgeInfo('ADVERSE');
    expect(adverseOpinion.isClean).toBe(false);
  });

  it('3. 四大事務所徽章判斷正確', () => {
    expect(isBigFourFirm('勤業眾信聯合會計師事務所')).toBe(true);
    expect(isBigFourFirm('安永聯合會計師事務所')).toBe(true);
    expect(isBigFourFirm('資誠聯合會計師事務所')).toBe(true);
    expect(isBigFourFirm('安侯建業聯合會計師事務所')).toBe(true);
    expect(isBigFourFirm('Ernst & Young LLP')).toBe(true);
    expect(isBigFourFirm('無名獨立會計事務所')).toBe(false);
  });
});
