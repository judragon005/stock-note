import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ZavySlowWealthWorkspace } from './ZavySlowWealthWorkspace';

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
});

