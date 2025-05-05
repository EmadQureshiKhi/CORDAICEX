const BinanceProvider = require('../../analytics/providers/binance');

class AnalyticsService {
  async analyze(symbol, interval = '1h') {
    try {
      console.log(`Starting comprehensive analysis for ${symbol}...`);
      
      // Get OHLCV data
      const ohlcvData = await BinanceProvider.getOHLCV(symbol, interval);
      
      if (!ohlcvData || !Array.isArray(ohlcvData)) {
        throw new Error('Invalid OHLCV data received');
      }

      // Safely parse the timestamp
      const timestamp = Date.now();
      const timestampStr = new Date(timestamp).toLocaleString();

      // Get current price from the latest OHLCV data
      const currentPrice = parseFloat(ohlcvData[ohlcvData.length - 1][4]); // Close price
      
      // Calculate 24h change
      const openPrice = parseFloat(ohlcvData[0][1]); // Open price
      const priceChange = ((currentPrice - openPrice) / openPrice) * 100;
      
      // Calculate basic indicators
      const prices = ohlcvData.map(candle => parseFloat(candle[4]));
      const volumes = ohlcvData.map(candle => parseFloat(candle[5]));
      
      // Simple moving averages
      const sma20 = this.calculateSMA(prices, 20);
      const sma50 = this.calculateSMA(prices, 50);
      
      // Determine trend
      const trend = sma20 > sma50 ? 'UP' : sma20 < sma50 ? 'DOWN' : 'SIDEWAYS';
      
      // Calculate volatility
      const volatility = this.calculateVolatility(prices) * 100;
      
      // Prepare analysis result
      return {
        price: currentPrice,
        timestamp: timestampStr,
        ohlcv: ohlcvData,
        indicators: {
          rsi: this.calculateRSI(prices),
          macd: {
            macd: 0,
            signal: 0,
            histogram: 0
          },
          bollinger: {
            upper: currentPrice * 1.02,
            middle: currentPrice,
            lower: currentPrice * 0.98
          }
        },
        riskAnalysis: {
          volatility,
          volumeTrend: this.calculateVolumeTrend(volumes),
          momentum: priceChange,
          riskScore: Math.min(Math.max(volatility, 0), 100)
        },
        trendAnalysis: {
          direction: trend,
          strength: Math.abs(sma20 - sma50) / currentPrice * 100,
          momentum: priceChange
        },
        volumeAnalysis: {
          volumeTrend: this.calculateVolumeTrend(volumes),
          priceVolumeCorrelation: this.calculateCorrelation(prices, volumes),
          abnormalVolume: this.isAbnormalVolume(volumes)
        },
        tradersAnalysis: {
          whaleMovements: 0,
          averageWhaleVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
          significantLevels: [
            { price: currentPrice * 1.1, type: 'RESISTANCE' },
            { price: currentPrice * 0.9, type: 'SUPPORT' }
          ]
        }
      };
    } catch (error) {
      console.error('Analytics error:', error);
      throw error;
    }
  }

  // Helper methods
  calculateSMA(data, period) {
    if (data.length < period) return data[data.length - 1];
    return data.slice(-period).reduce((sum, price) => sum + price, 0) / period;
  }

  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < prices.length; i++) {
      const difference = prices[i] - prices[i - 1];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }
    
    if (losses === 0) return 100;
    
    const relativeStrength = gains / losses;
    return 100 - (100 / (1 + relativeStrength));
  }

  calculateVolatility(prices) {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  calculateVolumeTrend(volumes) {
    if (volumes.length < 2) return 0;
    
    const firstHalf = volumes.slice(0, Math.floor(volumes.length / 2));
    const secondHalf = volumes.slice(Math.floor(volumes.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  }

  calculateCorrelation(prices, volumes) {
    if (prices.length !== volumes.length || prices.length < 2) return 0;
    
    const n = prices.length;
    const pMean = prices.reduce((a, b) => a + b, 0) / n;
    const vMean = volumes.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let pDenom = 0;
    let vDenom = 0;
    
    for (let i = 0; i < n; i++) {
      const pDiff = prices[i] - pMean;
      const vDiff = volumes[i] - vMean;
      numerator += pDiff * vDiff;
      pDenom += pDiff * pDiff;
      vDenom += vDiff * vDiff;
    }
    
    return numerator / Math.sqrt(pDenom * vDenom);
  }

  isAbnormalVolume(volumes) {
    const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const stdDev = Math.sqrt(
      volumes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / volumes.length
    );
    
    const lastVolume = volumes[volumes.length - 1];
    return Math.abs(lastVolume - mean) > stdDev * 2;
  }
}

module.exports = new AnalyticsService();
