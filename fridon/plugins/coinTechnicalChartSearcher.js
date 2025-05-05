const { EmperorAnalysis } = require('../analytics/indicators/emperor');
const BinanceProvider = require('../analytics/providers/binance');

class CoinTechnicalChartSearcher {
    async process(message) {
        try {
            if (!message.toLowerCase().startsWith('/search pattern')) {
                return null;
            }

            const parts = message.split(' ');
            if (parts.length < 3) {
                return "Please specify a pattern to search for (e.g., bull-flag, bear-flag, double-bottom, double-top, head-shoulders)";
            }

            const pattern = parts[2].toLowerCase();
            const symbol = parts[3]?.toUpperCase() || 'BTC';

            console.log(`Fetching OHLCV data for ${symbol}...`);
            const data = await BinanceProvider.getOHLCV(symbol, '4h', 100);
            if (!data || !Array.isArray(data)) {
                throw new Error('Invalid OHLCV data received');
            }

            console.log(`Analyzing pattern ${pattern} for ${symbol}...`);
            const patternResult = EmperorAnalysis.findPattern(data, pattern);
            const emaCrossover = EmperorAnalysis.analyzeEMACrossover(data);
            const emaSupport = EmperorAnalysis.analyze200EMASupport(data);

            const currentPrice = parseFloat(data[data.length - 1][4]);

            let response = `📊 Pattern Analysis for ${symbol}\n\n`;
            response += `Current Price: $${currentPrice.toFixed(2)}\n\n`;

            if (patternResult.found) {
                response += `✅ ${patternResult.pattern} Pattern Detected!\n`;
                response += `• Strength: ${patternResult.strength.toFixed(2)}%\n`;
                response += `• Target: $${patternResult.target.toFixed(2)} (${((patternResult.target/currentPrice - 1) * 100).toFixed(2)}%)\n`;
                response += `• Stop Loss: $${patternResult.stop.toFixed(2)} (${((patternResult.stop/currentPrice - 1) * 100).toFixed(2)}%)\n\n`;
            } else {
                response += `❌ No ${pattern} pattern found at current price levels\n\n`;
            }

            response += `📈 Technical Indicators:\n`;
            response += `• EMA Crossover: ${emaCrossover.crossover}\n`;
            response += `  - EMA20: $${emaCrossover.ema20.toFixed(2)}\n`;
            response += `  - EMA50: $${emaCrossover.ema50.toFixed(2)}\n`;
            response += `• 200 EMA: Price is ${emaSupport.position} (${emaSupport.strength.toFixed(2)}% strength)\n`;
            response += `  - EMA200: $${emaSupport.ema200.toFixed(2)}\n\n`;

            response += `⚠️ Note: This is not financial advice. Always do your own research.`;

            return response;
        } catch (error) {
            console.error('Chart analysis error:', error);
            return `Error analyzing chart: ${error.message}`;
        }
    }
}

module.exports = { CoinTechnicalChartSearcher };