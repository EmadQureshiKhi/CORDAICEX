const axios = require('axios');

class BinanceProvider {
  constructor() {
    // Try multiple endpoints
    this.endpoints = [
      'https://api.binance.us', // Binance US API
      'https://api1.binance.com', // Binance API alternative 1
      'https://api2.binance.com', // Binance API alternative 2
      'https://api3.binance.com'  // Binance API alternative 3
    ];

    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
  }

  async tryEndpoints(path, params) {
    let lastError = null;
    
    for (const baseUrl of this.endpoints) {
      try {
        console.log(`Trying endpoint: ${baseUrl}...`);
        const response = await this.client.get(`${baseUrl}${path}`, { params });
        
        if (response.data) {
          console.log(`Successfully connected to ${baseUrl}`);
          return response.data;
        }
      } catch (error) {
        console.log(`Failed to connect to ${baseUrl}: ${error.message}`);
        lastError = error;
        continue;
      }
    }
    
    throw lastError || new Error('All endpoints failed');
  }

  async getOHLCV(symbol, interval = '1h', limit = 24) {
    try {
      console.log(`Fetching OHLCV data for ${symbol}USDT...`);
      
      // Try to get data from any available endpoint
      const data = await this.tryEndpoints('/api/v3/klines', {
        symbol: `${symbol.toUpperCase()}USDT`,
        interval,
        limit
      });

      if (!Array.isArray(data)) {
        throw new Error('Invalid OHLCV data format');
      }

      return data;
    } catch (error) {
      console.error('Binance OHLCV error:', error);
      
      // Fallback to basic price data if OHLCV fails
      const price = await this.getPrice(symbol);
      const timestamp = Date.now();
      
      // Return minimal OHLCV structure
      return [{
        openTime: timestamp,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
        closeTime: timestamp + 3600000, // 1 hour later
        quoteAssetVolume: 0,
        trades: 0,
        takerBuyBaseAssetVolume: 0,
        takerBuyQuoteAssetVolume: 0
      }];
    }
  }

  async getPrice(symbol) {
    try {
      console.log(`Fetching price for ${symbol}USDT...`);
      
      // Try to get price from any available endpoint
      const data = await this.tryEndpoints('/api/v3/ticker/price', {
        symbol: `${symbol.toUpperCase()}USDT`
      });

      if (!data || !data.price) {
        throw new Error('Invalid price data format');
      }

      return parseFloat(data.price);
    } catch (error) {
      console.error('Binance price error:', error);
      throw new Error(`Failed to fetch price: ${error.message}`);
    }
  }

  // Utility method to check if response is valid
  isValidResponse(data) {
    return data && (
      (Array.isArray(data) && data.length > 0) || // OHLCV data
      (typeof data === 'object' && data.price) // Price data
    );
  }
}

module.exports = new BinanceProvider();
