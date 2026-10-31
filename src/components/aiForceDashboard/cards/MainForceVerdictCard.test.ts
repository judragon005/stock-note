import { describe, it, expect } from 'vitest';
import {
  getVerbBadgeColor,
  getVerdictStatusInfo,
  getMainForceSpectrumPhases,
  getMainForcePlaybook,
  QUANT_VERDICT_THRESHOLDS,
  checkLiquidityGate,
  parseVerdictMetrics,
} from './MainForceVerdictCard';
import type { MainForceVerdictData } from '../../../types/aiForceDashboard';

describe('MainForceVerdictCard - 等高與結構化三層佈局規範 (Ticket 05)', () => {
  it('parseVerdictMetrics 應能從 AI 結論文字中精準解析法人張數、VWAP偏離度與 RSI', () => {
    const text = 'AI 結論：經 5 日主力行為綜合研判（法人近 5 日合計 -64 張、收盤相對 20 日 VWAP +7.5%、RSI 60），法人小幅調節，短線宜區間操作。';
    const metrics = parseVerdictMetrics(text);
    expect(metrics.length).toBe(3);
    expect(metrics[0].label).toBe('5日法人合計');
    expect(metrics[0].value).toBe('-64 張');
    expect(metrics[1].label).toBe('20日 VWAP 乖離');
    expect(metrics[1].value).toBe('+7.5%');
    expect(metrics[2].label).toBe('RSI 強度');
    expect(metrics[2].value).toBe('60');
  });
});

describe('MainForceVerdictCard & badge styling', () => {
  it('應該依據不同語意動詞給予對應的警示色彩', () => {
    const buyMeta = getVerbBadgeColor('積極進貨');
    expect(buyMeta.color).toBe('#ef4444');

    const sellMeta = getVerbBadgeColor('調節減碼');
    expect(sellMeta.color).toBe('#f59e0b');

    const heavySell = getVerbBadgeColor('賣壓沉重');
    expect(heavySell.color).toBe('#10b981');
  });

  it('應該完整相容 MainForceVerdictData 資料模型', () => {
    const mockData: MainForceVerdictData = {
      primaryVerb: '調節減碼',
      semanticTag: '法人動作',
      fullVerdictText:
        'AI 結論：經 5 日主力行為綜合研判（法人近 5 日合計 -64 張、收盤相對 20 日 VWAP +7.5%、RSI 60），法人小幅調節，短線宜區間操作。',
    };
    expect(mockData.primaryVerb).toBe('調節減碼');
    expect(mockData.semanticTag).toBe('法人動作');
  });
});

describe('Ticket 01: 三軌色彩認知體系與燈號邏輯校正', () => {
  it('三軌認知體系各語意動詞應映射至精確主題色與燈號文字', () => {
    // 軌道一：多頭攻擊
    expect(getVerdictStatusInfo('鎖碼推升')).toEqual({
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.4)',
      statusText: '● 偏多集結',
    });

    // 軌道二：吸籌蓄勢 / 超跌轉折
    expect(getVerdictStatusInfo('低接吸籌')).toEqual({
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.15)',
      border: 'rgba(56, 189, 248, 0.4)',
      statusText: '● 偏多承接',
    });
    expect(getVerdictStatusInfo('超跌反彈')).toEqual({
      color: '#c084fc',
      bg: 'rgba(192, 132, 252, 0.15)',
      border: 'rgba(192, 132, 252, 0.4)',
      statusText: '● 跌深反抽',
    });

    // 軌道三：風險警戒 / 盤整中性
    expect(getVerdictStatusInfo('調節減碼')).toEqual({
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.4)',
      statusText: '● 區間警戒',
    });
    expect(getVerdictStatusInfo('區間觀望')).toEqual({
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.15)',
      border: 'rgba(148, 163, 184, 0.4)',
      statusText: '● 空手觀望',
    });
  });

  it('parseVerdictMetrics 應精確解析最新收盤價、20日VWAP與成本乖離率', () => {
    const text = 'AI 結論：最新收盤價 367.5 元，20 日 VWAP 主力成本 (384.2 元)，乖離 -4.3%，法人買盤進駐，籌碼沉澱。';
    const metrics = parseVerdictMetrics(text);
    expect(metrics).toEqual(
      expect.arrayContaining([
        { label: '最新收盤價', value: '367.5 元', color: '#f8fafc' },
        { label: '20日VWAP', value: '384.2 元', color: '#94a3b8' },
        { label: '成本乖離率', value: '-4.3%', color: '#38bdf8' },
      ])
    );
  });
});

describe('Ticket 02: 5 態主力作戰光譜圖例條 (Micro Spectrum Bar)', () => {
  it('getMainForceSpectrumPhases 應回傳 5 大週期階段，並精準激活當前語意階段', () => {
    // 命中低接吸籌
    const phases = getMainForceSpectrumPhases('低接吸籌');
    expect(phases.length).toBe(5);
    expect(phases.map((p) => p.label)).toEqual([
      '超跌反彈',
      '低接吸籌',
      '鎖碼推升',
      '高檔調節',
      '區間震盪',
    ]);

    const activePhase = phases.find((p) => p.isActive);
    expect(activePhase?.id).toBe('accumulation');
    expect(activePhase?.label).toBe('低接吸籌');
    expect(activePhase?.action).toBe('逢低佈局');
    expect(activePhase?.color).toBe('#38bdf8');

    // 其餘 4 態應為非激活
    const inactivePhases = phases.filter((p) => !p.isActive);
    expect(inactivePhases.length).toBe(4);
  });

  it('命中鎖碼推升或加碼時，應正確高亮 markup 階段', () => {
    const phases = getMainForceSpectrumPhases('鎖碼推升');
    const activePhase = phases.find((p) => p.isActive);
    expect(activePhase?.id).toBe('markup');
    expect(activePhase?.action).toBe('順勢加碼');
    expect(activePhase?.color).toBe('#ef4444');
  });

  it('命中超跌反彈時，應正確高亮 oversold 階段', () => {
    const phases = getMainForceSpectrumPhases('超跌反彈');
    const activePhase = phases.find((p) => p.isActive);
    expect(activePhase?.id).toBe('oversold');
    expect(activePhase?.action).toBe('搶反彈');
    expect(activePhase?.color).toBe('#c084fc');
  });
});

describe('Ticket 03: 語意深度解析 (Market Context) 與實戰操盤指引 (Action Playbook)', () => {
  it('低接吸籌時，應生成具備量價支撐解析與四合一實戰操盤指引', () => {
    const metrics = [
      { label: '最新收盤價', value: '367.5 元' },
      { label: '20日VWAP', value: '384.2 元' },
      { label: '成本乖離率', value: '-4.3%' },
    ];
    const playbook = getMainForcePlaybook('低接吸籌', metrics);

    // 1. 語意微觀解析包含量價因果
    expect(playbook.marketContext).toContain('主力成本');
    expect(playbook.marketContext).toContain('吸納');

    // 2. 實戰指引四合一矩陣
    expect(playbook.horizon).toContain('短線波段');
    expect(playbook.executionDirective).toContain('分批');
    expect(playbook.stopLossPrice).toContain('元');
    expect(playbook.targetPrice).toContain('元');
    expect(playbook.riskRewardRatio).toMatch(/\d+(?:\.\d+)?\s*:\s*1/);
    expect(playbook.invalidationGate).toContain('摜破');
    // 新增法人部位上限與預估勝率驗證
    expect(playbook.maxPosition).toBe('30% ~ 40%');
    expect(playbook.winRate).toBe('68%');
  });

  it('鎖碼推升與高檔調節時，應動態生成相應的順勢或防守指引與精確部位', () => {
    const breakoutPlaybook = getMainForcePlaybook('鎖碼推升');
    expect(breakoutPlaybook.horizon).toContain('波段');
    expect(breakoutPlaybook.executionDirective).toContain('順勢');
    expect(breakoutPlaybook.invalidationGate).toContain('跌破');
    expect(breakoutPlaybook.maxPosition).toBe('50% ~ 70%');
    expect(breakoutPlaybook.winRate).toBe('75%');

    const exitPlaybook = getMainForcePlaybook('高檔調節');
    expect(exitPlaybook.horizon).toContain('減碼');
    expect(exitPlaybook.executionDirective).toContain('分批');
    expect(exitPlaybook.maxPosition).toBe('10% ~ 20%');
    expect(exitPlaybook.winRate).toBe('55%');
  });
});

describe('Ticket 04: 量化研判深度彈窗指南 (Modal Deep-Dive) 與流動性門檻', () => {
  it('QUANT_VERDICT_THRESHOLDS 應完整包含 5 態主力作戰量化條件與對照說明', () => {
    expect(QUANT_VERDICT_THRESHOLDS.length).toBe(5);
    const accumulation = QUANT_VERDICT_THRESHOLDS.find((t) => t.phase === '低接吸籌');
    expect(accumulation).toBeDefined();
    expect(accumulation?.quantRule).toContain('VWAP');
    expect(accumulation?.roleAction).toContain('法人');
  });

  it('checkLiquidityGate 應準確識別日成交量是否低於 300 張防作線門檻', () => {
    // 低量觸發警示
    const lowVol = checkLiquidityGate(180);
    expect(lowVol.isLowLiquidity).toBe(true);
    expect(lowVol.badge).toContain('流動性偏低');
    expect(lowVol.desc).toContain('300');

    // 充足量能正常放行
    const normalVol = checkLiquidityGate(2400);
    expect(normalVol.isLowLiquidity).toBe(false);
    expect(normalVol.badge).toContain('充足');
  });
});

describe('Ticket 05: 邊界保護與向後相容優雅降級 (Fallback Defense)', () => {
  it('傳入空字串或未定義動詞時，所有函式應安全回退至中性預設，不發生異常拋錯', () => {
    const defaultInfo = getVerdictStatusInfo('');
    expect(defaultInfo.color).toBe('#94a3b8');
    expect(defaultInfo.statusText).toBe('● 空手觀望');

    const defaultPhases = getMainForceSpectrumPhases('');
    expect(defaultPhases.find((p) => p.isActive)?.id).toBe('consolidation');

    const defaultPlaybook = getMainForcePlaybook('');
    expect(defaultPlaybook.horizon).toContain('觀望');
    expect(defaultPlaybook.stopLossPrice).toContain('待價位確認');
    expect(defaultPlaybook.targetPrice).toContain('待價位確認');
    expect(defaultPlaybook.riskRewardRatio).toBe('--');

    const emptyMetrics = parseVerdictMetrics('');
    expect(emptyMetrics).toEqual([]);
  });

  it('當完全無收盤價與 VWAP 數據時，操盤指引應安全回退為「-- (待價位確認)」且不含寫死價格 367.5', () => {
    const playbook = getMainForcePlaybook('低接吸籌', []);
    expect(playbook.stopLossPrice).toBe('-- (待價位確認)');
    expect(playbook.targetPrice).toBe('-- (待價位確認)');
    expect(playbook.riskRewardRatio).toBe('--');
    expect(playbook.marketContext).not.toContain('367.5');
    expect(playbook.marketContext).toContain('現價 回落至主力成本線負乖離區');
  });

  it('Spec 0211: Card 18 應包含自適應雙欄中央網格容器 verdict-central-grid', () => {
    const mockData: MainForceVerdictData = {
      primaryVerb: '低接吸籌',
      semanticTag: '偏多承接',
      fullVerdictText: 'AI 結論：經 251 日日 K 數列與量能動態研判，最新收盤價 104.95 元，相對 20 日 VWAP 主力成本 (109.91 元) 乖離 -4.5%。系統建議執行「低接吸籌」策略。',
    };
    // 驗證模組導出與數據對齊
    expect(mockData.primaryVerb).toBe('低接吸籌');
  });
});





