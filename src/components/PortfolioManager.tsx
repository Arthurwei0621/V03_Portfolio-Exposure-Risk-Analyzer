import React, { useState, useEffect } from "react";
import { Portfolio, AssetItem, ASSET_CATEGORIES } from "../types";
import { FolderHeart, Save, Download, Upload, Trash2, Plus, Sparkles, BookOpen, RefreshCw } from "lucide-react";

interface PortfolioManagerProps {
  currentAssets: AssetItem[];
  onLoadPortfolio: (assets: AssetItem[], currency: string) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
}

// 預設經典組合範本 (讓使用者能一鍵載入體驗)
const PRESET_TEMPLATES: Record<string, { name: string; currency: string; assets: AssetItem[] }> = {
  all_weather: {
    name: "全天候經典平衡防禦型 (All-Weather)",
    currency: "USD",
    assets: [
      { id: "p1", name: "SPDR S&P 500 ETF", ticker: "SPY", category: "ETF / 基金 (ETF/Fund)", value: 30000, leverage: 1.0 },
      { id: "p2", name: "20年期以上美國公債 ETF", ticker: "TLT", category: "其他資產 (Others)", value: 40000, leverage: 1.0 },
      { id: "p3", name: "黃金信託 ETF", ticker: "GLD", category: "其他資產 (Others)", value: 15000, leverage: 1.0 },
      { id: "p4", name: "大宗商品指數基金", ticker: "DBC", category: "其他資產 (Others)", value: 10000, leverage: 1.0 },
      { id: "p5", name: "美元活期存款", ticker: "CASH", category: "現金與等價物 (Cash & Equivalents)", value: 5000, leverage: 1.0 },
    ],
  },
  tech_growth: {
    name: "科技成长積極曝險型 (Tech Growth Focus)",
    currency: "USD",
    assets: [
      { id: "t1", name: "蘋果電腦", ticker: "AAPL", category: "科技資訊 (Technology)", value: 25000, leverage: 1.0 },
      { id: "t2", name: "微軟科技", ticker: "MSFT", category: "科技資訊 (Technology)", value: 20000, leverage: 1.0 },
      { id: "t3", name: "輝達半導體", ticker: "NVDA", category: "半導體 (Semiconductor)", value: 30000, leverage: 1.0 },
      { id: "t4", name: "台積電 ADR", ticker: "TSM", category: "半導體 (Semiconductor)", value: 15000, leverage: 1.0 },
      { id: "t5", name: "納斯達克兩倍槓桿 ETF", ticker: "QLD", category: "ETF / 基金 (ETF/Fund)", value: 10000, leverage: 2.0 },
    ],
  },
  twd_standard: {
    name: "台灣高股息與權值均衡型 (TWD Dividend Focus)",
    currency: "TWD",
    assets: [
      { id: "tw1", name: "元大台灣50 ETF", ticker: "0050", category: "ETF / 基金 (ETF/Fund)", value: 1200000, leverage: 1.0 },
      { id: "tw2", name: "元大高股息 ETF", ticker: "0056", category: "ETF / 基金 (ETF/Fund)", value: 800000, leverage: 1.0 },
      { id: "tw3", name: "台積電", ticker: "2330", category: "半導體 (Semiconductor)", value: 1500000, leverage: 1.0 },
      { id: "tw4", name: "富邦金控", ticker: "2881", category: "金融保險 (Finance)", value: 500000, leverage: 1.0 },
      { id: "tw5", name: "新台幣銀行活存", ticker: "CASH", category: "現金與等價物 (Cash & Equivalents)", value: 1000000, leverage: 1.0 },
    ],
  },
};

export default function PortfolioManager({
  currentAssets,
  onLoadPortfolio,
  currency,
  onCurrencyChange,
}: PortfolioManagerProps) {
  const [savedPortfolios, setSavedPortfolios] = useState<Portfolio[]>([]);
  const [newPortfolioName, setNewPortfolioName] = useState<string>("");
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);

  // 初始化：從 localStorage 載入已儲存組合
  useEffect(() => {
    try {
      const stored = localStorage.getItem("portfolio_exposure_list");
      if (stored) {
        setSavedPortfolios(JSON.parse(stored));
      }
    } catch (e) {
      console.error("無法從 localStorage 讀取投資組合資料", e);
    }
  }, []);

  // 儲存至 localStorage Helper
  const saveToLocalStorage = (list: Portfolio[]) => {
    localStorage.setItem("portfolio_exposure_list", JSON.stringify(list));
    setSavedPortfolios(list);
  };

  // 儲存當前組合
  const handleSaveCurrentPortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolioName.trim()) return;

    const newPortfolio: Portfolio = {
      id: Date.now().toString(),
      name: newPortfolioName.trim(),
      assets: currentAssets,
      baseCurrency: currency,
    };

    const updated = [...savedPortfolios.filter((p) => p.name !== newPortfolioName.trim()), newPortfolio];
    saveToLocalStorage(updated);
    setNewPortfolioName("");
    setShowSaveModal(false);
  };

  // 載入自訂組合
  const handleLoadSaved = (id: string) => {
    const target = savedPortfolios.find((p) => p.id === id);
    if (target) {
      onLoadPortfolio(target.assets, target.baseCurrency);
    }
  };

  // 刪除自訂組合
  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedPortfolios.filter((p) => p.id !== id);
    saveToLocalStorage(updated);
  };

  // 載入預設範本
  const handleLoadPreset = (key: keyof typeof PRESET_TEMPLATES) => {
    const template = PRESET_TEMPLATES[key];
    if (template) {
      onLoadPortfolio(template.assets, template.currency);
    }
  };

  // 匯出至 JSON 檔案
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(
      {
        version: "1.0",
        currency,
        assets: currentAssets,
      },
      null,
      2
    );
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `portfolio_exposure_${currency}_${new Date().toISOString().slice(0, 10)}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  // 匯入 JSON 檔案
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && Array.isArray(parsed.assets)) {
            onLoadPortfolio(parsed.assets, parsed.currency || "USD");
          } else {
            alert("檔案格式不正確，找不到 assets 資產清單！");
          }
        } catch (error) {
          alert("解析檔案失敗，請確保上傳的是正確的 JSON 格式檔案！");
        }
      };
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6" id="portfolio-manager-section">
      {/* 1. 貨幣與檔案匯出入 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-50 pb-5">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">計價幣別 (Currency):</label>
          <select
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="TWD">新台幣 TWD (NT$)</option>
            <option value="USD">美元 USD ($)</option>
            <option value="EUR">歐元 EUR (€)</option>
            <option value="JPY">日圓 JPY (¥)</option>
            <option value="CNY">人民幣 CNY (¥)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* 匯出 */}
          <button
            onClick={handleExportJSON}
            disabled={currentAssets.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:pointer-events-none"
            title="將當前設定備份匯出為 JSON 檔案"
            id="export-portfolio-btn"
          >
            <Download className="w-3.5 h-3.5" />
            <span>匯出備份</span>
          </button>

          {/* 匯入 */}
          <label className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 cursor-pointer transition-all">
            <Upload className="w-3.5 h-3.5" />
            <span>匯入備份</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
              id="import-portfolio-file"
            />
          </label>
        </div>
      </div>

      {/* 2. 經典大師與模版快捷一鍵載入 */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-emerald-500" />
          經典資產配置範本 (Quick Templates)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(PRESET_TEMPLATES).map(([key, item]) => (
            <button
              key={key}
              onClick={() => handleLoadPreset(key as any)}
              className="p-3 text-left bg-slate-50/50 hover:bg-emerald-50/30 border border-slate-100 hover:border-emerald-100 rounded-xl transition-all group active:scale-95"
              id={`preset-btn-${key}`}
            >
              <div className="text-xs font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">
                {item.name.split(" (")[0]}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                <span>{item.assets.length} 標的</span>
                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-100 font-semibold text-slate-500">
                  {item.currency}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. 本機存檔組合管理 */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <FolderHeart className="w-4 h-4 text-emerald-500" />
            已儲存的自訂組合 (My Portfolios)
          </h4>
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={currentAssets.length === 0}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 disabled:opacity-50 disabled:pointer-events-none"
            id="open-save-modal-btn"
          >
            <Save className="w-3.5 h-3.5" />
            <span>儲存當前配置</span>
          </button>
        </div>

        {showSaveModal && (
          <form onSubmit={handleSaveCurrentPortfolio} className="bg-slate-50/80 p-3.5 rounded-xl border border-emerald-100 mb-4 flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                投資組合名稱
              </label>
              <input
                type="text"
                required
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
                placeholder="例如：我的2026核心持股"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-1.5">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1.5 px-3 rounded-lg text-xs active:scale-95 transition-all"
                id="save-portfolio-confirm"
              >
                儲存
              </button>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-medium py-1.5 px-3 rounded-lg text-xs active:scale-95 transition-all"
                id="save-portfolio-cancel"
              >
                取消
              </button>
            </div>
          </form>
        )}

        {savedPortfolios.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-4 bg-slate-50/30 border border-dashed border-slate-100 rounded-xl">
            目前尚無本機存檔。您可以點選「儲存當前配置」來記錄您的常用組合。
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {savedPortfolios.map((portfolio) => (
              <div
                key={portfolio.id}
                onClick={() => handleLoadSaved(portfolio.id)}
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-slate-50 hover:bg-emerald-50/30 border border-slate-100 hover:border-emerald-100 rounded-lg text-xs font-medium text-slate-600 hover:text-emerald-700 cursor-pointer transition-all group"
                id={`saved-portfolio-item-${portfolio.id}`}
              >
                <span className="truncate max-w-[120px] font-semibold">{portfolio.name}</span>
                <span className="text-[10px] font-mono text-slate-400">({portfolio.baseCurrency})</span>
                <button
                  onClick={(e) => handleDeleteSaved(portfolio.id, e)}
                  className="p-0.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded transition-colors"
                  title="刪除此存檔"
                  id={`delete-saved-btn-${portfolio.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
