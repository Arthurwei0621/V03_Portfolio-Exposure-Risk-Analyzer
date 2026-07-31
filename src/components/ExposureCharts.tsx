import React, { useState } from "react";
import { AssetItem, CURRENCY_SYMBOLS } from "../types";
import { PieChart, AlertTriangle, ShieldCheck, TrendingUp, Info } from "lucide-react";

interface ExposureChartsProps {
  assets: AssetItem[];
  currency: string;
  totalValue: number;
}

// 顏色對照表
const COLOR_PALETTE = [
  "#10b981", // Emerald (科技資訊)
  "#6366f1", // Indigo (金融保險)
  "#0ea5e9", // Sky (半導體)
  "#8b5cf6", // Violet (ETF/基金)
  "#f59e0b", // Amber (民生消費)
  "#ec4899", // Pink (生技醫療)
  "#f97316", // Orange (能源與材料)
  "#14b8a6", // Teal (航運與航太)
  "#64748b", // Slate (現金與等價物)
  "#a8a29e", // Stone (其他資產)
];

export default function ExposureCharts({ assets, currency, totalValue }: ExposureChartsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const currencySymbol = CURRENCY_SYMBOLS[currency] || "$";

  // 按類別分組計算價值與實質曝險額
  const categorySummary = React.useMemo(() => {
    const summaryMap: Record<
      string,
      { value: number; effValue: number; count: number; assets: AssetItem[] }
    > = {};

    assets.forEach((asset) => {
      if (!summaryMap[asset.category]) {
        summaryMap[asset.category] = { value: 0, effValue: 0, count: 0, assets: [] };
      }
      const isCash = asset.category.includes("現金與等價物");
      const effectiveLeverage = isCash ? 0 : asset.leverage;
      summaryMap[asset.category].value += asset.value;
      summaryMap[asset.category].effValue += asset.value * effectiveLeverage;
      summaryMap[asset.category].count += 1;
      summaryMap[asset.category].assets.push(asset);
    });

    return Object.entries(summaryMap)
      .map(([category, data], index) => {
        const pct = totalValue > 0 ? (data.value / totalValue) * 100 : 0;
        return {
          category,
          ...data,
          pct,
          color: COLOR_PALETTE[index % COLOR_PALETTE.length],
        };
      })
      .sort((a, b) => b.value - a.value); // 按金額由大到小排序
  }, [assets, totalValue]);

  // 計算實質槓桿調整後的總風險曝險額 (現金不計入股票市場曝險，算 0x)
  const totalEffValue = React.useMemo(() => {
    return assets.reduce((sum, asset) => {
      if (asset.category.includes("現金與等價物")) return sum;
      return sum + asset.value * asset.leverage;
    }, 0);
  }, [assets]);

  // 實質曝險佔總資產比例 (若總資產為 0，則比率為 0)
  const effectiveExposureRatio = totalValue > 0 ? (totalEffValue / totalValue) * 100 : 0;

  // 1. 圓環圖數學計算
  const radius = 50;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // 約 314.16

  // 累積角度（用於旋轉各個環段）
  let accumulatedPercent = 0;

  // 評估曝險風險指標
  const getRiskStatus = () => {
    if (assets.length === 0) return { label: "無資產", color: "text-slate-400 bg-slate-50", desc: "請先新增資產開始計算" };
    
    // 計算非現金資產佔比
    const nonCashValue = assets
      .filter((a) => !a.category.includes("現金"))
      .reduce((sum, a) => sum + a.value, 0);
    const nonCashPct = totalValue > 0 ? (nonCashValue / totalValue) * 100 : 0;

    if (effectiveExposureRatio > 120) {
      return {
        label: "極高風險 (Aggressive)",
        color: "text-rose-600 bg-rose-50 border-rose-100",
        desc: "實質曝險高於 120%，表明您使用了較高槓桿或衍生性工具，市場下跌時波動會顯著放大。",
        icon: AlertTriangle,
      };
    } else if (effectiveExposureRatio > 90 || nonCashPct > 90) {
      return {
        label: "高風險偏好 (High)",
        color: "text-orange-600 bg-orange-50 border-orange-100",
        desc: "資產高度集中在股票或高風險資產（超過 90%），現金留存低，對市場回檔的抵禦力較弱。",
        icon: AlertTriangle,
      };
    } else if (effectiveExposureRatio > 60 || nonCashPct > 60) {
      return {
        label: "穩健適中 (Moderate)",
        color: "text-amber-600 bg-amber-50 border-amber-100",
        desc: "曝險水平適中 (60%-90%)，股債/現金配置相對均衡，符合多數成長型投資人的配置比例。",
        icon: TrendingUp,
      };
    } else {
      return {
        label: "保守防禦 (Low)",
        color: "text-emerald-600 bg-emerald-50 border-emerald-100",
        desc: "曝險水平較低 (低於 60%)，持有較多現金或定存等安全資產，在市場波動時具備極佳防禦力。",
        icon: ShieldCheck,
      };
    }
  };

  const risk = getRiskStatus();
  const RiskIcon = risk.icon || ShieldCheck;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="exposure-charts-section">
      {/* 圓環分配圖 (8 cols on lg or combined with details) */}
      <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-center">
        {/* SVG 環形圖 */}
        <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
          {assets.length === 0 ? (
            <svg width="100%" height="100%" viewBox="0 0 120 120" className="-rotate-90">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
              />
            </svg>
          ) : (
            <svg width="100%" height="100%" viewBox="0 0 120 120" className="-rotate-90">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
              />
              {categorySummary.map((item, index) => {
                if (item.pct <= 0) return null;
                const strokeDashoffset = circumference * (1 - item.pct / 100);
                const rotation = accumulatedPercent * 3.6; // 360 * pct / 100
                accumulatedPercent += item.pct;

                const isHovered = hoveredIndex === index;

                return (
                  <circle
                    key={item.category}
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    transform={`rotate(${rotation} 60 60)`}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })}
            </svg>
          )}

          {/* 中央文字呈現 */}
          <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
            {hoveredIndex !== null && categorySummary[hoveredIndex] ? (
              <>
                <span className="text-[10px] font-medium text-slate-400 truncate max-w-[100px]">
                  {categorySummary[hoveredIndex].category.split(" (")[0]}
                </span>
                <span className="text-lg font-bold text-slate-800 font-mono">
                  {categorySummary[hoveredIndex].pct.toFixed(1)}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] font-medium text-slate-400">總資產價值</span>
                <span className="text-base font-extrabold text-slate-800 font-mono">
                  {currencySymbol}
                  {totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">
                  {assets.length} 筆資產
                </span>
              </>
            )}
          </div>
        </div>

        {/* 右側：分類圖例與百分比 */}
        <div className="flex-1 w-full space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
            <PieChart className="w-4 h-4 text-slate-500" />
            資產類別權重配置
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
            {categorySummary.map((item, index) => {
              const isHovered = hoveredIndex === index;
              return (
                <div
                  key={item.category}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`flex items-center justify-between p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isHovered
                      ? "bg-slate-50 border-slate-200 shadow-xs translate-x-0.5"
                      : "bg-white border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-medium text-slate-600 truncate">
                      {item.category.split(" (")[0]}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {item.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 實質曝險 & 風險儀表 (4 cols on lg) */}
      <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between gap-4">
        <div>
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-semibold text-slate-800">實質曝險比率分析</h3>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
              Leverage Adj.
            </span>
          </div>

          {/* 總實質曝險數字 */}
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight">
                {effectiveExposureRatio.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500 font-mono">
                (實質曝險額: {currencySymbol}
                {totalEffValue.toLocaleString(undefined, { maximumFractionDigits: 0 })})
              </span>
            </div>

            {/* 進度條 */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  effectiveExposureRatio > 120
                    ? "bg-rose-500"
                    : effectiveExposureRatio > 90
                    ? "bg-orange-500"
                    : effectiveExposureRatio > 60
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(effectiveExposureRatio, 150) / 1.5}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono">
              <span>0% (低風險)</span>
              <span>100% (無槓桿全壓)</span>
              <span>150%+</span>
            </div>
          </div>
        </div>

        {/* 風險評估卡 */}
        <div className={`p-3.5 rounded-xl border ${risk.color} transition-all duration-300 flex gap-2.5 items-start`}>
          <RiskIcon className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold">{risk.label}</div>
            <div className="text-[11px] leading-relaxed mt-1 opacity-90">{risk.desc}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
