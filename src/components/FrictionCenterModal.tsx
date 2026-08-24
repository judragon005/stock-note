import React from 'react';
import { FrictionSummary, BrokerAccount } from '../types/stock';
import { X, Sparkles, TrendingDown, Award, AlertCircle, Percent, Coins, Receipt } from 'lucide-react';

interface FrictionCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  frictionSummary?: FrictionSummary;
  accounts: BrokerAccount[];
  selectedAccountId: string;
}

export const FrictionCenterModal: React.FC<FrictionCenterModalProps> = ({
  isOpen,
  onClose,
  frictionSummary,
  accounts,
  selectedAccountId,
}) => {
  if (!isOpen || !frictionSummary) return null;

  const currentAccount = selectedAccountId === 'ALL'
    ? null
    : accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-wide">交易摩擦成本深度分析儀</h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">
                  {currentAccount ? currentAccount.name : '全帳戶合併透視'}
                </span>
              </div>
              <p className="text-xs text-slate-400">穿透交易手續費、證券交易稅與券商退佣折讓對投資報酬之長期影響</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* 4 大核心發光指標卡 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* 1. 歷史買進手續費 */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/70 rounded-xl">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>累計買進手續費</span>
                <Receipt className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-lg font-bold text-slate-100">
                NT$ {frictionSummary.totalBuyFee.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">建倉交易實扣佣金</div>
            </div>

            {/* 2. 歷史賣出稅費 */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/70 rounded-xl">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>累計賣出稅費</span>
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-lg font-bold text-slate-100">
                NT$ {(frictionSummary.totalSellFee + frictionSummary.totalSellTax).toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                稅 {frictionSummary.totalSellTax.toLocaleString()} / 費 {frictionSummary.totalSellFee.toLocaleString()}
              </div>
            </div>

            {/* 3. 券商折讓累計省下金額 */}
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-1">
                <span>券商折讓已省下</span>
                <Award className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-lg font-bold text-emerald-300">
                +NT$ {frictionSummary.totalFeeSavedByDiscount.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-500/80 mt-1">基準：法定牌告 20元低消+0.1425%</div>
            </div>

            {/* 4. 預估未來出清成本 */}
            <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl">
              <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-1">
                <span>預估出清摩擦成本</span>
                <Percent className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg font-bold text-amber-300">
                NT$ {frictionSummary.totalEstimatedFutureFriction.toLocaleString()}
              </div>
              <div className="text-[10px] text-amber-500/80 mt-1">
                預估稅 {frictionSummary.totalEstimatedFutureTax.toLocaleString()} (債券ETF 0%) / 費 {frictionSummary.totalEstimatedFutureFee.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 摩擦成本衝擊度分析 */}
          <div className="p-5 bg-slate-800/40 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-slate-200">摩擦成本佔總資產衝擊度</span>
              </div>
              <span className="text-sm font-bold text-blue-400">
                {frictionSummary.frictionImpactPercent.toFixed(2)}%
              </span>
            </div>

            {/* 進度條 */}
            <div className="w-full h-2.5 bg-slate-700/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, frictionSummary.frictionImpactPercent * 20))}%` }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-xs text-slate-400">
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <div className="text-slate-300 font-medium mb-0.5">歷史總摩擦支出</div>
                <div className="text-sm font-bold text-slate-100">
                  NT$ {frictionSummary.totalRealizedFriction.toLocaleString()}
                </div>
              </div>
              {frictionSummary.totalTWDividendTax !== undefined && frictionSummary.totalTWDividendTax > 0 ? (
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="text-slate-300 font-medium mb-0.5">台股二代健保 (2.11%)</div>
                  <div className="text-sm font-bold text-amber-400">
                    NT$ {frictionSummary.totalTWDividendTax.toLocaleString()}
                  </div>
                </div>
              ) : frictionSummary.totalUSDividendTax !== undefined && frictionSummary.totalUSDividendTax > 0 ? (
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="text-slate-300 font-medium mb-0.5">美股股息 30% 預扣</div>
                  <div className="text-sm font-bold text-rose-400">
                    USD {frictionSummary.totalUSDividendTax.toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="text-slate-300 font-medium mb-0.5">除權息摩擦稅負</div>
                  <div className="text-sm font-bold text-slate-400">
                    NT$ 0
                  </div>
                </div>
              )}
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <div className="text-slate-300 font-medium mb-0.5">全週期預期摩擦</div>
                <div className="text-sm font-bold text-slate-100">
                  NT$ {(frictionSummary.totalRealizedFriction + frictionSummary.totalEstimatedFutureFriction).toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <div className="text-slate-300 font-medium mb-0.5">折讓節省比率</div>
                <div className="text-sm font-bold text-emerald-400">
                  {frictionSummary.totalBuyFee + frictionSummary.totalFeeSavedByDiscount > 0
                    ? `${((frictionSummary.totalFeeSavedByDiscount / (frictionSummary.totalBuyFee + frictionSummary.totalFeeSavedByDiscount)) * 100).toFixed(1)}%`
                    : '0%'}
                </div>
              </div>
            </div>
          </div>

          {/* 專業投資建議與優化指南 */}
          <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <div className="font-semibold text-blue-300">摩擦成本優化與法規指南</div>
              <p className="leading-relaxed text-slate-400">
                1. <strong>台股低消陷阱與折讓基準</strong>：法定標準牌告手續費設有 NT$ 20 低消。單筆小額或零股買進若使用 2.8折/2折且低消 1 元之券商，每筆可直接省下 NT$ 19 以上之低消溢繳費用。<br />
                2. <strong>台股證券交易稅率分層</strong>：普通股票賣出課徵 0.3%；現股當沖課徵 0.15%；股票型 ETF 課徵 0.1%；債券型 ETF（代碼以 B 結尾）依法停徵證交稅（0%）。<br />
                3. <strong>美股投資摩擦全貌</strong>：海外券商交易免手續費，但現金股利自動預扣 30% 稅額（W-8BEN 預扣）；賣出時僅收取微量 SEC 規費 (0.00278%) 與 FINRA TAF。
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
