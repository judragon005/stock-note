import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GlobalProxyConfigCard } from './GlobalProxyConfigCard';

describe('GlobalProxyConfigCard - 全域代理端點設定卡片', () => {
  it('應正確渲染 Proxy 輸入框、端點值與儲存按鈕', () => {
    const handleSave = vi.fn();
    const handleChange = vi.fn();

    const html = renderToStaticMarkup(
      <GlobalProxyConfigCard
        customProxyUrl="https://custom-proxy.internal.net"
        onCustomProxyUrlChange={handleChange}
        onSaveProxy={handleSave}
      />
    );

    expect(html).toContain('自訂代理伺服器端點 (Proxy URL):');
    expect(html).toContain('https://custom-proxy.internal.net');
    expect(html).toContain('data-testid="input-custom-proxy-url"');
    expect(html).toContain('data-testid="btn-save-proxy-url"');
    expect(html).toContain('儲存代理');
  });
});
