import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiKeyProviderCard } from './ApiKeyProviderCard';
import { PROVIDER_CONFIGS } from './UnifiedApiKeyManager';
import { createDefaultApiKeyItem } from '../engine/apiKeyPoolTypes';

describe('ApiKeyProviderCard - 通用金鑰供應商配置呈現元件', () => {
  it('對於 SEC EDGAR 應呈現免 Key 官方全透明開放端點提示', () => {
    const html = renderToStaticMarkup(
      <ApiKeyProviderCard
        providerMeta={PROVIDER_CONFIGS.sec}
        selectedProvider="sec"
        effectivePrimaryKeyValue=""
        filteredKeys={[]}
        showKeys={{}}
        toggleShowKey={vi.fn()}
        onUpdatePrimaryKey={vi.fn()}
        newKeyInput=""
        setNewKeyInput={vi.fn()}
        newAliasInput=""
        setNewAliasInput={vi.fn()}
        customQuotaInput=""
        setCustomQuotaInput={vi.fn()}
        onAddKeyToPool={vi.fn()}
        onPromoteToPrimary={vi.fn()}
        onDeleteKey={vi.fn()}
        onProbeKey={vi.fn()}
        isProbing={{}}
        probeResults={{}}
        cooldownSecs={{}}
      />
    );

    expect(html).toContain('SEC EDGAR 官方全透明開放端點');
    expect(html).toContain('永久免費無需 Key');
  });

  it('對於 FinMind 應呈現主要金鑰輸入、輪替表單與金鑰列表', () => {
    const mockKeyItem = createDefaultApiKeyItem('finmind', 'token_12345678', {
      alias: '首選金鑰',
      dailyQuotaLimit: 300,
    });

    const html = renderToStaticMarkup(
      <ApiKeyProviderCard
        providerMeta={PROVIDER_CONFIGS.finmind}
        selectedProvider="finmind"
        effectivePrimaryKeyValue="token_12345678"
        filteredKeys={[mockKeyItem]}
        showKeys={{}}
        toggleShowKey={vi.fn()}
        onUpdatePrimaryKey={vi.fn()}
        newKeyInput=""
        setNewKeyInput={vi.fn()}
        newAliasInput=""
        setNewAliasInput={vi.fn()}
        customQuotaInput=""
        setCustomQuotaInput={vi.fn()}
        onAddKeyToPool={vi.fn()}
        onPromoteToPrimary={vi.fn()}
        onDeleteKey={vi.fn()}
        onProbeKey={vi.fn()}
        isProbing={{}}
        probeResults={{}}
        cooldownSecs={{}}
      />
    );

    expect(html).toContain('data-testid="card-provider-finmind"');
    expect(html).toContain('當前主要作用金鑰 (Primary Active Key)');
    expect(html).toContain('token_12345678');
    expect(html).toContain('新增備援金鑰至輪替池');
    expect(html).toContain('★ 主要金鑰');
    expect(html).toContain('首選金鑰');
  });
});
