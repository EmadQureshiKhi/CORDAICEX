const TechnicalAnalysis = {
    calculateRSI(data, period = 14) {
        // Basic RSI implementation
        const prices = data.map(candle => parseFloat(candle[4])); // Close prices
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < prices.length; i++) {
            const difference = prices[i] - prices[i - 1];
            gains.push(difference > 0 ? difference : 0);
            losses.push(difference < 0 ? Math.abs(difference) : 0);
        }
        
        const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
        
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        
        return rsi;
    },

    calculateMACD(data) {
        const closes = data.map(candle => parseFloat(candle[4]));
        const ema12 = this.calculateEMA(closes, 12);
        const ema26 = this.calculateEMA(closes, 26);
        const macd = ema12 - ema26;
        const signal = this.calculateEMA([macd], 9);
        
        return {
            macd,
            signal,
            histogram: macd - signal
        };
    },

    calculateBollingerBands(data) {
        const period = 20;
        const stdDevMultiplier = 2;
        const closes = data.map(candle => parseFloat(candle[4]));
        
        const sma = this.calculateSMA(closes, period);
        const stdDev = this.calculateStdDev(closes, period);
        
        return {
            middle: sma,
            upper: sma + (stdDev * stdDevMultiplier),
            lower: sma - (stdDev * stdDevMultiplier)
        };
    },

    calculateEMA(data, period) {
        const k = 2 / (period + 1);
        let ema = data[0];
        
        for (let i = 1; i < data.length; i++) {
            ema = (data[i] * k) + (ema * (1 - k));
        }
        
        return ema;
    },

    calculateSMA(data, period) {
        return data.slice(-period).reduce((a, b) => a + b, 0) / period;
    },

    calculateStdDev(data, period) {
        const mean = this.calculateSMA(data, period);
        const squareDiffs = data.map(value => Math.pow(value - mean, 2));
        const variance = this.calculateSMA(squareDiffs, period);
        return Math.sqrt(variance);
    }
};

// Export a function that creates indicators using the TechnicalAnalysis object
function calculateIndicators(ohlcvData) {
    if (!Array.isArray(ohlcvData) || ohlcvData.length === 0) {
        throw new Error('Invalid OHLCV data provided');
    }

    return {
        rsi: TechnicalAnalysis.calculateRSI.call(TechnicalAnalysis, ohlcvData),
        macd: TechnicalAnalysis.calculateMACD.call(TechnicalAnalysis, ohlcvData),
        bollinger: TechnicalAnalysis.calculateBollingerBands.call(TechnicalAnalysis, ohlcvData)
    };
}

module.exports = { calculateIndicators, ...TechnicalAnalysis };