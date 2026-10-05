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
import { probeApiKey } from '../engine/apiKeyHealthProbe';
import { KeyRound, Plus, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';

const PROVIDER_NAMES: Record<ProviderType, { label: string; desc: string; defaultQuota: number }> = {
  finmind: { label: 'FinMind (台股籌碼/財報)', desc: '免費帳號 300 次/小時，可註冊多組帳號', defaultQuota: 300 },
  finnhub: { label: 'Finnhub (美股即時行情/事件)', desc: '免費層 60 次/分鐘，免信用卡', defaultQuota: 1000 },
  fred: { label: 'FRED (聯準會總經/無風險利率)', desc: '免費 120 次/分鐘，官方權威數據', defaultQuota: 2000 },
  polygon: { label: 'Polygon.io (美股盤後備援)', desc: '免費 5 次/分鐘', defaultQuota: 200 },
  coingecko: { label: 'CoinGecko (加密貨幣/穩定幣)', desc: '免費 30 次/分鐘', defaultQuota: 500 },
  sec: { label: 'SEC EDGAR (美股官方財報)', desc: '100% 免費無 Key (需合規 User-Agent)', defaultQuota: -1 },
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

  useEffect(() => {
    loadEncryptedKeyPool().then((loaded) => {
      setKeys(loaded);
    });
  }, []);

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
      const res = await probeApiKey(item.provider, item.key);
      setProbeResults((prev) => ({
        ...prev,
        [item.id]: { status: res.status, message: res.message },
      }));
    } finally {
      setIsProbing((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const filteredKeys = keys.filter((k) => k.provider === selectedProvider);

  return (
    <div id="api-key-pool-section" className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl mb-8">
      {/* 標題與簡介 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              外部金融 API 金鑰池管理 (API Key Pool)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                本機加密保護
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              支援註冊多組免費帳號金鑰，自動輪替調度 (Round-Robin) 與 429 限流退避，杜絕抓取中斷。
            </p>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {toastMsg}
        </div>
      )}

      {/* 供應商選擇頁籤 */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-6">
        {(Object.keys(PROVIDER_NAMES) as ProviderType[]).map((p) => {
          const count = keys.filter((k) => k.provider === p).length;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedProvider(p)}
              className={`p-3 rounded-xl text-left border transition-all text-xs font-medium flex flex-col justify-between ${
                selectedProvider === p
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-800/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/80 hover:text-slate-300'
              }`}
            >
              <div className="truncate font-semibold">{PROVIDER_NAMES[p].label.split(' ')[0]}</div>
              <div className="text-[10px] text-slate-500 mt-1">{count} 組金鑰</div>
            </button>
          );
        })}
      </div>

      {/* 新增金鑰表單 */}
      {selectedProvider !== 'sec' && (
        <form onSubmit={handleAddKey} className="bg-slate-950/40 rounded-xl border border-slate-800/80 p-4 mb-6">
          <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center justify-between">
            <span>新增 {PROVIDER_NAMES[selectedProvider].label} 金鑰</span>
            <span className="text-[11px] text-slate-500">{PROVIDER_NAMES[selectedProvider].desc}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5">
              <input
                type="text"
                value={newKeyInput}
                onChange={(e) => setNewKeyInput(e.target.value)}
                placeholder="貼上 API Token / Key..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div className="md:col-span-3">
              <input
                type="text"
                value={newAliasInput}
                onChange={(e) => setNewAliasInput(e.target.value)}
                placeholder="別名 (例: 個人帳號 1)"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <input
                type="number"
                value={customQuotaInput}
                onChange={(e) => setCustomQuotaInput(e.target.value)}
                placeholder={`單日上限 (${PROVIDER_NAMES[selectedProvider].defaultQuota})`}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full h-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                加入金鑰池
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 金鑰清單 */}
      <div className="space-y-2.5">
        {selectedProvider === 'sec' ? (
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-xs">
            💡 SEC EDGAR 為美國證券交易委員會官方開放端點，系統已自帶合規 User-Agent 認證，無需設定任何 API Key 即可永久免費享受完整 10-K/10-Q 財報。
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-slate-950/20 border border-dashed border-slate-800 text-slate-500 text-xs">
            尚未新增 {PROVIDER_NAMES[selectedProvider].label} 的 API Key。請於上方表單新增以加入輪替池。
          </div>
        ) : (
          filteredKeys.map((item) => {
            const probe = probeResults[item.id];
            const currentHealth = probe?.status || computeKeyHealthStatus(item);
            const probing = isProbing[item.id];

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  {/* 狀態燈號 */}
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      currentHealth === 'HEALTHY'
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                        : currentHealth === 'COOLING_DOWN'
                        ? 'bg-amber-400 animate-pulse'
                        : currentHealth === 'QUOTA_EXHAUSTED'
                        ? 'bg-orange-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-slate-200">
                        {maskApiKey(item.key)}
                      </span>
                      {item.alias && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 font-sans">
                          {item.alias}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                      <span>今日調用: {item.totalRequestsToday} 次</span>
                      <span>上限: {item.dailyQuotaLimit === -1 ? '無限制' : `${item.dailyQuotaLimit} 次`}</span>
                      {probe && (
                        <span className={currentHealth === 'HEALTHY' ? 'text-emerald-400' : 'text-amber-400'}>
                          {probe.message}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleProbeKey(item)}
                    disabled={probing}
                    className="p-2 rounded-lg bg-slate-700/40 hover:bg-slate-700 text-slate-300 transition-colors text-xs flex items-center gap-1"
                    title="測試連線"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${probing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">測試</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteKey(item.id)}
                    className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                    title="移除金鑰"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
