import React, { useState } from "react";
import { AssetItem, ASSET_CATEGORIES, CURRENCY_SYMBOLS } from "../types";
import { Sparkles, Sliders, DollarSign, RefreshCw, BarChart2, TrendingDown, HelpCircle } from "lucide-react";

interface WhatIfSimulationProps {
  assets: AssetItem[];
  currency: string;
  totalValue: number;
  onQuickAddSimulated: (category: string, value: number) => void;
}

export default function WhatIfSimulation({
  assets,
  currency,
  totalValue,
}: WhatIfSimulationProps) {
  const [marketShock, setMarketShock] = useState<number>(0); // 市場跌幅 % (例如 -20)
  const [simulatedCategory, setSimulatedCategory] = useState<string>(ASSET_CATEGORIES[0]);
  const [simulatedAmount, setSimulatedAmount] = useState<number>(100000);
  const [showSimResult, setShowSimResult] = useState<boolean>(false);

  const currencySymbol = CURRENCY_SYMBOLS[currency] || "$";

  // 1. 計算市場波動後的預估資產價值
  const shockSummary = React.useMemo(() => {
    if (marketShock === 0) return { total: totalValue, change: 0 };
    
    // 現金與等價物不受市場漲跌波動
    const simulatedTotal = assets.reduce((sum, asset) => {
      if (asset.category.includes("現金與等價物")) {
        return sum + asset.value;
      }
      // 非現金資產受到市場變動的影響，乘上槓桿倍數
      const changeRatio = (marketShock / 100) * asset.leverage;
      const newValue = asset.value * (1 + changeRatio);
      return sum + Math.max(0, newValue);
    }, 0);

    return {
      total: simulatedTotal,
      change: simulatedTotal - totalValue,
    };
  }, [assets, totalValue, marketShock]);

  // 2. 計算新增模擬資金後的預估權重分配
  const hypotheticalSummary = React.useMemo(() => {
    const newTotal = totalValue + simulatedAmount;
    
    // 彙整原有類別金額
    const currentCategorySums: Record<string, number> = {};
    assets.forEach((a) => {
      currentCategorySums[a.category] = (currentCategorySums[a.category] || 0) + a.value;
    });

    // 模擬將新資金加入指定類別
    const simCategorySums = { ...currentCategorySums };
    simCategorySums[simulatedCategory] = (simCategorySums[simulatedCategory] || 0) + simulatedAmount;

    return Object.keys(simCategorySums).map((cat) => {
      const origSum = currentCategorySums[cat] || 0;
      const simSum = simCategorySums[cat] || 0;
      return {
        category: cat.split(" (")[0],
        originalPct: totalValue > 0 ? (origSum / totalValue) * 100 : 0,
        simulatedPct: newTotal > 0 ? (simSum / newTotal) * 100 : 0,
        originalValue: origSum,
        simulatedValue: simSum,
      };
    }).sort((a, b) => b.simulatedPct - a.simulatedPct);
  }, [assets, totalValue, simulatedCategory, simulatedAmount]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="simulation-section">
      {/* 壓力測試：市場極端震盪模擬 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-500" />
              市場壓力測試 (Stress Testing)
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold">
              含槓桿模擬
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            滑動拉桿模擬大盤大漲或崩盤時，您的非現金資產經槓桿調整後，總市值的增減幅度。
          </p>

          <div className="space-y-4">
            {/* 滑桿控制 */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-600">預期市場波動：</span>
                <span className={`text-sm font-bold font-mono ${
                  marketShock > 0 ? "text-emerald-600" : marketShock < 0 ? "text-rose-600" : "text-slate-600"
                }`}>
                  {marketShock > 0 ? `+${marketShock}` : marketShock}%
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={marketShock}
                onChange={(e) => setMarketShock(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>崩盤 -50%</span>
                <button onClick={() => setMarketShock(0)} className="hover:text-emerald-600 font-semibold">
                  歸零 (重設)
                </button>
                <span>大牛市 +50%</span>
              </div>
            </div>

            {/* 模擬結果顯示 */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                <div className="text-[10px] text-slate-400">模擬後總資產</div>
                <div className="text-base font-bold text-slate-700 font-mono mt-1">
                  {currencySymbol}
                  {shockSummary.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                <div className="text-[10px] text-slate-400">資產損益變動</div>
                <div className={`text-base font-bold font-mono mt-1 flex items-center gap-1 ${
                  shockSummary.change > 0 ? "text-emerald-600" : shockSummary.change < 0 ? "text-rose-600" : "text-slate-600"
                }`}>
                  {shockSummary.change > 0 ? "+" : ""}
                  {shockSummary.change.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {marketShock !== 0 && (
          <div className="mt-4 text-[11px] text-slate-500 bg-amber-50 border border-amber-100 p-2.5 rounded-lg flex items-start gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span>
              現金資產不參與波動；槓桿型標的會以 <strong>市場變動 × 槓桿倍數</strong> 放大計算其損益。
            </span>
          </div>
        )}
      </div>

      {/* 新增資金試算模擬 (What-If Allocation) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              新增資金試算 (What-If Planner)
            </h3>
            <button
              onClick={() => setShowSimResult(!showSimResult)}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              {showSimResult ? "收合結果" : "展開比較表"}
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            輸入預計要額外投入的金額與標的類別，在實際下單前，先模擬評估對整體投資組合配置的影響。
          </p>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">預計投入金額</label>
                <input
                  type="number"
                  value={simulatedAmount}
                  onChange={(e) => setSimulatedAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder="輸入金額"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">預計投入類別</label>
                <select
                  value={simulatedCategory}
                  onChange={(e) => setSimulatedCategory(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  {ASSET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.split(" (")[0]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 快速模擬預覽 */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 mt-2 space-y-2">
              <div className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                <span>模擬類別佔比變動：</span>
                <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-mono">
                  +{simulatedAmount.toLocaleString()}
                </span>
              </div>
              {hypotheticalSummary
                .filter((item) => item.category === simulatedCategory.split(" (")[0])
                .map((item) => (
                  <div key={item.category} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">{item.category}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-400">{item.originalPct.toFixed(1)}%</span>
                      <span className="text-slate-400">➔</span>
                      <span className="text-emerald-600 font-bold">{item.simulatedPct.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* 展開的詳細類別佔比比較表 */}
        {showSimResult && (
          <div className="mt-4 border-t border-slate-100 pt-3 max-h-[120px] overflow-y-auto space-y-1.5">
            <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 px-1">
              <span className="col-span-6">資產類別</span>
              <span className="col-span-3 text-right">原佔比</span>
              <span className="col-span-3 text-right">預計佔比</span>
            </div>
            {hypotheticalSummary.map((item) => (
              <div key={item.category} className="grid grid-cols-12 text-xs py-1 hover:bg-slate-50 rounded px-1 transition-colors">
                <span className="col-span-6 font-medium text-slate-600 truncate">{item.category}</span>
                <span className="col-span-3 text-right font-mono text-slate-400">{item.originalPct.toFixed(1)}%</span>
                <span className="col-span-3 text-right font-mono font-semibold text-emerald-600">{item.simulatedPct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
