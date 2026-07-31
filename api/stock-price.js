// api/stock-price.js
export default async function handler(req, res) {
  // 允許跨網域請求 (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { ticker } = req.query;
  if (!ticker) {
    return res.status(400).json({ error: 'Missing ticker parameter' });
  }

  try {
    // 1. 判斷是否為台股 (純數字，例如 2330, 0050)
    if (/^\d+$/.test(ticker)) {
      // 呼叫台灣證交所官方 API (不需 Token)
      const twseUrl = `https://twse.com.tw{ticker}.tw|otc_${ticker}.tw`;
      const response = await fetch(twseUrl);
      const data = await response.json();
      
      if (data.msgArray && data.msgArray.length > 0) {
        const info = data.msgArray[0];
        // z 代表當盤成交價，若剛好沒成交改拿 z 或 o (開盤)
        const price = parseFloat(info.z || info.b?.split('_')[0] || info.o); 
        return res.status(200).json({ price: price });
      }
    } 
    
    // 2. 如果是美股 (英文代碼，例如 NVDA, TSLA)
    // 這裡使用免費免 Key 的 Yahoo Finance 簡易 API
    const yahooUrl = `https://yahoo.com{ticker}`;
    const response = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' } // 模擬瀏覽器避免被 Yahoo 擋
    });
    const data = await response.json();
    const price = data.chart?.result[0]?.meta?.regularMarketPrice;
    
    if (price) {
      return res.status(200).json({ price: price });
    }

    return res.status(404).json({ error: `Ticker ${ticker} not found` });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
