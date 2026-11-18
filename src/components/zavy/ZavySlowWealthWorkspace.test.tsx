import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ZavySlowWealthWorkspace } from './ZavySlowWealthWorkspace';
import { saveMacroPulseRecord, sanitizeMacroRecord } from '../../utils/macroPulseStorage';

describe('ZavySlowWealthWorkspace (慢富工作區導覽與整合測試)', () => {
  it('[Spec 0223 / Ticket 01] ZavySlowWealthWorkspace 頂部應提供「新手 30 秒慢富導覽」按鈕與三步驟白話心法卡', () => {
    const collapsedHtml = renderToStaticMarkup(
      <ZavySlowWealthWorkspace holdings={[]} accounts={[]} totalNavTwd={1000000} />
    );
    expect(collapsedHtml).toContain('新手 30 秒慢富導覽');
    expect(collapsedHtml).not.toContain('第一步：看天氣（鏡頭一）');

    const expandedHtml = renderToStaticMarkup(
      <ZavySlowWealthWorkspace
        holdings={[]}
        accounts={[]}
        totalNavTwd={1000000}
        initialShowBeginnerGuide={true}
      />
    );
    expect(expandedHtml).toContain('第一步：看天氣（鏡頭一）');
    expect(expandedHtml).toContain('第二步：量體溫（鏡頭二）');
    expect(expandedHtml).toContain('第三步：穿防彈衣（鏡頭三）');
  });

  it('[Spec 0235 Ticket 09] 啟動時應融合 getLatestMacroPulseRecord 本地快照與美股多週期寬度，並提供真實校準入口', () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
      saveMacroPulseRecord(
        sanitizeMacroRecord({
          date: '2026-11-18',
          us10y: 4.44,
          usIsmPmi: 52.8,
          multiHorizonBreadth: {
            tw: { breadth20: 54, breadth60: 49, breadth200: 62 },
            us: { breadth20: 66, breadth60: 61, breadth200: 70 },
          },
        }),
        true
      );
    }

    const html = renderToStaticMarkup(
      <ZavySlowWealthWorkspace holdings={[]} accounts={[]} totalNavTwd={1000000} />
    );
    expect(html).toContain('10 秒快速校準');
    expect(html).toContain('美股');
    if (typeof localStorage !== 'undefined') {
      expect(html).toContain('66');
    }
  });
});

