const { TechnicalAnalysis } = require('../analytics/indicators/ta');
const { BinanceProvider } = require('../analytics/providers/binance');

class CoinTechnicalAnalyzer {
    async process(message) {
        try {
            const symbol = this.extractSymbol(message);
            if (!symbol) return null;

            const data = await BinanceProvider.getOHLCV(symbol, '1d');
            
            const analysis = {
                rsi: TechnicalAnalysis.calculateRSI(data),
                macd: TechnicalAnalysis.calculateMACD(data),
                bollinger: TechnicalAnalysis.calculateBollingerBands(data)
            };

            return JSON.stringify(analysis);
        } catch (error) {
            console.error('Technical analysis error:', error);
            return null;
        }
    }

    extractSymbol(message) {
        // Simple symbol extraction - can be enhanced
        const match = message.match(/\b[A-Z]{2,10}\b/);
        return match ? match[0] : null;
    }
}

module.exports = { CoinTechnicalAnalyzer };