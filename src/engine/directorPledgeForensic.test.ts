import { describe, it, expect } from 'vitest';
import { evaluateDirectorPledgeRisk } from './forensicRadarEngine';

describe('Ticket 14: Forensic Radar Pledge Stress Detector', () => {
  it('1. 質押比例 >= 50% 時應觸發 DANGEROUS 致命斷頭紅燈警示', () => {
    const risk = evaluateDirectorPledgeRisk(58.5, 0);
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe('DANGEROUS');
    expect(risk?.title).toContain('董監事持股高比例質押');
    expect(risk?.penaltyPoints).toBe(30);
    expect(risk?.summary).toContain('58.5%');
  });

  it('2. 質押比例介於 30%~50% 時應觸發 WARNING 黃燈警戒', () => {
    const risk = evaluateDirectorPledgeRisk(38.0, 0);
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe('WARNING');
    expect(risk?.penaltyPoints).toBe(15);
  });

  it('3. 當月高管申報轉讓持股超過 500 張應產生警示', () => {
    const risk = evaluateDirectorPledgeRisk(10.0, 800);
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe('WARNING');
    expect(risk?.title).toContain('內部人大量申報轉讓');
  });

  it('4. 質押比例低於 30% 且無大量申報轉讓應安全回傳 null', () => {
    const risk = evaluateDirectorPledgeRisk(12.5, 50);
    expect(risk).toBeNull();
  });
});
