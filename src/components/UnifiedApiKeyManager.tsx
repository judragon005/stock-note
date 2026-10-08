import React, { useState, useEffect, useMemo } from 'react';
import {
  ApiKeyItem,
  ProviderType,
  KeyHealthStatus,
  createDefaultApiKeyItem,
} from '../engine/apiKeyPoolTypes';
import {
  loadEncryptedKeyPool,
  saveEncryptedKeyPool,
  maskApiKey,
} from '../engine/apiKeyStorage';
import { probeApiKey, getProbeCooldownRemaining } from '../engine/apiKeyHealthProbe';
import { loadApiKeysConfigFromStorage, saveApiKeysConfigToStorage } from '../utils/storage';
import { ApiKeysConfig } from '../types/stock';
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { GlobalProxyConfigCard } from './GlobalProxyConfigCard';
import { ApiKeyProviderCard, ProviderMetaInfo } from './ApiKeyProviderCard';

export interface UnifiedApiKeyManagerProps {
  initialApiKeys?: ApiKeysConfig;
  onApiKeysChange?: (keys: ApiKeysConfig) => void;
}

export interface ProviderMeta extends ProviderMetaInfo {
  keyName: keyof ApiKeysConfig | null;
}

export const PROVIDER_CONFIGS: Record<ProviderType, ProviderMeta> = {
  finmind: {
    id: 'finmind',
    label: 'FinMind',
    tag: '🇹🇼 台股籌碼 / 財報 / 除權息',
    desc: '台股 10 年歷史除權息與三大法人籌碼，免費帳號 300 次/小時，可註冊多組輪替。',
    defaultQuota: 300,
    docUrl: 'https://finmind.github.io/',
    keyName: 'finmindToken',
  },
  finnhub: {
    id: 'finnhub',
    label: 'Finnhub',
    tag: '🇺🇸 美股即時行情 / 事件',
    desc: '美股即時報價與市場新聞事件，免費層 60 次/分鐘，免信用卡快速申請。',
    defaultQuota: 1000,
    docUrl: 'https://finnhub.io/',
    keyName: null,
  },
  fmp: {
    id: 'fmp',
    label: 'FMP (Financial Modeling Prep)',
    tag: '🇺🇸 美股官方財報 / 股利 / 分割',
    desc: '全市場美股歷史股利、分割與季度三表財報數據。',
    defaultQuota: 250,
    docUrl: 'https://site.financialmodelingprep.com/',
    keyName: 'fmpApiKey',
  },
  fred: {
    id: 'fred',
    label: 'FRED (聯準會總經)',
    tag: '🏛️ 聯準會官方利率 / 總經',
    desc: '聖路易斯聯邦儲備銀行官方經濟數據、10年期美債利率與通膨指標。',
    defaultQuota: 2000,
    docUrl: 'https://fred.stlouisfed.org/docs/api/api_key.html',
    keyName: null,
  },
  coingecko: {
    id: 'coingecko',
    label: 'CoinGecko',
    tag: '🪙 加密貨幣 / 穩定幣',
    desc: '全球主流加密資產即時價格與市場行情，免費 30 次/分鐘。',
    defaultQuota: 500,
    docUrl: 'https://www.coingecko.com/en/api',
    keyName: null,
  },
  sec: {
    id: 'sec',
    label: 'SEC EDGAR',
    tag: '📑 美股官方 10-K/10-Q 財報',
    desc: '美國證券交易委員會官方開放端點，系統自帶合規 User-Agent，永久免費無需 Key。',
    defaultQuota: -1,
    keyName: null,
  },
  polygon: {
    id: 'polygon',
    label: 'Polygon.io',
    tag: '🇺🇸 美股盤後備援',
    desc: '美股歷史日 K 與即時報價備援端點，免費 5 次/分鐘。',
    defaultQuota: 200,
    docUrl: 'https://polygon.io/',
    keyName: null,
  },
  alphavantage: {
    id: 'alphavantage',
    label: 'Alpha Vantage',
    tag: '🌐 外匯 / 貨幣對備援',
    desc: '全球外匯即時牌告匯率與總經技術指標備援端點。',
    defaultQuota: 25,
    docUrl: 'https://www.alphavantage.co/support/#api-key',
    keyName: 'alphaVantageKey',
  },
};

export const DISPLAYED_PROVIDERS: ProviderType[] = [
  'finmind',
  'finnhub',
  'fmp',
  'fred',
  'coingecko',
  'sec',
  'alphavantage',
];

export const UnifiedApiKeyManager: React.FC<UnifiedApiKeyManagerProps> = ({
  initialApiKeys,
  onApiKeysChange,
}) => {
  // 1. 金鑰池與設定狀態
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('finmind');
  const [apiKeysConfig, setApiKeysConfig] = useState<ApiKeysConfig>(() => {
    return initialApiKeys || loadApiKeysConfigFromStorage();
  });

  // 2. 顯示/隱藏密碼狀態 (以 field key 管理)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // 3. 全域 Proxy 狀態
  const [customProxyUrl, setCustomProxyUrl] = useState<string>(() => {
    return apiKeysConfig.customProxyUrl || '';
  });

  // 4. 新增金鑰表單狀態
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newAliasInput, setNewAliasInput] = useState('');
  const [customQuotaInput, setCustomQuotaInput] = useState('');

  // 5. 探針測活與冷卻狀態
  const [isProbing, setIsProbing] = useState<Record<string, boolean>>({});
  const [probeResults, setProbeResults] = useState<Record<string, { status: KeyHealthStatus; message: string }>>({});
  const [cooldownSecs, setCooldownSecs] = useState<Record<string, number>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 初始化載入加密金鑰池
  useEffect(() => {
    loadEncryptedKeyPool().then((loaded) => {
      setKeys(loaded);
    });
  }, []);

  // 外部 props 變更時同步
  useEffect(() => {
    if (initialApiKeys) {
      setApiKeysConfig(initialApiKeys);
      if (initialApiKeys.customProxyUrl !== undefined) {
        setCustomProxyUrl(initialApiKeys.customProxyUrl);
      }
    }
  }, [initialApiKeys]);

  // 每秒更新各金鑰探針冷卻倒數
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const updatedCooldowns: Record<string, number> = {};
      let hasActiveCooldown = false;

      for (const k of keys) {
        const remaining = getProbeCooldownRemaining(k.provider, k.key, now);
        if (remaining > 0) {
          updatedCooldowns[k.id] = remaining;
          hasActiveCooldown = true;
        }
      }

      setCooldownSecs(hasActiveCooldown ? updatedCooldowns : {});
    }, 1000);

    return () => clearInterval(timer);
  }, [keys]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 當前選中供應商之金鑰清單
  const filteredKeys = useMemo(() => {
    return keys.filter((k) => k.provider === selectedProvider);
  }, [keys, selectedProvider]);

  // 當前選中供應商之主要作用金鑰 (取池首或舊版配置)
  const currentProviderMeta = PROVIDER_CONFIGS[selectedProvider];
  const primaryKeyFromPool = filteredKeys[0]?.key;
  const legacyKey = currentProviderMeta.keyName ? (apiKeysConfig[currentProviderMeta.keyName] as string | undefined) : undefined;
  const effectivePrimaryKeyValue = primaryKeyFromPool || legacyKey || '';

  // 儲存全域 Proxy 設定
  const handleSaveProxy = () => {
    const updated: ApiKeysConfig = {
      ...apiKeysConfig,
      customProxyUrl: customProxyUrl.trim() || undefined,
    };
    setApiKeysConfig(updated);
    saveApiKeysConfigToStorage(updated);
    onApiKeysChange?.(updated);
    showToast('自訂代理伺服器端點已更新儲存');
  };

  // 快速更新主要作用金鑰 (雙向同步：寫入 apiKeysConfig 同時提為金鑰池首位)
  const handleUpdatePrimaryKey = async (newVal: string) => {
    const trimmed = newVal.trim();
    const updatedConfig: ApiKeysConfig = { ...apiKeysConfig };
    if (currentProviderMeta.keyName) {
      if (trimmed) {
        (updatedConfig as any)[currentProviderMeta.keyName] = trimmed;
      } else {
        delete (updatedConfig as any)[currentProviderMeta.keyName];
      }
      setApiKeysConfig(updatedConfig);
      saveApiKeysConfigToStorage(updatedConfig);
      onApiKeysChange?.(updatedConfig);
    }

    if (!trimmed) {
      // 若清空主要金鑰且池中有金鑰，移除首位
      if (filteredKeys.length > 0) {
        const targetId = filteredKeys[0].id;
        const newPool = keys.filter((k) => k.id !== targetId);
        setKeys(newPool);
        await saveEncryptedKeyPool(newPool);
      }
      showToast(`已清空 ${currentProviderMeta.label} 主要金鑰`);
      return;
    }

    // 若池中已存在該金鑰，提至首位；若不存在，新建並插至首位
    const existingIndex = keys.findIndex((k) => k.provider === selectedProvider && k.key === trimmed);
    let newPool: ApiKeyItem[];

    if (existingIndex >= 0) {
      const existing = keys[existingIndex];
      const rest = keys.filter((_, idx) => idx !== existingIndex);
      const otherProviders = rest.filter((k) => k.provider !== selectedProvider);
      const sameProviders = rest.filter((k) => k.provider === selectedProvider);
      newPool = [...otherProviders, existing, ...sameProviders];
    } else {
      const newItem = createDefaultApiKeyItem(selectedProvider, trimmed, {
        alias: '主要金鑰',
        dailyQuotaLimit: currentProviderMeta.defaultQuota,
      });
      const otherProviders = keys.filter((k) => k.provider !== selectedProvider);
      const sameProviders = keys.filter((k) => k.provider === selectedProvider);
      newPool = [...otherProviders, newItem, ...sameProviders];
    }

    setKeys(newPool);
    await saveEncryptedKeyPool(newPool);
    showToast(`已儲存 ${currentProviderMeta.label} 主要金鑰並同步至金鑰池`);
  };

  // 新增備援金鑰至池中
  const handleAddKeyToPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyInput.trim()) return;

    const trimmed = newKeyInput.trim();
    const quota = customQuotaInput.trim() ? parseInt(customQuotaInput, 10) || currentProviderMeta.defaultQuota : currentProviderMeta.defaultQuota;

    const newItem = createDefaultApiKeyItem(selectedProvider, trimmed, {
      alias: newAliasInput.trim() || undefined,
      dailyQuotaLimit: quota,
    });

    const updated = [...keys, newItem];
    setKeys(updated);
    await saveEncryptedKeyPool(updated);

    // 若目前無主要金鑰，首組新增的金鑰自動同步為主要金鑰
    if (currentProviderMeta.keyName && !apiKeysConfig[currentProviderMeta.keyName]) {
      const updatedConfig: ApiKeysConfig = {
        ...apiKeysConfig,
        [currentProviderMeta.keyName]: trimmed,
      };
      setApiKeysConfig(updatedConfig);
      saveApiKeysConfigToStorage(updatedConfig);
      onApiKeysChange?.(updatedConfig);
    }

    setNewKeyInput('');
    setNewAliasInput('');
    setCustomQuotaInput('');
    showToast(`已新增 ${currentProviderMeta.label} 備援金鑰至輪替池`);
  };

  // 設為主要金鑰 (置頂於該 provider)
  const handlePromoteToPrimary = async (item: ApiKeyItem) => {
    const otherProviders = keys.filter((k) => k.provider !== item.provider);
    const sameProviders = keys.filter((k) => k.provider === item.provider && k.id !== item.id);
    const newPool = [...otherProviders, item, ...sameProviders];

    setKeys(newPool);
    await saveEncryptedKeyPool(newPool);

    if (currentProviderMeta.keyName) {
      const updatedConfig: ApiKeysConfig = {
        ...apiKeysConfig,
        [currentProviderMeta.keyName]: item.key,
      };
      setApiKeysConfig(updatedConfig);
      saveApiKeysConfigToStorage(updatedConfig);
      onApiKeysChange?.(updatedConfig);
    }

    showToast(`已將 [${item.alias || maskApiKey(item.key)}] 設為 ${currentProviderMeta.label} 主要金鑰`);
  };

  // 刪除金鑰
  const handleDeleteKey = async (id: string) => {
    const deletingItem = keys.find((k) => k.id === id);
    const updated = keys.filter((k) => k.id !== id);
    setKeys(updated);
    await saveEncryptedKeyPool(updated);

    // 若刪除的是主要金鑰，將池中下一個金鑰遞補為主要，或清空
    if (deletingItem && currentProviderMeta.keyName && apiKeysConfig[currentProviderMeta.keyName] === deletingItem.key) {
      const nextKey = updated.find((k) => k.provider === deletingItem.provider)?.key || undefined;
      const updatedConfig: ApiKeysConfig = {
        ...apiKeysConfig,
        [currentProviderMeta.keyName]: nextKey,
      };
      setApiKeysConfig(updatedConfig);
      saveApiKeysConfigToStorage(updatedConfig);
      onApiKeysChange?.(updatedConfig);
    }

    showToast('已安全移除金鑰');
  };

  // 單鍵測活
  const handleProbeKey = async (item: ApiKeyItem) => {
    setIsProbing((prev) => ({ ...prev, [item.id]: true }));
    try {
      const res = await probeApiKey(item.provider, item.key, fetch, { enforceCooldown: true });
      setProbeResults((prev) => ({
        ...prev,
        [item.id]: { status: res.status, message: res.message },
      }));
    } finally {
      setIsProbing((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  return (
    <div
      id="unified-api-key-manager-section"
      data-testid="unified-api-key-manager"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(20, 30, 55, 0.9) 100%)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        boxSizing: 'border-box',
        color: '#f8fafc',
      }}
    >
      {/* 1. 頂部資訊列：標題、256-bit 加密徽章與全域說明 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <KeyRound size={22} color="#60a5fa" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '0.02em' }}>
                外部金融 API 整合控制台
              </h3>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34d399',
                  fontWeight: 700,
                }}
              >
                <ShieldCheck size={12} />
                Web Crypto 256-bit 保護中
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0 0', lineHeight: 1.5 }}>
              整合主要作用金鑰、多帳號輪替池 (Round-Robin) 與單鍵健康探針，徹底消滅重複輸入。所有金鑰均儲存於本機瀏覽器，絕不外洩。
            </p>
          </div>
        </div>

        {toastMsg && (
          <div
            data-testid="api-key-toast"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={14} />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>

      {/* 2. 全域反向代理伺服器 (Proxy URL) 配置列 */}
      <GlobalProxyConfigCard
        customProxyUrl={customProxyUrl}
        onCustomProxyUrlChange={setCustomProxyUrl}
        onSaveProxy={handleSaveProxy}
      />

      {/* 3. 供應商選擇頁籤 (Tab 標籤列) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
          gap: '8px',
        }}
      >
        {DISPLAYED_PROVIDERS.map((p) => {
          const config = PROVIDER_CONFIGS[p];
          const count = keys.filter((k) => k.provider === p).length;
          const isSelected = selectedProvider === p;

          return (
            <button
              key={p}
              type="button"
              data-testid={`tab-provider-${p}`}
              onClick={() => setSelectedProvider(p)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '8px 12px',
                borderRadius: '8px',
                border: isSelected
                  ? '1px solid rgba(59, 130, 246, 0.6)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(30, 58, 138, 0.3) 100%)'
                  : 'rgba(15, 23, 42, 0.5)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isSelected ? '#60a5fa' : '#e2e8f0' }}>
                  {config.label}
                </span>
                {p !== 'sec' && (
                  <span
                    style={{
                      fontSize: '0.62rem',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: count > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                      color: count > 0 ? '#34d399' : '#94a3b8',
                      fontWeight: 700,
                    }}
                  >
                    {count} 組
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: '0.66rem',
                  color: isSelected ? '#93c5fd' : '#64748b',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {config.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. 供應商專屬卡片 (合一管理面版) */}
      <ApiKeyProviderCard
        providerMeta={currentProviderMeta}
        selectedProvider={selectedProvider}
        effectivePrimaryKeyValue={effectivePrimaryKeyValue}
        filteredKeys={filteredKeys}
        showKeys={showKeys}
        toggleShowKey={toggleShowKey}
        onUpdatePrimaryKey={handleUpdatePrimaryKey}
        newKeyInput={newKeyInput}
        setNewKeyInput={setNewKeyInput}
        newAliasInput={newAliasInput}
        setNewAliasInput={setNewAliasInput}
        customQuotaInput={customQuotaInput}
        setCustomQuotaInput={setCustomQuotaInput}
        onAddKeyToPool={handleAddKeyToPool}
        onPromoteToPrimary={handlePromoteToPrimary}
        onDeleteKey={handleDeleteKey}
        onProbeKey={handleProbeKey}
        isProbing={isProbing}
        probeResults={probeResults}
        cooldownSecs={cooldownSecs}
      />

      {/* 5. 底部隱私保護聲明 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: '#94a3b8' }}>
        <ShieldAlert size={14} color="#94a3b8" />
        <span>
          隱私保護保證：所有外部 API 金鑰均儲存在您瀏覽器的本機 LocalStorage 與 IndexedDB 加密儲存區中，絕不傳送至任何中央伺服器。
        </span>
      </div>
    </div>
  );
};
