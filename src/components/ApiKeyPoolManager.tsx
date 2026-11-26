import React, { useState, useEffect } from 'react';
import {
  ApiKeyItem,
  ProviderType,
  KeyHealthStatus,
  createDefaultApiKeyItem,
  computeKeyHealthStatus,
} from '../engine/apiKeyPoolTypes';
import {
  loadEncryptedKeyPool,
  saveEncryptedKeyPool,
  maskApiKey,
} from '../engine/apiKeyStorage';
import { probeApiKey, getProbeCooldownRemaining } from '../engine/apiKeyHealthProbe';
import { KeyRound, Plus, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';

const PROVIDER_NAMES: Record<ProviderType, { label: string; desc: string; defaultQuota: number }> = {
  finmind: { label: 'FinMind (台股籌碼/財報)', desc: '免費帳號 300 次/小時，可註冊多組帳號', defaultQuota: 300 },
  finnhub: { label: 'Finnhub (美股即時行情/事件)', desc: '免費層 60 次/分鐘，免信用卡', defaultQuota: 1000 },
  fred: { label: 'FRED (聯準會總經/無風險利率)', desc: '免費 120 次/分鐘，官方權威數據', defaultQuota: 2000 },
  polygon: { label: 'Polygon.io (美股盤後備援)', desc: '免費 5 次/分鐘', defaultQuota: 200 },
  coingecko: { label: 'CoinGecko (加密貨幣/穩定幣)', desc: '免費 30 次/分鐘', defaultQuota: 500 },
  sec: { label: 'SEC EDGAR (美股官方財報)', desc: '100% 免費無 Key (需合規 User-Agent)', defaultQuota: -1 },
  fmp: { label: 'FMP (美股官方財報/股利)', desc: '全市場美股歷史股利與三表財報', defaultQuota: 250 },
  alphavantage: { label: 'Alpha Vantage (外匯/總經)', desc: '全球外匯牌告與總經備援', defaultQuota: 25 },
  tiingo: { label: 'Tiingo (美股日 K/除息拆股備援)', desc: '免費層 500 次/日，官方精準行情', defaultQuota: 500 },
};

export const ApiKeyPoolManager: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('finmind');
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newAliasInput, setNewAliasInput] = useState('');
  const [customQuotaInput, setCustomQuotaInput] = useState('');
  const [isProbing, setIsProbing] = useState<Record<string, boolean>>({});
  const [probeResults, setProbeResults] = useState<Record<string, { status: KeyHealthStatus; message: string }>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [cooldownSecs, setCooldownSecs] = useState<Record<string, number>>({});

  useEffect(() => {
    loadEncryptedKeyPool().then((loaded) => {
      setKeys(loaded);
    });
  }, []);

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

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyInput.trim()) return;

    const defaultQ = PROVIDER_NAMES[selectedProvider].defaultQuota;
    const quota = customQuotaInput.trim() ? parseInt(customQuotaInput, 10) || defaultQ : defaultQ;

    const newItem = createDefaultApiKeyItem(selectedProvider, newKeyInput.trim(), {
      alias: newAliasInput.trim() || undefined,
      dailyQuotaLimit: quota,
    });

    const updated = [...keys, newItem];
    setKeys(updated);
    await saveEncryptedKeyPool(updated);

    setNewKeyInput('');
    setNewAliasInput('');
    setCustomQuotaInput('');
    showToast(`已新增 ${PROVIDER_NAMES[selectedProvider].label} 金鑰`);
  };

  const handleDeleteKey = async (id: string) => {
    const updated = keys.filter((k) => k.id !== id);
    setKeys(updated);
    await saveEncryptedKeyPool(updated);
    showToast('已安全移除金鑰');
  };

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

  const filteredKeys = keys.filter((k) => k.provider === selectedProvider);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '0.78rem',
    color: 'var(--text-primary)',
    outline: 'none',
  };

  const resolveHealthDotColor = (health: KeyHealthStatus): string => {
    if (health === 'HEALTHY') return '#34d399';
    if (health === 'COOLING_DOWN') return '#fbbf24';
    if (health === 'QUOTA_EXHAUSTED') return '#f97316';
    return '#f43f5e';
  };

  return (
    <div
      id="api-key-pool-section"
      className="glass-card"
      style={{
        padding: '24px',
        marginBottom: '32px',
        borderRadius: '16px',
      }}
    >
      {/* 標題與簡介 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <KeyRound size={24} />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              外部金融 API 金鑰池管理 (API Key Pool)
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  color: '#34d399',
                  fontWeight: 600,
                }}
              >
                本機加密保護
              </span>
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              支援註冊多組免費帳號金鑰，自動輪替調度 (Round-Robin) 與 429 限流退避。連線測試設有 30 秒冷卻保護避免消耗外部呼叫配額。
            </p>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#6ee7b7',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          {toastMsg}
        </div>
      )}

      {/* 供應商選擇頁籤 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
          gap: '8px',
          marginBottom: '24px',
        }}
      >
        {(Object.keys(PROVIDER_NAMES) as ProviderType[]).map((p) => {
          const count = keys.filter((k) => k.provider === p).length;
          const isSelected = selectedProvider === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedProvider(p)}
              style={{
                padding: '12px',
                borderRadius: '12px',
                textAlign: 'left',
                border: isSelected
                  ? '1px solid rgba(99, 102, 241, 0.55)'
                  : '1px solid rgba(51, 65, 85, 0.6)',
                background: isSelected ? 'rgba(79, 70, 229, 0.22)' : 'rgba(30, 41, 59, 0.45)',
                color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {PROVIDER_NAMES[p].label.split(' ')[0]}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {count} 組金鑰
              </div>
            </button>
          );
        })}
      </div>

      {/* 新增金鑰表單 */}
      {selectedProvider !== 'sec' && (
        <form
          onSubmit={handleAddKey}
          style={{
            background: 'rgba(2, 6, 23, 0.45)',
            borderRadius: '12px',
            border: '1px solid rgba(51, 65, 85, 0.6)',
            padding: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#cbd5e1',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span>新增 {PROVIDER_NAMES[selectedProvider].label} 金鑰</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {PROVIDER_NAMES[selectedProvider].desc}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(200px, 5fr) minmax(140px, 3fr) minmax(110px, 2fr) auto',
              gap: '12px',
              alignItems: 'stretch',
            }}
          >
            <input
              type="text"
              value={newKeyInput}
              onChange={(e) => setNewKeyInput(e.target.value)}
              placeholder="貼上 API Token / Key..."
              style={inputStyle}
              required
            />
            <input
              type="text"
              value={newAliasInput}
              onChange={(e) => setNewAliasInput(e.target.value)}
              placeholder="別名 (例: 個人帳號 1)"
              style={inputStyle}
            />
            <input
              type="number"
              value={customQuotaInput}
              onChange={(e) => setCustomQuotaInput(e.target.value)}
              placeholder={`單日上限 (${PROVIDER_NAMES[selectedProvider].defaultQuota})`}
              style={inputStyle}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: '8px 14px',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={14} />
              加入金鑰池
            </button>
          </div>
        </form>
      )}

      {/* 金鑰清單 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {selectedProvider === 'sec' ? (
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#34d399',
              fontSize: '0.78rem',
            }}
          >
            💡 SEC EDGAR 為美國證券交易委員會官方開放端點，系統已自帶合規 User-Agent 認證，無需設定任何 API Key 即可永久免費享受完整 10-K/10-Q 財報。
          </div>
        ) : filteredKeys.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              borderRadius: '12px',
              background: 'rgba(2, 6, 23, 0.25)',
              border: '1px dashed rgba(51, 65, 85, 0.7)',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
            }}
          >
            尚未新增 {PROVIDER_NAMES[selectedProvider].label} 的 API Key。請於上方表單新增以加入輪替池。
          </div>
        ) : (
          filteredKeys.map((item) => {
            const probe = probeResults[item.id];
            const currentHealth = probe?.status || computeKeyHealthStatus(item);
            const probing = isProbing[item.id];
            const cooldown = cooldownSecs[item.id] || 0;

            return (
              <div
                key={item.id}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'rgba(30, 41, 59, 0.45)',
                  border: '1px solid rgba(51, 65, 85, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* 狀態燈號 */}
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '999px',
                      flexShrink: 0,
                      backgroundColor: resolveHealthDotColor(currentHealth),
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="mono" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' }}>
                        {maskApiKey(item.key)}
                      </span>
                      {item.alias && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'rgba(51, 65, 85, 0.7)',
                            color: '#cbd5e1',
                          }}
                        >
                          {item.alias}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>今日調用: {item.totalRequestsToday} 次</span>
                      <span>上限: {item.dailyQuotaLimit === -1 ? '無限制' : `${item.dailyQuotaLimit} 次`}</span>
                      {probe && (
                        <span style={{ color: currentHealth === 'HEALTHY' ? '#34d399' : '#fbbf24' }}>
                          {probe.message}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleProbeKey(item)}
                    disabled={probing || cooldown > 0}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: probing || cooldown > 0 ? 'not-allowed' : 'pointer',
                      background: cooldown > 0 ? 'rgba(30, 41, 59, 0.8)' : 'rgba(51, 65, 85, 0.5)',
                      color: cooldown > 0 ? 'var(--text-muted)' : '#cbd5e1',
                      border: '1px solid rgba(71, 85, 105, 0.5)',
                    }}
                    title={cooldown > 0 ? `防連點保護中，剩餘 ${cooldown} 秒` : '測試連線 (消耗 1 次請求)'}
                  >
                    <RefreshCw size={14} />
                    <span>{probing ? '檢測中' : cooldown > 0 ? `冷卻 (${cooldown}s)` : '測試'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteKey(item.id)}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(244, 63, 94, 0.12)',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                      color: '#fb7185',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="移除金鑰"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
