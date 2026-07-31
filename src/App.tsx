import React, { useState, useMemo } from "react";
import { AssetItem, CURRENCY_SYMBOLS } from "./types";
import AssetTable from "./components/AssetTable";
import ExposureCharts from "./components/ExposureCharts";
import WhatIfSimulation from "./components/WhatIfSimulation";
import PortfolioManager from "./components/PortfolioManager";
import { motion } from "motion/react";
import {
  TrendingUp,
  Coins,
  ShieldCheck,
  Scale,
  RefreshCw,
  Sparkles,
  Info,
  AlertTriangle,
  Sliders,
  Target,
  Zap,
  Lock,
  Unlock
} from "lucide-react";

// 初始範本資料
const DEFAULT_ASSETS: AssetItem[] = [
  {
    id: "init-1",
    name: "台積電",
    ticker: "2330",
    category: "半導體 (Semiconductor)",
    value: 1493100,
    price: 2370,
    shares: 630,
    leverage: 1.0,
    notes: "核心科技持股",
  },
  {
    id: "init-2",
    name: "元大台灣50",
    ticker: "0050",
    category: "ETF / 基金 (ETF/Fund)",
    value: 220860,
    price: 102.25,
    shares: 2160,
    leverage: 1.0,
    notes: "大盤指數型配置",
  },
  {
    id: "init-3",
    name: "輝達",
    ticker: "NVDA",
    category: "科技資訊 (Technology)",
    value: 414800,
    price: 207.4,
    shares: 2000,
    leverage: 1.0,
    notes: "AI 高成長股",
  },
  {
    id: "init-4",
    name: "那指兩倍槓桿 ETF",
    ticker: "QLD",
    category: "ETF / 基金 (ETF/Fund)",
    value: 150775,
    price: 92.5,
    shares: 1630,
    leverage: 2.0,
    notes: "放大科技波動",
  },
  {
    id: "init-5",
    name: "銀行活期存款",
    ticker: "CASH",
    category: "現金與等價物 (Cash & Equivalents)",
    value: 400000,
    leverage: 1.0,
    notes: "緊急備用金與加碼資金",
  },
];

// 槓桿投資策略內建標準選項
const DAREN_STRATEGIES = [
  {
    id: "50-50",
    name: "50/50 策略 (目標曝險 100% / 現金 50%)",
    targetExposure: 100,
    targetCash: 50,
    desc: "半數資金投入正 2 ETF 達到 100% 大盤曝險，另一半保持現金作為安全護城河。",
  },
  {
    id: "60-40",
    name: "60/40 策略 (目標曝險 120% / 現金 40%)",
    targetExposure: 120,
    targetCash: 40,
    desc: "60% 資金投入正 2 ETF 獲得 120% 實質曝險，40% 現金儲備，提升成長動能。",
  },
  {
    id: "67-33",
    name: "67/33 策略 (目標曝險 134% / 現金 33%)",
    targetExposure: 134,
    targetCash: 33,
    desc: "2/3 資金投入正 2 ETF (134% 曝險)，1/3 資金保留現金，攻守兼備極致效率。",
  },
  {
    id: "custom",
    name: "自訂策略 (手動調整目標數值)",
    targetExposure: 100,
    targetCash: 50,
    desc: "由使用者自由設定專屬的實質曝險比率與目標現金水位。",
  },
];

export default function App() {
  const [assets, setAssets] = useState<AssetItem[]>(DEFAULT_ASSETS);
  const [currency, setCurrency] = useState<string>("TWD");

  // ==========================================
  // 1. 槓桿投資策略：狀態管理
  // ==========================================
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("60-40");
  const [targetExposurePct, setTargetExposurePct] = useState<number>(120);
  const [targetCashPct, setTargetCashPct] = useState<number>(40);
  const [isStrategyLocked, setIsStrategyLocked] = useState<boolean>(false);

  const currencySymbol = CURRENCY_SYMBOLS[currency] || "$";

  // 切換內建策略選項時自動更新目標值
  const handleSelectStrategy = (strategyId: string) => {
    setSelectedStrategyId(strategyId);
    const found = DAREN_STRATEGIES.find((s) => s.id === strategyId);
    if (found && strategyId !== "custom") {
      setTargetExposurePct(found.targetExposure);
      setTargetCashPct(found.targetCash);
    }
  };

  // 手動變更目標曝險比率
  const handleTargetExposureChange = (val: number) => {
    setTargetExposurePct(val);
    setSelectedStrategyId("custom");
  };

  // 手動變更目標現金水位
  const handleTargetCashChange = (val: number) => {
    setTargetCashPct(val);
    setSelectedStrategyId("custom");
  };

  // ==========================================
  // 2. 核心資產與曝險計算邏輯
  // ==========================================
  // 【總資產市值 (A)】 = 所有風險資產價值 + 現金與等價物總額
  const totalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + asset.value, 0);
  }, [assets]);

  // 【當前實質曝險總額 (B)】 = 所有風險資產的 [價值 × 槓桿倍數] 加總（現金計算為 0x 槓桿）
  const totalRiskExposure = useMemo(() => {
    return assets.reduce((sum, asset) => {
      // 若為現金與等價物類別，實質曝險算 0x
      if (asset.category.includes("現金與等價物")) {
        return sum;
      }
      return sum + asset.value * asset.leverage;
    }, 0);
  }, [assets]);

  // 【當前實質曝險比率】 = (B ÷ A) × 100%
  const currentExposurePct = useMemo(() => {
    return totalValue > 0 ? (totalRiskExposure / totalValue) * 100 : 0;
  }, [totalRiskExposure, totalValue]);

  // 現金及等價物金額與當前現金水位 %
  const cashValue = useMemo(() => {
    return assets
      .filter((a) => a.category.includes("現金與等價物"))
      .reduce((sum, a) => sum + a.value, 0);
  }, [assets]);

  const currentCashPct = useMemo(() => {
    return totalValue > 0 ? (cashValue / totalValue) * 100 : 0;
  }, [cashValue, totalValue]);

  // 投資組合平均槓桿 (總實質總曝險 / 總市值)
  const averageLeverage = useMemo(() => {
    const totalEffectiveAll = assets.reduce((sum, a) => sum + a.value * a.leverage, 0);
    return totalValue > 0 ? totalEffectiveAll / totalValue : 1.0;
  }, [assets, totalValue]);

  // 現金偏離程度與動態顏色狀態 (超過或低於目標 20% 為紅色，10% 為橘色，10%以內/5% 為綠色)
  const cashStatusColor = useMemo(() => {
    const diff = Math.abs(currentCashPct - targetCashPct);
    if (diff >= 20) {
      return {
        cardBg: "bg-rose-50/60 border-rose-200",
        textColor: "text-rose-600",
        iconBg: "bg-rose-100 text-rose-600",
      };
    }
    if (diff >= 10) {
      return {
        cardBg: "bg-amber-50/60 border-amber-200",
        textColor: "text-amber-600",
        iconBg: "bg-amber-100 text-amber-600",
      };
    }
    return {
      cardBg: "bg-emerald-50/30 border-emerald-100",
      textColor: "text-emerald-600",
      iconBg: "bg-emerald-50 text-emerald-600",
    };
  }, [currentCashPct, targetCashPct]);

  // ==========================================
  // 3. 策略：智能加減碼與再平衡建議邏輯
  // ==========================================
  // 判斷是否處於「現金不足 或 曝險超標」警告狀態
  const isWarningState = useMemo(() => {
    return currentCashPct < targetCashPct || currentExposurePct > targetExposurePct;
  }, [currentCashPct, targetCashPct, currentExposurePct, targetExposurePct]);

  // 【警告時的精確減碼金額】（補足現金缺口或調降超標曝險）
  const reduceAmount = useMemo(() => {
    if (!isWarningState || totalValue <= 0) return 0;
    // 1. 為達到目標現金水位需要的現金缺口 (元)
    const cashGap = Math.max(0, ((targetCashPct - currentCashPct) / 100) * totalValue);
    // 2. 曝險超出目標部分的金額 (元)
    const exposureOverflow = Math.max(0, ((currentExposurePct - targetExposurePct) / 100) * totalValue);
    // 取較大者作為需減碼轉現金的參考金額
    return Math.max(cashGap, exposureOverflow);
  }, [isWarningState, totalValue, targetCashPct, currentCashPct, currentExposurePct, targetExposurePct]);

  // 【加碼時的精確正2 ETF 投入金額】（動用多餘現金加碼至正2 ETF 提升曝險）
  const addAmount = useMemo(() => {
    if (isWarningState || totalValue <= 0) return 0;
    // 曝險不足之缺口 (元)
    const exposureGap = Math.max(0, ((targetExposurePct - currentExposurePct) / 100) * totalValue);
    // 投入 1 元 2 倍槓桿 (正2) ETF 可增加 2 元實質曝險，故所需現金為曝險缺口的一半
    const requiredCashForLeverage = exposureGap / 2;
    // 可用多餘現金 = 目前現金 - 目標現金
    const surplusCash = Math.max(0, ((currentCashPct - targetCashPct) / 100) * totalValue);
    // 取兩者合理解，避免投入金額超出多餘現金
    return Math.min(requiredCashForLeverage, surplusCash > 0 ? surplusCash : requiredCashForLeverage);
  }, [isWarningState, totalValue, targetExposurePct, currentExposurePct, currentCashPct, targetCashPct]);

  // 當使用者載入或重設投資組合時
  const handleLoadPortfolio = (newAssets: AssetItem[], newCurrency: string) => {
    setAssets(newAssets);
    setCurrency(newCurrency);
  };

  // 快速加入模擬空欄位
  const handleQuickAddSimulated = (category: string, value: number) => {
    const mockItem: AssetItem = {
      id: Date.now().toString(),
      name: `模擬 ${category.split(" (")[0]} 投資`,
      category,
      value,
      leverage: 1.0,
    };
    setAssets([...assets, mockItem]);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900" id="app-container">
      {/* 頂部導航列 / 標題 */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-xs px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-emerald-200">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Portfolio Exposure & Risk Analyzer
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              槓桿投資策略與曝險比例資產配置工具
            </p>
          </div>
        </div>

        {/* 快捷重設 */}
        <button
          onClick={() => {
            if (window.confirm("確定要重設為預設範例組合嗎？")) {
              setAssets(DEFAULT_ASSETS);
              setCurrency("TWD");
              setSelectedStrategyId("60-40");
              setTargetExposurePct(120);
              setTargetCashPct(40);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-100 hover:border-slate-200 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-50/50 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
          id="reset-to-example-btn"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>重設範例組合</span>
        </button>
      </header>

      {/* 核心內容區 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* ========================================== */}
        {/* 1. 策略：曝險目標設定與智能加減碼建議控制區 */}
        {/* ========================================== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-5"
          id="strategy-control-panel"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  槓桿投資策略：目標設定與智能再平衡
                  {isStrategyLocked && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md">
                      <Lock className="w-3 h-3 text-slate-500" /> 已鎖定
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500">
                  選擇標準策略或自訂目標，即時計算現金安全護城河與槓桿加減碼建議。
                </p>
              </div>
            </div>

            {/* 策略鎖定切換按鈕 */}
            <button
              type="button"
              onClick={() => setIsStrategyLocked(!isStrategyLocked)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isStrategyLocked
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
              }`}
              id="lock-strategy-btn"
              title={isStrategyLocked ? "解鎖策略，允許修改參數" : "鎖定策略，防止誤觸修改"}
            >
              {isStrategyLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  <span>策略已鎖定 (點擊解鎖)</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>鎖定策略</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 左區塊：策略選擇與自訂數值調整 (5 cols) */}
            <div className={`lg:col-span-5 space-y-4 p-4 rounded-xl border transition-all ${
              isStrategyLocked 
                ? "bg-slate-100/70 border-slate-200 opacity-90" 
                : "bg-slate-50/60 border-slate-100"
            }`}>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-slate-500" />
                    策略目標模式 (Strategy Model)
                  </label>
                  {isStrategyLocked && (
                    <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-0.5">
                      <Lock className="w-3 h-3 text-slate-500" /> 禁止變更
                    </span>
                  )}
                </div>
                <select
                  value={selectedStrategyId}
                  disabled={isStrategyLocked}
                  onChange={(e) => handleSelectStrategy(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                  id="strategy-select"
                >
                  {DAREN_STRATEGIES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 目標數值控制 (滑桿與輸入) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-medium text-slate-600">目標實質曝險比</span>
                    <span className="text-xs font-mono font-bold text-emerald-600">{targetExposurePct}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="1"
                    disabled={isStrategyLocked}
                    value={targetExposurePct}
                    onChange={(e) => handleTargetExposureChange(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-medium text-slate-600">目標現金水位</span>
                    <span className="text-xs font-mono font-bold text-sky-600">{targetCashPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    step="1"
                    disabled={isStrategyLocked}
                    value={targetCashPct}
                    onChange={(e) => handleTargetCashChange(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-100 leading-relaxed flex items-center justify-between">
                <div>
                  {isStrategyLocked ? "🔒 " : "💡 "}
                  <span className="font-semibold text-slate-700">當前策略目標：</span>
                  實質曝險 <strong className="text-emerald-700 font-mono">{targetExposurePct}%</strong> | 現金儲備 <strong className="text-sky-700 font-mono">{targetCashPct}%</strong>
                </div>
                {isStrategyLocked && (
                  <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                    已保護
                  </span>
                )}
              </div>
            </div>

            {/* 右區塊：策略智能加減碼建議提示框 (7 cols) */}
            <div className="lg:col-span-7 h-full flex flex-col justify-center">
              {isWarningState ? (
                /* 現金低於目標 或 曝險超標 時：橘紅色警告框 */
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 shadow-2xs space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>策略警告：現金水位不足或曝險超出目標</span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-950 font-medium">
                    當前現金比重不足（目標 <span className="font-mono font-bold text-amber-700">{targetCashPct}%</span>，目前 <span className="font-mono font-bold text-amber-700">{currentCashPct.toFixed(1)}%</span>）。建議立即減碼非槓桿的原型資產 <strong className="font-mono text-rose-700 font-extrabold text-sm">{currencySymbol}{Math.round(reduceAmount).toLocaleString()}</strong> 元轉為現金，以補足安全護城河。
                  </p>
                </div>
              ) : (
                /* 現金高於目標 或 曝險不足 時：藍綠色提示框 */
                <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 shadow-2xs space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>策略建議：資金效率良好，具備加碼空間</span>
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-950 font-medium">
                    當前曝險效率不足。建議動用多餘現金，將其中的 <strong className="font-mono text-emerald-700 font-extrabold text-sm">{currencySymbol}{Math.round(addAmount).toLocaleString()}</strong> 元加碼投入 2 倍槓桿（正2）ETF，以將實質曝險拉回目標值。
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ========================================== */}
        {/* 2. KPI 統計看板 (動態渲染四大核心指標) */}
        {/* ========================================== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          id="kpi-panel"
        >
          {/* KPI 1: 總資產市值 (A) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 block">總資產市值 (A)</span>
              <span className="text-2xl font-extrabold text-slate-800 font-mono tracking-tight block mt-1">
                {currencySymbol}
                {totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium mt-1 inline-flex items-center gap-0.5">
                <Coins className="w-3 h-3" />
                風險資產 + 現金與等價物總額
              </span>
            </div>
            <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 2: 當前實質曝險總額 (B) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 block">當前實質曝險總額 (B)</span>
              <span className="text-2xl font-extrabold text-slate-800 font-mono tracking-tight block mt-1">
                {currencySymbol}
                {totalRiskExposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-slate-500 font-medium mt-1 inline-flex items-center gap-0.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                所有資產 [價值 × 槓桿] 加總
              </span>
            </div>
            <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Scale className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 3: 當前實質曝險比率 */}
          <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition-all ${
            currentExposurePct > targetExposurePct
              ? "bg-amber-50/50 border-amber-200"
              : "bg-white border-slate-100"
          }`}>
            <div>
              <span className="text-xs font-medium text-slate-400 block">當前實質曝險比率</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-2xl font-extrabold font-mono tracking-tight ${
                  currentExposurePct > targetExposurePct ? "text-amber-700" : "text-emerald-600"
                }`}>
                  {currentExposurePct.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 目標 {targetExposurePct}%</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                公式: (B ÷ A) × 100%
              </span>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              currentExposurePct > targetExposurePct ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-600"
            }`}>
              <Info className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 4: 現金與定存比重 */}
          <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition-all ${cashStatusColor.cardBg}`}>
            <div>
              <span className="text-xs font-medium text-slate-400 block">現金與定存水位</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-2xl font-extrabold font-mono tracking-tight ${cashStatusColor.textColor}`}>
                  {currentCashPct.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 目標 {targetCashPct}%</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                平均槓桿: {averageLeverage.toFixed(2)}x
              </span>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${cashStatusColor.iconBg}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </motion.div>

        {/* 圖表呈現 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          id="charts-wrapper"
        >
          <ExposureCharts assets={assets} currency={currency} totalValue={totalValue} />
        </motion.div>

        {/* 資產編輯表格 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          id="table-wrapper"
        >
          <AssetTable
            assets={assets}
            onUpdateAssets={setAssets}
            currency={currency}
            totalValue={totalValue}
          />
        </motion.div>

        {/* 存檔管理 & 情境模擬試算 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          id="tools-wrapper"
        >
          {/* 左半邊: 存檔模組 (5 cols) */}
          <div className="lg:col-span-5">
            <PortfolioManager
              currentAssets={assets}
              onLoadPortfolio={handleLoadPortfolio}
              currency={currency}
              onCurrencyChange={setCurrency}
            />
          </div>

          {/* 右半邊: 波動模擬與新增資產 (7 cols) */}
          <div className="lg:col-span-7">
            <WhatIfSimulation
              assets={assets}
              currency={currency}
              totalValue={totalValue}
              onQuickAddSimulated={handleQuickAddSimulated}
            />
          </div>
        </motion.div>
      </main>

      {/* 底部聲明 */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 mt-12 px-4" id="app-footer">
        <p className="max-w-2xl mx-auto leading-relaxed">
          免責聲明：本工具所計算與模擬之曝險比例、槓桿倍數及策略再平衡數值，僅供學術與資產配置模擬參考，不構成任何實際投資買賣建議。投資具有風險，投資人應自行評估並審慎操作。
        </p>
        <p className="mt-2 font-mono">
          Portfolio Exposure Calculator © 2026. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
