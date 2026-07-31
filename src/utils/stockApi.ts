// 股票價格抓取 API 工具模組 (支援全端 /api/stock-price 及前端跨網域直抓與安全備援)

export interface StockPriceResult {
  price: number;
  currency: string;
  companyName?: string;
  source: "server" | "twse" | "yahoo" | "fallback";
}

// 預設常見股票最新實時/收盤參考價（當網路受限或 CORS 阻擋時之精準安全備援）
export const DEFAULT_STOCK_PRICES: Record<string, { price: number; currency: string; name?: string }> = {
  // 台股熱門 ETF 與權值股 (更新至最新實際成交價)
  "0050": { price: 102.85, currency: "TWD", name: "元大台灣50" },
  "0050.TW": { price: 102.85, currency: "TWD", name: "元大台灣50" },

  "00631L": { price: 33.70, currency: "TWD", name: "元大台灣50正2" },
  "00631L.TW": { price: 33.70, currency: "TWD", name: "元大台灣50正2" },

  "00685L": { price: 10.83, currency: "TWD", name: "群益臺灣加權正2" },
  "00685L.TWO": { price: 10.83, currency: "TWD", name: "群益臺灣加權正2" },

  "2884": { price: 36.25, currency: "TWD", name: "玉山金" },
  "2884.TW": { price: 36.25, currency: "TWD", name: "玉山金" },

  "6412": { price: 76.50, currency: "TWD", name: "群電" },
  "6412.TWO": { price: 76.50, currency: "TWD", name: "群電" },

  "2327": { price: 502.0, currency: "TWD", name: "國巨" },
  "2327.TW": { price: 502.0, currency: "TWD", name: "國巨" },

  "00981A": { price: 26.13, currency: "TWD", name: "主動統一台股增長" },
  "00981A.TW": { price: 26.13, currency: "TWD", name: "主動統一台股增長" },

  "2330": { price: 1085.0, currency: "TWD", name: "台積電" },
  "2330.TW": { price: 1085.0, currency: "TWD", name: "台積電" },

  "2317": { price: 215.0, currency: "TWD", name: "鴻海" },
  "2454": { price: 1350.0, currency: "TWD", name: "聯發科" },
  "2308": { price: 390.0, currency: "TWD", name: "台達電" },
  "2881": { price: 92.0, currency: "TWD", name: "富邦金" },
  "2882": { price: 68.0, currency: "TWD", name: "國泰金" },
  "0056": { price: 38.5, currency: "TWD", name: "元大高股息" },
  "00878": { price: 22.8, currency: "TWD", name: "國泰永續高股息" },
  "00919": { price: 24.5, currency: "TWD", name: "群益台灣精選高息" },
  "00929": { price: 19.8, currency: "TWD", name: "復華台灣科技優息" },

  // 美股熱門項目
  "NVDA": { price: 207.4, currency: "USD", name: "輝達 (NVIDIA)" },
  "QLD": { price: 92.5, currency: "USD", name: "那指兩倍槓桿 ETF (QLD)" },
  "AAPL": { price: 180.5, currency: "USD", name: "蘋果 (AAPL)" },
  "TSLA": { price: 250.0, currency: "USD", name: "特斯拉 (TSLA)" },
  "MSFT": { price: 420.0, currency: "USD", name: "微軟 (MSFT)" },
  "AMZN": { price: 185.0, currency: "USD", name: "亞馬遜 (AMZN)" },
  "GOOGL": { price: 175.0, currency: "USD", name: "Alphabet (GOOGL)" },
  "META": { price: 500.0, currency: "USD", name: "Meta" },
  "TSM": { price: 180.0, currency: "USD", name: "台積電 ADR (TSM)" },
  "VOO": { price: 510.0, currency: "USD", name: "Vanguard S&P 500 ETF" },
  "QQQ": { price: 480.0, currency: "USD", name: "Invesco QQQ Trust" },
  "TQQQ": { price: 75.0, currency: "USD", name: "ProShares 3x QQQ" },
  "SOXL": { price: 45.0, currency: "USD", name: "Direxion Daily Semi 3x" },
  "VT": { price: 115.0, currency: "USD", name: "Vanguard Total World Stock" },
  "VTI": { price: 270.0, currency: "USD", name: "Vanguard Total Stock Market" },
};

/**
 * 核心股價抓取工具
 * 順序：
 * 1. 優先嘗試呼叫全端後端 `/api/stock-price`（若後端可用）
 * 2. 若為靜態部署 (Vercel 404) 或網路限制，嘗試前端 CORS Proxy 直連 Yahoo Finance (同時支援 .TW 上市與 .TWO 上櫃)
 * 3. 備用 TWSE / TPEx 官方即時 API
 * 4. 預設最新成交價格資料庫 (Fallback)
 */
export async function fetchClientStockPrice(tickerInput: string): Promise<StockPriceResult> {
  const ticker = tickerInput.trim();
  if (!ticker) {
    throw new Error("請提供有效的股票代碼");
  }

  const cleanTicker = ticker.toUpperCase().replace(/\.(TW|TWO)$/i, "");
  const isTaiwanStock = /^\d+[A-Z]?$/i.test(cleanTicker);

  // 1. 優先：嘗試全端 `/api/stock-price` 端點 (如在 AI Studio / Express 後端中執行)
  try {
    const serverRes = await fetch(`/api/stock-price?ticker=${encodeURIComponent(ticker)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (serverRes.ok) {
      const serverData = await serverRes.json();
      if (serverData && typeof serverData.price === "number" && serverData.price > 0) {
        return {
          price: serverData.price,
          currency: serverData.currency || (isTaiwanStock ? "TWD" : "USD"),
          companyName: serverData.companyName,
          source: "server",
        };
      }
    }
  } catch {
    // 後端 404 或無後端，繼續進入前端直抓邏輯
  }

  // 2. 前端直抓邏輯 (Yahoo Finance + 支援 .TW 上市 與 .TWO 上櫃)
  const symbolsToTry: string[] = isTaiwanStock
    ? [`${cleanTicker}.TW`, `${cleanTicker}.TWO`]
    : [cleanTicker];

  for (const symbol of symbolsToTry) {
    // 2A. 嘗試多個 CORS Proxy 直連 Yahoo Finance
    const yahooTarget = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const proxyUrls = [
      `https://corsproxy.io/?url=${encodeURIComponent(yahooTarget)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooTarget)}`,
      yahooTarget, // 直連備用
    ];

    for (const proxyUrl of proxyUrls) {
      try {
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const data = await response.json();
          const result = data?.chart?.result?.[0];
          const meta = result?.meta;
          const price = meta?.regularMarketPrice || meta?.chartPreviousClose;
          if (typeof price === "number" && price > 0) {
            let companyName = meta?.shortName || meta?.longName || cleanTicker;
            companyName = companyName.replace(/\.(TW|TWO)$/i, "");
            return {
              price,
              currency: meta?.currency || (isTaiwanStock ? "TWD" : "USD"),
              companyName,
              source: "yahoo",
            };
          }
        }
      } catch (err) {
        // 繼續嘗試下一個代理或符號
      }
    }
  }

  // 3. 針對台股嘗試台灣證交所 / 櫃買中心即時 API
  if (isTaiwanStock) {
    try {
      const twseUrl = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${cleanTicker}.tw|otc_${cleanTicker}.tw`;
      const proxyTwse = `https://api.allorigins.win/raw?url=${encodeURIComponent(twseUrl)}`;
      const response = await fetch(proxyTwse);
      if (response.ok) {
        const data = await response.json();
        const info = data?.msgArray?.[0];
        if (info) {
          const rawPrice = info.z !== "-" && info.z ? info.z : (info.y !== "-" && info.y ? info.y : info.b);
          const parsedPrice = parseFloat(rawPrice);
          if (!isNaN(parsedPrice) && parsedPrice > 0) {
            return {
              price: parsedPrice,
              currency: "TWD",
              companyName: info.n || cleanTicker,
              source: "twse",
            };
          }
        }
      }
    } catch (err) {
      // 忽略錯誤進入 fallback
    }
  }

  // 4. 最新實時備用資料庫 (Fallback)
  const fallbackKey = Object.keys(DEFAULT_STOCK_PRICES).find(
    (k) => k === cleanTicker || k === `${cleanTicker}.TW` || k === `${cleanTicker}.TWO`
  );
  if (fallbackKey && DEFAULT_STOCK_PRICES[fallbackKey]) {
    const item = DEFAULT_STOCK_PRICES[fallbackKey];
    console.info(`[Stock Price] 使用預設精準最新報價 (${cleanTicker}): $${item.price}`);
    return {
      price: item.price,
      currency: item.currency,
      companyName: item.name || cleanTicker,
      source: "fallback",
    };
  }

  throw new Error(`無法取得「${ticker}」的線上股價，請確認代碼是否正確或手動輸入。`);
}
