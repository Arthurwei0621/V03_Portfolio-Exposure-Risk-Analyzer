import React, { useState } from "react";
import { AssetItem, ASSET_CATEGORIES, CURRENCY_SYMBOLS } from "../types";
import { Plus, Trash2, Edit2, Check, X, Info, Calculator, Percent, Coins, RefreshCw, Download, Upload } from "lucide-react";
import { fetchClientStockPrice } from "../utils/stockApi";

interface AssetTableProps {
  assets: AssetItem[];
  onUpdateAssets: (newAssets: AssetItem[]) => void;
  currency: string;
  totalValue: number;
}

export default function AssetTable({
  assets,
  onUpdateAssets,
  currency,
  totalValue,
}: AssetTableProps) {
  // 編輯中的項目 ID
  const [editingId, setEditingId] = useState<string | null>(null);

  // 正在獲取股價中的項目 ID 列表
  const [fetchingIds, setFetchingIds] = useState<Record<string, boolean>>({});
  // 是否正在批次更新中
  const [isBatchFetching, setIsBatchFetching] = useState(false);

  // 匯入自訂彈窗狀態
  const [importDialog, setImportDialog] = useState<{
    isOpen: boolean;
    type: "confirm" | "info" | "error" | "success";
    title: string;
    message: string;
    assetsToImport?: AssetItem[];
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  const fetchStockPrice = async (assetId: string, ticker: string) => {
    if (!ticker) return;
    setFetchingIds((prev) => ({ ...prev, [assetId]: true }));
    try {
      const data = await fetchClientStockPrice(ticker);
      if (data && typeof data.price === "number" && data.price > 0) {
        // 更新該資產
        const updated = assets.map((asset) => {
          if (asset.id === assetId) {
            const shares = asset.shares !== undefined ? asset.shares : 1;
            return {
              ...asset,
              price: data.price,
              shares: shares,
              value: data.price * shares,
            };
          }
          return asset;
        });
        onUpdateAssets(updated);
      } else {
        alert(`無法獲取「${ticker}」的今日股價，請確認代碼是否正確。`);
      }
    } catch (error) {
      console.error("Fetch stock price error:", error);
      alert(`獲取股價失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setFetchingIds((prev) => ({ ...prev, [assetId]: false }));
    }
  };

  const handleBatchFetchPrices = async () => {
    const tickersToFetch = assets.filter((asset) => asset.ticker && asset.category !== "現金與等價物 (Cash & Equivalents)");
    if (tickersToFetch.length === 0) {
      alert("目前投資組合中沒有設定代碼的資產！");
      return;
    }

    setIsBatchFetching(true);
    let successCount = 0;
    let failedTickers: string[] = [];
    let currentAssets = [...assets];

    for (const asset of tickersToFetch) {
      if (!asset.ticker) continue;
      setFetchingIds((prev) => ({ ...prev, [asset.id]: true }));
      try {
        const data = await fetchClientStockPrice(asset.ticker);
        if (data && typeof data.price === "number" && data.price > 0) {
          const shares = asset.shares !== undefined ? asset.shares : 1;
          currentAssets = currentAssets.map((item) => {
            if (item.id === asset.id) {
              return {
                ...item,
                price: data.price,
                shares: shares,
                value: data.price * shares,
              };
            }
            return item;
          });
          successCount++;
        } else {
          failedTickers.push(`${asset.name} (${asset.ticker})`);
        }
      } catch (err) {
        failedTickers.push(`${asset.name} (${asset.ticker})`);
      } finally {
        setFetchingIds((prev) => ({ ...prev, [asset.id]: false }));
      }
    }

    onUpdateAssets(currentAssets);
    setIsBatchFetching(false);

    if (failedTickers.length === 0) {
      alert(`🎉 成功更新 ${successCount} 筆股票的最新價格！`);
    } else {
      alert(`更新完成！成功：${successCount} 筆。失敗：${failedTickers.length} 筆（${failedTickers.join(", ")}），請確認代碼是否正確。`);
    }
  };

  // 匯出 CSV 為 Excel 檔案
  const handleExportCSV = () => {
    const headers = [
      "資產名稱",
      "資產代碼",
      "資產類別",
      "最新股價",
      "持股數量",
      "資產價值",
      "槓桿倍數",
      "實質曝險額",
      "曝險比例 %",
      "備註"
    ];

    const escapeCSVValue = (val: any): string => {
      if (val === undefined || val === null) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [
      "=== 投資組合資產明細表 ===",
      headers.join(",")
    ];
    
    // 如果目前資產為空，匯出一個帶有範例資料的範本
    const targetAssets = assets.length > 0 ? assets : [
      {
        id: "sample-1",
        name: "台積電",
        ticker: "2330",
        category: "半導體 (Semiconductor)" as any,
        value: 1493100,
        price: 2370,
        shares: 630,
        leverage: 1.0,
        notes: "科技核心配股範例",
      },
      {
        id: "sample-2",
        name: "銀行台幣活存",
        ticker: "CASH",
        category: "現金與等價物 (Cash & Equivalents)" as any,
        value: 400000,
        price: undefined,
        shares: undefined,
        leverage: 1.0,
        notes: "現金存款範例（股價與持股請保持空白）",
      }
    ];

    const totalVal = targetAssets.reduce((sum, asset) => sum + asset.value, 0);
    const totalEffectiveRiskValue = targetAssets
      .filter((a) => !a.category.includes("現金與等價物"))
      .reduce((sum, a) => sum + a.value * a.leverage, 0);
    const totalEffectiveValue = targetAssets.reduce((sum, asset) => sum + asset.value * asset.leverage, 0);
    
    const cashVal = targetAssets
      .filter((a) => a.category.includes("現金與等價物"))
      .reduce((sum, a) => sum + a.value, 0);
    const cashPct = totalVal > 0 ? (cashVal / totalVal) * 100 : 0;
    const equityExposure = totalVal > 0 ? (totalEffectiveRiskValue / totalVal) * 100 : 0;
    const avgLeverage = totalVal > 0 ? (totalEffectiveValue / totalVal) : 1.0;

    const currSym = CURRENCY_SYMBOLS[currency] || "$";

    for (const asset of targetAssets) {
      const pct = totalVal > 0 ? (asset.value / totalVal) * 100 : 0;
      const effValue = asset.value * asset.leverage;
      const row = [
        escapeCSVValue(asset.name),
        escapeCSVValue(asset.ticker || ""),
        escapeCSVValue(asset.category),
        escapeCSVValue(asset.price !== undefined ? asset.price : ""),
        escapeCSVValue(asset.shares !== undefined ? asset.shares : ""),
        escapeCSVValue(asset.value),
        escapeCSVValue(asset.leverage),
        escapeCSVValue(effValue),
        escapeCSVValue(pct.toFixed(2) + "%"),
        escapeCSVValue(asset.notes || ""),
      ];
      csvRows.push(row.join(","));
    }

    // 2. 計算並加入資產類別權重配置
    const categoryMap: Record<string, number> = {};
    for (const c of ASSET_CATEGORIES) {
      categoryMap[c] = 0;
    }
    for (const asset of targetAssets) {
      categoryMap[asset.category] = (categoryMap[asset.category] || 0) + asset.value;
    }
    const categoryData = Object.entries(categoryMap)
      .filter(([_, value]) => value > 0)
      .map(([category, value]) => {
        const pct = totalVal > 0 ? (value / totalVal) * 100 : 0;
        return { category, value, pct };
      })
      .sort((a, b) => b.value - a.value);

    csvRows.push(""); // 空白行
    csvRows.push("=== 資產類別權重配置 ===");
    csvRows.push(`資產類別,總資產價值 (${currency}),權重比例 %`);
    for (const cat of categoryData) {
      csvRows.push([
        escapeCSVValue(cat.category),
        escapeCSVValue(cat.value),
        escapeCSVValue(cat.pct.toFixed(2) + "%")
      ].join(","));
    }

    // 3. 計算並加入實質總曝險與風險分析統計
    csvRows.push(""); // 空白行
    csvRows.push("=== 實質曝險與槓桿風險分析 ===");
    csvRows.push("分析指標,數值,指標說明");
    
    csvRows.push([
      "總資產市值",
      escapeCSVValue(`${currSym}${totalVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`),
      "實際擁有的資產總和 (名目本金)"
    ].join(","));

    csvRows.push([
      "風險資產實質曝險額",
      escapeCSVValue(`${currSym}${totalEffectiveRiskValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`),
      "考慮槓桿後的風險資產曝險總值"
    ].join(","));

    csvRows.push([
      "風險資產實質曝險比例",
      escapeCSVValue(`${equityExposure.toFixed(2)}%`),
      "風險資產實質曝險總額 / 總資產市值 (高於 100% 代表使用了槓桿，高於 90% 為高風險偏好)"
    ].join(","));

    csvRows.push([
      "現金與等價物金額",
      escapeCSVValue(`${currSym}${cashVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`),
      "安全流動性存款總和"
    ].join(","));

    csvRows.push([
      "現金與等價物佔比",
      escapeCSVValue(`${cashPct.toFixed(2)}%`),
      "安全流動資金佔比"
    ].join(","));

    csvRows.push([
      "實質平均槓桿倍數",
      escapeCSVValue(`${avgLeverage.toFixed(2)}x`),
      "考慮槓桿後的總曝險額 / 總資產市值"
    ].join(","));

    const csvString = "\ufeff" + csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", assets.length > 0 ? `資產配置與風險分析_${new Date().toISOString().slice(0, 10)}.csv` : "資產與曝險分析範本_Excel.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // RFC 4180 標準 CSV 解析器
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            cell += '"';
            i++; // 跳過下一個引號
          } else {
            inQuotes = false;
          }
        } else {
          cell += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          row.push(cell.trim());
          cell = "";
        } else if (char === '\r' || char === '\n') {
          row.push(cell.trim());
          cell = "";
          if (row.length > 0 && row.some(c => c !== "")) {
            lines.push(row);
          }
          row = [];
          if (char === '\r' && nextChar === '\n') {
            i++; // 跳過換行
          }
        } else {
          cell += char;
        }
      }
    }
    
    if (cell || row.length > 0) {
      row.push(cell.trim());
      if (row.length > 0 && row.some(c => c !== "")) {
        lines.push(row);
      }
    }
    
    return lines;
  };

  // 匯入 CSV / Excel
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error("檔案內容為空");

        const rows = parseCSV(text);
        if (rows.length === 0) {
          setImportDialog({
            isOpen: true,
            type: "error",
            title: "匯入失敗",
            message: "檔案中沒有足夠的資料列，或者是空白檔案。"
          });
          return;
        }

        // 尋找真正的標頭列 (Header Row)
        // 因為有可能有 "=== 投資組合資產明細表 ===" 這種裝飾行，我們過濾一下
        let headerRowIndex = -1;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const hasNameCol = row.some(cell => {
            const c = cell.trim().toLowerCase();
            return ["資產名稱", "股票名稱", "名稱", "name"].some(k => c.includes(k));
          });
          if (hasNameCol) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          setImportDialog({
            isOpen: true,
            type: "error",
            title: "找不到標頭欄位",
            message: "匯入失敗：找不到對應的「資產名稱」欄位！\n請確認您的 CSV 第一列或前幾列標頭包含「資產名稱」、「名稱」或「Name」。"
          });
          return;
        }

        const headerRow = rows[headerRowIndex].map(h => h.trim().toLowerCase());
        
        // 尋找欄位索引（支援中英文、簡體、部分代稱模糊比對）
        const getIndex = (keywords: string[]) => {
          return headerRow.findIndex(h => keywords.some(k => h.includes(k)));
        };

        const nameIdx = getIndex(["資產名稱", "股票名稱", "名稱", "name"]);
        const tickerIdx = getIndex(["資產代碼", "股票代碼", "代碼", "ticker", "symbol", "code"]);
        const catIdx = getIndex(["資產類別", "類別", "category", "type"]);
        const priceIdx = getIndex(["最新股價", "股價", "單價", "price", "rate"]);
        const sharesIdx = getIndex(["持股數量", "持股數", "股數", "數量", "shares", "quantity", "count"]);
        const valueIdx = getIndex(["資產價值", "價值", "金額", "value", "amount", "total"]);
        const leverageIdx = getIndex(["槓桿倍數", "槓桿", "leverage", "factor"]);
        const notesIdx = getIndex(["備註", "說明", "notes", "note", "comment"]);

        const importedAssets: AssetItem[] = [];
        
        // 從 headerRowIndex + 1 開始解析資料
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length === 0 || row.every(cell => cell === "")) continue;

          // 如果遇到以 === 開頭的列，代表資料列已經結束，接下來是裝飾或統計區
          if (row[0] && row[0].trim().startsWith("===")) {
            break;
          }

          const name = row[nameIdx] || "";
          if (!name || name.trim().startsWith("===")) continue; // 跳過無名稱或裝飾列

          const ticker = tickerIdx !== -1 && row[tickerIdx] ? row[tickerIdx].trim() : undefined;
          
          // 類別比對與模糊匹配
          let category = "其他資產 (Others)";
          if (catIdx !== -1 && row[catIdx]) {
            const rawCat = row[catIdx].trim();
            const matchedCat = ASSET_CATEGORIES.find(c => 
              c.toLowerCase().includes(rawCat.toLowerCase()) || 
              rawCat.toLowerCase().includes(c.toLowerCase())
            );
            
            if (matchedCat) {
              category = matchedCat;
            } else {
              // 精準/模糊關鍵字轉換為系統定義類別
              if (rawCat.includes("科技") || rawCat.includes("Tech")) category = "科技資訊 (Technology)";
              else if (rawCat.includes("金融") || rawCat.includes("銀行") || rawCat.includes("保險") || rawCat.includes("Finance")) category = "金融保險 (Finance)";
              else if (rawCat.includes("半導體") || rawCat.includes("晶片") || rawCat.includes("Semiconductor")) category = "半導體 (Semiconductor)";
              else if (rawCat.includes("ETF") || rawCat.includes("基金") || rawCat.includes("Fund")) category = "ETF / 基金 (ETF/Fund)";
              else if (rawCat.includes("消費") || rawCat.includes("民生") || rawCat.includes("Consumer")) category = "民生消費 (Consumer)";
              else if (rawCat.includes("生技") || rawCat.includes("醫療") || rawCat.includes("藥") || rawCat.includes("Healthcare")) category = "生技醫療 (Healthcare)";
              else if (rawCat.includes("能源") || rawCat.includes("材料") || rawCat.includes("Energy")) category = "能源與材料 (Energy/Materials)";
              else if (rawCat.includes("航運") || rawCat.includes("航空") || rawCat.includes("航太") || rawCat.includes("Shipping")) category = "航運與航太 (Shipping/Aerospace)";
              else if (rawCat.includes("現金") || rawCat.includes("存款") || rawCat.includes("台幣") || rawCat.includes("Cash")) category = "現金與等價物 (Cash & Equivalents)";
            }
          }

          // 清理數值格式（移除錢記號、逗號、單位字等）
          const cleanNumStr = (str: string) => {
            if (!str) return "";
            return str.replace(/[$,NT\s,股倍xX次％%]/g, "");
          };

          const priceVal = priceIdx !== -1 && row[priceIdx] ? Number(cleanNumStr(row[priceIdx])) : undefined;
          const sharesVal = sharesIdx !== -1 && row[sharesIdx] ? Number(cleanNumStr(row[sharesIdx])) : undefined;
          const leverageVal = leverageIdx !== -1 && row[leverageIdx] ? Number(cleanNumStr(row[leverageIdx])) : 1.0;
          const notes = notesIdx !== -1 && row[notesIdx] ? row[notesIdx].trim() : undefined;

          let value = 0;
          if (valueIdx !== -1 && row[valueIdx]) {
            value = Number(cleanNumStr(row[valueIdx])) || 0;
          }

          const isCash = category === "現金與等價物 (Cash & Equivalents)";
          const hasPriceAndShares = typeof priceVal === "number" && !isNaN(priceVal) && typeof sharesVal === "number" && !isNaN(sharesVal);
          
          if (!isCash && hasPriceAndShares) {
            value = priceVal * sharesVal;
          }

          const assetItem: AssetItem = {
            id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            name,
            ticker: ticker || undefined,
            category,
            value: isNaN(value) ? 0 : value,
            price: (!isCash && hasPriceAndShares) ? priceVal : undefined,
            shares: (!isCash && hasPriceAndShares) ? sharesVal : undefined,
            leverage: isNaN(leverageVal) ? 1.0 : leverageVal,
            notes: notes || undefined,
          };

          importedAssets.push(assetItem);
        }

        if (importedAssets.length === 0) {
          setImportDialog({
            isOpen: true,
            type: "error",
            title: "無有效資產項目",
            message: "匯入完成，但沒有找到任何有效的資產欄位列（請確認檔案內容格式與名稱是否正確）。"
          });
          return;
        }

        // 觸發自訂對話框進行選擇
        setImportDialog({
          isOpen: true,
          type: "confirm",
          title: "匯入投資組合確認",
          message: `成功解析出 ${importedAssets.length} 筆資產項目！請選擇你要如何套用這些資產：`,
          assetsToImport: importedAssets
        });

      } catch (err: any) {
        setImportDialog({
          isOpen: true,
          type: "error",
          title: "解析失敗",
          message: `解析檔案時發生錯誤：${err?.message || err}`
        });
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  // 暫存編輯表單狀態
  const [editForm, setEditForm] = useState<Partial<AssetItem>>({});

  // 新增項目的表單狀態
  const [newAsset, setNewAsset] = useState<Partial<AssetItem>>({
    name: "",
    ticker: "",
    category: ASSET_CATEGORIES[0],
    value: 100000,
    price: undefined,
    shares: undefined,
    leverage: 1.0,
    notes: "",
  });

  // 切換新增項目的輸入模式："direct" 或 "calc"
  const [newInputMode, setNewInputMode] = useState<"direct" | "calc">("direct");
  // 切換編輯項目的輸入模式
  const [editInputMode, setEditInputMode] = useState<"direct" | "calc">("direct");
  // 是否正在查詢新資產的最新價格
  const [isFetchingNewPrice, setIsFetchingNewPrice] = useState(false);

  const currencySymbol = CURRENCY_SYMBOLS[currency] || "$";

  // 即時查詢新股票的最新價格並填入
  const handleFetchNewAssetPrice = async () => {
    const ticker = newAsset.ticker?.trim();
    if (!ticker) {
      alert("請先輸入股票代碼！例如：2330 或 NVDA");
      return;
    }
    setIsFetchingNewPrice(true);
    try {
      const data = await fetchClientStockPrice(ticker);
      if (data && typeof data.price === "number" && data.price > 0) {
        setNewAsset((prev) => ({
          ...prev,
          price: data.price,
          name: prev.name ? prev.name : data.companyName || ticker,
        }));
        // 自動切換為「單價 x 股數」模式
        setNewInputMode("calc");
      } else {
        alert(`無法獲取「${ticker}」的最新股價，請確認代碼是否正確。`);
      }
    } catch (error) {
      console.error("Fetch new asset price error:", error);
      alert(`獲取股價失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setIsFetchingNewPrice(false);
    }
  };

  // 新增項目
  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name) return;

    const isCash = newAsset.category === "現金與等價物 (Cash & Equivalents)";
    const currentMode = isCash ? "direct" : newInputMode;

    let finalValue = Number(newAsset.value) || 0;
    if (currentMode === "calc") {
      const price = Number(newAsset.price) || 0;
      const shares = Number(newAsset.shares) || 0;
      finalValue = price * shares;
    }

    const item: AssetItem = {
      id: Date.now().toString(),
      name: newAsset.name,
      ticker: newAsset.ticker || undefined,
      category: newAsset.category || ASSET_CATEGORIES[0],
      value: finalValue,
      price: currentMode === "calc" ? Number(newAsset.price) : undefined,
      shares: currentMode === "calc" ? Number(newAsset.shares) : undefined,
      leverage: Number(newAsset.leverage) ?? 1.0,
      notes: newAsset.notes || undefined,
    };

    onUpdateAssets([...assets, item]);

    // 重置表單
    setNewAsset({
      name: "",
      ticker: "",
      category: ASSET_CATEGORIES[0],
      value: 100000,
      price: undefined,
      shares: undefined,
      leverage: 1.0,
      notes: "",
    });
  };

  // 開始編輯
  const startEdit = (asset: AssetItem) => {
    setEditingId(asset.id);
    setEditForm({ ...asset });
    setEditInputMode(asset.price !== undefined && asset.shares !== undefined ? "calc" : "direct");
  };

  // 取消編輯
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // 儲存編輯
  const saveEdit = (id: string) => {
    const isCash = editForm.category === "現金與等價物 (Cash & Equivalents)";
    const currentMode = isCash ? "direct" : editInputMode;

    let finalValue = Number(editForm.value) || 0;
    if (currentMode === "calc") {
      const price = Number(editForm.price) || 0;
      const shares = Number(editForm.shares) || 0;
      finalValue = price * shares;
    }

    const updated = assets.map((asset) => {
      if (asset.id === id) {
        return {
          ...asset,
          ...editForm,
          value: finalValue,
          price: currentMode === "calc" ? Number(editForm.price) : undefined,
          shares: currentMode === "calc" ? Number(editForm.shares) : undefined,
          leverage: Number(editForm.leverage) ?? 1.0,
        } as AssetItem;
      }
      return asset;
    });

    onUpdateAssets(updated);
    setEditingId(null);
    setEditForm({});
  };

  // 刪除項目
  const handleDelete = (id: string) => {
    onUpdateAssets(assets.filter((a) => a.id !== id));
  };

  // 快速修改單一屬性
  const handleQuickFieldChange = (id: string, field: keyof AssetItem, val: any) => {
    const updated = assets.map((asset) => {
      if (asset.id === id) {
        const updatedAsset = { ...asset, [field]: val };
        if (field === "price" || field === "shares") {
          const price = field === "price" ? Number(val) : (asset.price || 0);
          const shares = field === "shares" ? Number(val) : (asset.shares || 0);
          updatedAsset.value = price * shares;
        }
        return updatedAsset as AssetItem;
      }
      return asset;
    });
    onUpdateAssets(updated);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="asset-table-section">
      {/* 表格標題區 */}
      <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-500" />
            資產明細與比重計算
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            輸入您的各項股票、ETF 或現金價值，系統將自動算出各資產的曝險佔比。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {assets.some((a) => a.ticker) && (
            <button
              type="button"
              onClick={handleBatchFetchPrices}
              disabled={isBatchFetching}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isBatchFetching
                  ? "bg-emerald-50 text-emerald-400 border-emerald-100 cursor-not-allowed"
                  : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 shadow-xs cursor-pointer"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBatchFetching ? "animate-spin" : ""}`} />
              <span>{isBatchFetching ? "正在更新股價..." : "一鍵更新所有股票最新股價"}</span>
            </button>
          )}

          {/* 匯入與匯出按鈕 */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-950 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            title="匯出為 Excel/CSV 檔案 (若無資料將下載範本)"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>匯出 Excel</span>
          </button>

          <button
            type="button"
            onClick={() => document.getElementById("csv-import-input")?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-950 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            title="自 Excel/CSV 檔案匯入資產項目"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>匯入 Excel</span>
          </button>
          <input
            type="file"
            id="csv-import-input"
            accept=".csv"
            className="hidden"
            onChange={handleImportCSV}
          />

          <div className="flex items-center gap-2 text-xs bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-100">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>支持槓桿倍數計算實質曝險 (如 2x TQQQ)</span>
          </div>
        </div>
      </div>

      {/* 資產列表 */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 tracking-wider">
              <th className="py-3 px-4">資產/股票名稱</th>
              <th className="py-3 px-4">資產類別</th>
              <th className="py-3 px-4 text-right">最新股價</th>
              <th className="py-3 px-4 text-right">持股數量</th>
              <th className="py-3 px-4 text-right">資產價值 ({currency})</th>
              <th className="py-3 px-4 text-center">槓桿倍數</th>
              <th className="py-3 px-4 text-right">實質曝險額</th>
              <th className="py-3 px-4 text-right">曝險比例 %</th>
              <th className="py-3 px-4 text-center w-24">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {assets.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Calculator className="w-10 h-10 text-slate-200" />
                    <span>尚無資產資料。請在下方新增您的第一個股票或資產！</span>
                  </div>
                </td>
              </tr>
            ) : (
              assets.map((asset) => {
                const isEditing = editingId === asset.id;
                const pct = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
                const effValue = asset.value * asset.leverage;

                return (
                  <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* 名稱代碼 */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={editForm.name || ""}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            placeholder="如：台積電"
                          />
                          <input
                            type="text"
                            value={editForm.ticker || ""}
                            onChange={(e) => setEditForm({ ...editForm, ticker: e.target.value })}
                            className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            placeholder="代碼"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-slate-700">{asset.name}</div>
                          {asset.ticker && (
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                              {asset.ticker}
                              {asset.category !== "現金與等價物 (Cash & Equivalents)" && (
                                <button
                                  type="button"
                                  onClick={() => fetchStockPrice(asset.id, asset.ticker!)}
                                  disabled={fetchingIds[asset.id]}
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-200/50 p-0.5 rounded-sm transition-all cursor-pointer"
                                  title="獲取最新股價"
                                >
                                  <RefreshCw className={`w-2.5 h-2.5 ${fetchingIds[asset.id] ? "animate-spin" : ""}`} />
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 類別 */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <select
                          value={editForm.category}
                          onChange={(e) => {
                            const cat = e.target.value;
                            const isCash = cat === "現金與等價物 (Cash & Equivalents)";
                            setEditForm({
                              ...editForm,
                              category: cat,
                              price: isCash ? undefined : editForm.price,
                              shares: isCash ? undefined : editForm.shares,
                            });
                            if (isCash) {
                              setEditInputMode("direct");
                            }
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        >
                          {ASSET_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          {asset.category.split(" (")[0]}
                        </span>
                      )}
                    </td>

                    {/* 最新股價 */}
                    <td className="py-3 px-4 text-right font-mono">
                      {isEditing ? (
                        editForm.category === "現金與等價物 (Cash & Equivalents)" ? (
                          <span className="text-slate-300">—</span>
                        ) : editInputMode === "calc" ? (
                          <div className="flex flex-col items-end">
                            <input
                              type="number"
                              placeholder="股價"
                              value={editForm.price ?? ""}
                              onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                              className="w-20 text-right px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )
                      ) : (
                        asset.category !== "現金與等價物 (Cash & Equivalents)" && asset.price !== undefined ? (
                          <div className="text-slate-700 flex items-center justify-end gap-1 font-semibold">
                            <span>
                              {currencySymbol}
                              {asset.price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )
                      )}
                    </td>

                    {/* 持股數量 */}
                    <td className="py-3 px-4 text-right font-mono">
                      {isEditing ? (
                        editForm.category === "現金與等價物 (Cash & Equivalents)" ? (
                          <span className="text-slate-300">—</span>
                        ) : editInputMode === "calc" ? (
                          <div className="flex flex-col items-end">
                            <input
                              type="number"
                              placeholder="股數"
                              value={editForm.shares ?? ""}
                              onChange={(e) => setEditForm({ ...editForm, shares: parseFloat(e.target.value) || 0 })}
                              className="w-20 text-right px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )
                      ) : (
                        asset.category !== "現金與等價物 (Cash & Equivalents)" && asset.shares !== undefined ? (
                          <span className="text-slate-600 font-medium">
                            {asset.shares.toLocaleString()} 股
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )
                      )}
                    </td>

                    {/* 資產價值 */}
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <div className="flex flex-col gap-1 items-end">
                          {editForm.category !== "現金與等價物 (Cash & Equivalents)" && (
                            <div className="flex gap-1 mb-1">
                              <button
                                type="button"
                                onClick={() => setEditInputMode("direct")}
                                className={`px-1.5 py-0.5 text-[10px] rounded transition-all ${
                                  editInputMode === "direct"
                                    ? "bg-slate-800 text-white font-semibold"
                                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                }`}
                              >
                                直接金額
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditInputMode("calc")}
                                className={`px-1.5 py-0.5 text-[10px] rounded transition-all ${
                                  editInputMode === "calc"
                                    ? "bg-slate-800 text-white font-semibold"
                                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                }`}
                              >
                                單價×股數
                              </button>
                            </div>
                          )}
                          {editInputMode === "direct" || editForm.category === "現金與等價物 (Cash & Equivalents)" ? (
                            <input
                              type="number"
                              value={editForm.value ?? ""}
                              onChange={(e) => setEditForm({ ...editForm, value: parseFloat(e.target.value) || 0 })}
                              className="w-28 text-right px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          ) : (
                            <div className="text-emerald-600 text-xs font-bold font-mono">
                              {currencySymbol}
                              {((editForm.price || 0) * (editForm.shares || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="font-mono font-bold text-slate-800">
                          {currencySymbol}
                          {asset.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </td>

                    {/* 槓桿 */}
                    <td className="py-3 px-4 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.leverage ?? 1.0}
                          onChange={(e) => setEditForm({ ...editForm, leverage: parseFloat(e.target.value) || 1.0 })}
                          className="w-16 text-center px-1 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          placeholder="例如 1.0"
                        />
                      ) : (
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            asset.leverage > 1
                              ? "bg-orange-50 text-orange-600 border border-orange-100"
                              : asset.leverage < 1 && asset.leverage !== 0
                              ? "bg-purple-50 text-purple-600 border border-purple-100"
                              : asset.leverage === 0
                              ? "bg-slate-100 text-slate-500"
                              : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          {asset.leverage}x
                        </span>
                      )}
                    </td>

                    {/* 實質曝險價值 */}
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                      {currencySymbol}
                      {effValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </td>

                    {/* 百分比 */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-semibold text-slate-700">
                          {pct.toFixed(2)}%
                        </span>
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* 操作 */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(asset.id)}
                              className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition-colors"
                              title="儲存"
                              id={`save-btn-${asset.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 hover:bg-slate-100 text-slate-400 rounded transition-colors"
                              title="取消"
                              id={`cancel-btn-${asset.id}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(asset)}
                              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors"
                              title="編輯"
                              id={`edit-btn-${asset.id}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(asset.id)}
                              className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded transition-colors"
                              title="刪除"
                              id={`delete-btn-${asset.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 新增項目表單區 */}
      <div className="p-5 bg-slate-50/50 border-t border-slate-100">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-emerald-500" />
          新增資產/股票
        </h3>
        <form onSubmit={handleAddAsset} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* 名稱與代號 */}
          <div className="md:col-span-3 grid grid-cols-6 gap-1.5">
            <div className="col-span-3">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">資產名稱</label>
              <input
                type="text"
                required
                value={newAsset.name}
                onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                placeholder="例如：台積電、現金"
                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">代碼 (選填)</label>
              <input
                type="text"
                value={newAsset.ticker || ""}
                onChange={(e) => setNewAsset({ ...newAsset, ticker: e.target.value })}
                placeholder="2330"
                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div className="col-span-1 flex flex-col justify-end">
              <button
                type="button"
                onClick={handleFetchNewAssetPrice}
                disabled={isFetchingNewPrice}
                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 flex items-center justify-center transition-all cursor-pointer h-[34px] disabled:opacity-50"
                title="即時查詢最新股價並自動帶入"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingNewPrice ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* 類別 */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">資產類別</label>
            <select
              value={newAsset.category}
              onChange={(e) => {
                const cat = e.target.value;
                setNewAsset({ ...newAsset, category: cat });
                // 股票、ETF、資訊、金融等自動轉為 股價 x 股數 試算模式
                if (cat !== "現金與等價物 (Cash & Equivalents)" && cat !== "其他資產 (Others)") {
                  setNewInputMode("calc");
                } else if (cat === "現金與等價物 (Cash & Equivalents)") {
                  setNewInputMode("direct");
                }
              }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500"
            >
              {ASSET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 輸入模式與價值欄位 */}
          <div className="md:col-span-4">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] font-medium text-slate-500">資產價值計算</label>
              {newAsset.category !== "現金與等價物 (Cash & Equivalents)" && (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewInputMode("direct")}
                    className={`px-2 py-0.5 text-[10px] rounded-md border ${
                      newInputMode === "direct"
                        ? "bg-slate-200 text-slate-700 border-slate-300 font-semibold"
                        : "bg-white text-slate-400 border-slate-200 hover:text-slate-600"
                    }`}
                  >
                    直接輸入總額
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewInputMode("calc")}
                    className={`px-2 py-0.5 text-[10px] rounded-md border ${
                      newInputMode === "calc"
                        ? "bg-slate-200 text-slate-700 border-slate-300 font-semibold"
                        : "bg-white text-slate-400 border-slate-200 hover:text-slate-600"
                    }`}
                  >
                    單價 × 股數
                  </button>
                </div>
              )}
            </div>

            {newInputMode === "direct" || newAsset.category === "現金與等價物 (Cash & Equivalents)" ? (
              <div>
                <input
                  type="number"
                  min="0"
                  value={newAsset.value ?? ""}
                  onChange={(e) => setNewAsset({ ...newAsset, value: parseFloat(e.target.value) || 0 })}
                  placeholder="輸入總值"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-2 top-2.5 text-[10px] text-slate-400 font-mono">
                      股價
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={newAsset.price ?? ""}
                      onChange={(e) => setNewAsset({ ...newAsset, price: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="w-full pl-9 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-2.5 text-[10px] text-slate-400 font-mono">
                      股數
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={newAsset.shares ?? ""}
                      onChange={(e) => setNewAsset({ ...newAsset, shares: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="w-full pl-9 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
                {/* 顯示實時試算總額 */}
                <div className="text-[10px] text-emerald-600 font-mono mt-1 text-right font-medium">
                  試算總值: {currencySymbol}
                  {((newAsset.price || 0) * (newAsset.shares || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </div>
              </div>
            )}
          </div>

          {/* 槓桿 */}
          <div className="md:col-span-1.5 col-span-1">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">槓桿 (如:1, 2, -1)</label>
            <input
              type="number"
              step="0.1"
              value={newAsset.leverage}
              onChange={(e) => setNewAsset({ ...newAsset, leverage: parseFloat(e.target.value) || 1.0 })}
              placeholder="1.0"
              className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 text-center font-semibold"
            />
          </div>

          {/* 新增按鈕 */}
          <div className="md:col-span-1.5 col-span-1">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition-all shadow-sm active:scale-95"
              id="add-asset-submit"
            >
              <Plus className="w-4 h-4" />
              <span>新增</span>
            </button>
          </div>
        </form>
      </div>

      {/* 自訂匯入與確認 Modal */}
      {importDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-all">
            {/* Modal 頂部配色與圖示 */}
            <div className={`p-6 pb-4 flex flex-col items-center text-center ${
              importDialog.type === "error" ? "bg-red-50/50" : 
              importDialog.type === "success" ? "bg-emerald-50/50" : "bg-slate-50/50"
            }`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                importDialog.type === "error" ? "bg-red-100 text-red-600" :
                importDialog.type === "success" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
              }`}>
                {importDialog.type === "error" && <X className="w-6 h-6" />}
                {importDialog.type === "success" && <Check className="w-6 h-6" />}
                {importDialog.type === "confirm" && <Info className="w-6 h-6" />}
                {importDialog.type === "info" && <Info className="w-6 h-6" />}
              </div>
              <h3 className="text-base font-bold text-slate-900">{importDialog.title}</h3>
            </div>

            {/* Modal 內文 */}
            <div className="px-6 py-4">
              <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                {importDialog.message}
              </p>
              
              {importDialog.type === "confirm" && importDialog.assetsToImport && (
                <div className="mt-3 bg-slate-50 rounded-lg p-3 max-h-36 overflow-y-auto border border-slate-100 font-mono text-[10px] text-slate-500">
                  <div className="font-semibold text-slate-700 mb-1 border-b border-slate-200 pb-1">
                    預覽解析成功的項目：
                  </div>
                  {importDialog.assetsToImport.map((asset, index) => (
                    <div key={index} className="flex justify-between py-0.5 border-b border-slate-100 last:border-0">
                      <span className="truncate max-w-[150px] font-sans font-medium text-slate-800">{asset.name}</span>
                      <span>
                        {asset.category.split(" ")[0]} | {asset.ticker || "無代碼"} | {currencySymbol}{asset.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal 底部按鈕 */}
            <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row gap-2 justify-end border-t border-slate-100">
              {importDialog.type === "confirm" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setImportDialog({ isOpen: false, type: "info", title: "", message: "" });
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const toImport = importDialog.assetsToImport || [];
                      onUpdateAssets([...assets, ...toImport]);
                      setImportDialog({
                        isOpen: true,
                        type: "success",
                        title: "匯入成功",
                        message: `🎉 已成功將 ${toImport.length} 筆資產項目合併至您現有的投資組合中！`
                      });
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
                  >
                    併入現有組合
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const toImport = importDialog.assetsToImport || [];
                      onUpdateAssets(toImport);
                      setImportDialog({
                        isOpen: true,
                        type: "success",
                        title: "匯入成功",
                        message: `🎉 已成功使用 ${toImport.length} 筆新資產項目覆蓋您的投資組合！`
                      });
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
                  >
                    覆蓋現有組合
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setImportDialog({ isOpen: false, type: "info", title: "", message: "" });
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all w-full sm:w-auto"
                >
                  確定
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
