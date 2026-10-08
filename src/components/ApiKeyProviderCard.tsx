import React from 'react';
import {
  ApiKeyItem,
  ProviderType,
  KeyHealthStatus,
  computeKeyHealthStatus,
} from '../engine/apiKeyPoolTypes';
import { maskApiKey } from '../engine/apiKeyStorage';
import {
  Star,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';

export interface ProviderMetaInfo {
  id: ProviderType;
  label: string;
  tag: string;
  desc: string;
  defaultQuota: number;
  docUrl?: string;
}

export interface ApiKeyProviderCardProps {
  providerMeta: ProviderMetaInfo;
  selectedProvider: ProviderType;
  effectivePrimaryKeyValue: string;
  filteredKeys: ApiKeyItem[];
  showKeys: Record<string, boolean>;
  toggleShowKey: (id: string) => void;
  onUpdatePrimaryKey: (newVal: string) => void;
  newKeyInput: string;
  setNewKeyInput: (val: string) => void;
  newAliasInput: string;
  setNewAliasInput: (val: string) => void;
  customQuotaInput: string;
  setCustomQuotaInput: (val: string) => void;
  onAddKeyToPool: (e: React.FormEvent) => void;
  onPromoteToPrimary: (item: ApiKeyItem) => void;
  onDeleteKey: (id: string) => void;
  onProbeKey: (item: ApiKeyItem) => void;
  isProbing: Record<string, boolean>;
  probeResults: Record<string, { status: KeyHealthStatus; message: string }>;
  cooldownSecs: Record<string, number>;
}

export const ApiKeyProviderCard: React.FC<ApiKeyProviderCardProps> = ({
  providerMeta,
  selectedProvider,
  effectivePrimaryKeyValue,
  filteredKeys,
  showKeys,
  toggleShowKey,
  onUpdatePrimaryKey,
  newKeyInput,
  setNewKeyInput,
  newAliasInput,
  setNewAliasInput,
  customQuotaInput,
  setCustomQuotaInput,
  onAddKeyToPool,
  onPromoteToPrimary,
  onDeleteKey,
  onProbeKey,
  isProbing,
  probeResults,
  cooldownSecs,
}) => {
  return (
    <div
      data-testid={`card-provider-${selectedProvider}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        borderRadius: '12px',
        padding: '16px',
      }}
    >
      {/* 供應商功能描述與申請指引 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc' }}>
            {providerMeta.tag}
          </div>
          <p style={{ fontSize: '0.73rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
            {providerMeta.desc}
          </p>
        </div>
        {providerMeta.docUrl && (
          <a
            href={providerMeta.docUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '0.72rem',
              color: '#38bdf8',
              textDecoration: 'none',
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              fontWeight: 600,
            }}
          >
            官方申請指南 ↗
          </a>
        )}
      </div>

      {selectedProvider === 'sec' ? (
        <div
          style={{
            padding: '16px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#34d399',
            fontSize: '0.8rem',
            lineHeight: 1.6,
          }}
        >
          💡 <b>SEC EDGAR 官方全透明開放端點</b>：系統已內建符合美國證管會規範之合規識別標頭（<code>StockTracker/1.0 User-Agent</code>），無需註冊或設定任何 API Key，即可永久免費查閱所有美股上市公司之 10-K / 10-Q 原始財報與營收數據。
        </div>
      ) : (
        <>
          {/* 4.1 快速主要作用金鑰 (Primary Active Key) */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Star size={14} color="#fbbf24" fill="#fbbf24" />
                當前主要作用金鑰 (Primary Active Key)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => toggleShowKey(`primary_${selectedProvider}`)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                >
                  {showKeys[`primary_${selectedProvider}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type={showKeys[`primary_${selectedProvider}`] ? 'text' : 'password'}
                data-testid="input-primary-key"
                defaultValue={effectivePrimaryKeyValue}
                key={`${selectedProvider}_${effectivePrimaryKeyValue}`}
                placeholder={`請輸入或貼上 ${providerMeta.label} API Key / Token...`}
                onBlur={(e) => onUpdatePrimaryKey(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '0.8rem',
                  color: '#f8fafc',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
            </div>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              ※ 支援雙向連動：此處輸入將自動作為預設優先金鑰，並同步登記至金鑰池首位。
            </span>
          </div>

          {/* 4.2 ➕ 新增輪替備援金鑰表單 */}
          <form
            onSubmit={onAddKeyToPool}
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px dashed rgba(59, 130, 246, 0.3)',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#cbd5e1' }}>
              ➕ 新增備援金鑰至輪替池 (支援多帳號調度)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) 120px 100px', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                data-testid="input-new-pool-key"
                value={newKeyInput}
                onChange={(e) => setNewKeyInput(e.target.value)}
                placeholder="輸入第二組以上的 Token..."
                required
                style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.78rem',
                  color: '#f8fafc',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
              <input
                type="text"
                data-testid="input-new-pool-alias"
                value={newAliasInput}
                onChange={(e) => setNewAliasInput(e.target.value)}
                placeholder="別名 (例: 備用帳號 2)"
                style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.78rem',
                  color: '#f8fafc',
                  outline: 'none',
                }}
              />
              <input
                type="number"
                data-testid="input-new-pool-quota"
                value={customQuotaInput}
                onChange={(e) => setCustomQuotaInput(e.target.value)}
                placeholder={`配額 (${providerMeta.defaultQuota})`}
                style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.78rem',
                  color: '#f8fafc',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                data-testid="btn-add-pool-key"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Plus size={14} />
                加入輪替池
              </button>
            </div>
          </form>

          {/* 4.3 金鑰池清單與測活狀態 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8' }}>
                目前已註冊金鑰清單 ({filteredKeys.length} 組)
              </span>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                系統遭遇 429 限流時將自動切換下一組有效金鑰
              </span>
            </div>

            {filteredKeys.length === 0 ? (
              <div
                data-testid="empty-keys-notice"
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  color: '#64748b',
                  fontSize: '0.78rem',
                }}
              >
                尚未登記 {providerMeta.label} 金鑰。請於上方主要金鑰框或新增表單中輸入以啟用。
              </div>
            ) : (
              filteredKeys.map((item, idx) => {
                const isPrimary = idx === 0;
                const probe = probeResults[item.id];
                const currentHealth = probe?.status || computeKeyHealthStatus(item);
                const probing = isProbing[item.id];
                const cooldown = cooldownSecs[item.id] || 0;

                return (
                  <div
                    key={item.id}
                    data-testid={`key-item-${item.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: isPrimary ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.5)',
                      border: isPrimary
                        ? '1px solid rgba(59, 130, 246, 0.4)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    {/* 左側：狀態燈號、遮罩 Token 與別名 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* 狀態指示燈 */}
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background:
                            currentHealth === 'HEALTHY'
                              ? '#10b981'
                              : currentHealth === 'COOLING_DOWN'
                              ? '#f59e0b'
                              : currentHealth === 'QUOTA_EXHAUSTED'
                              ? '#f97316'
                              : '#ef4444',
                          boxShadow: currentHealth === 'HEALTHY' ? '0 0 6px #10b981' : 'none',
                        }}
                      />

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                            {maskApiKey(item.key)}
                          </span>
                          {item.alias && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: '#cbd5e1',
                              }}
                            >
                              {item.alias}
                            </span>
                          )}
                          {isPrimary && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(245, 158, 11, 0.2)',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                color: '#fbbf24',
                                fontWeight: 700,
                              }}
                            >
                              ★ 主要金鑰
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                          <span>今日調用: {item.totalRequestsToday} 次</span>
                          <span>上限: {item.dailyQuotaLimit === -1 ? '無限制' : `${item.dailyQuotaLimit} 次`}</span>
                          {probe && (
                            <span style={{ color: currentHealth === 'HEALTHY' ? '#34d399' : '#f59e0b' }}>
                              {probe.message}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 右側：設為主要、測活與刪除操作 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {!isPrimary && (
                        <button
                          type="button"
                          data-testid={`btn-set-primary-${item.id}`}
                          onClick={() => onPromoteToPrimary(item)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            color: '#fbbf24',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          title="設為主要金鑰"
                        >
                          設為主要
                        </button>
                      )}

                      <button
                        type="button"
                        data-testid={`btn-probe-${item.id}`}
                        onClick={() => onProbeKey(item)}
                        disabled={probing || cooldown > 0}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          background: cooldown > 0 ? 'rgba(30, 41, 59, 0.5)' : 'rgba(59, 130, 246, 0.15)',
                          border: cooldown > 0 ? '1px solid rgba(100, 116, 139, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                          color: cooldown > 0 ? '#64748b' : '#60a5fa',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: cooldown > 0 || probing ? 'not-allowed' : 'pointer',
                        }}
                        title={cooldown > 0 ? `防連點保護中，剩餘 ${cooldown} 秒` : '測試連線 (消耗 1 次外部請求)'}
                      >
                        <RefreshCw size={12} className={probing ? 'animate-spin' : ''} />
                        <span>{probing ? '檢測中...' : cooldown > 0 ? `冷卻 (${cooldown}s)` : '測活'}</span>
                      </button>

                      <button
                        type="button"
                        data-testid={`btn-delete-${item.id}`}
                        onClick={() => onDeleteKey(item.id)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#f87171',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                        }}
                        title="安全移除金鑰"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};
