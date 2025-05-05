const EmperorAnalysis = {
    calculateEMA(data, period) {
        const k = 2 / (period + 1);
        let ema = data[0];
        
        for (let i = 1; i < data.length; i++) {
            ema = (data[i] * k) + (ema * (1 - k));
        }
        
        return ema;
    },

    analyzeRisk(data) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid data provided for risk analysis');
        }

        try {
            // Extract closes and volumes
            const closes = data.map(candle => {
                const close = parseFloat(candle[4]);
                if (isNaN(close)) throw new Error('Invalid closing price');
                return close;
            });

            const volumes = data.map(candle => {
                const volume = parseFloat(candle[5]);
                if (isNaN(volume)) throw new Error('Invalid volume');
                return volume;
            });
            
            // Calculate volatility
            const returns = [];
            for (let i = 1; i < closes.length; i++) {
                if (closes[i-1] === 0) continue;
                returns.push((closes[i] - closes[i-1]) / closes[i-1]);
            }
            
            const volatility = this.calculateStdDev(returns) * Math.sqrt(365) * 100;
            
            // Calculate volume trend
            const volumeSMA = this.calculateSMA(volumes, 20);
            const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
            const volumeTrend = ((recentVolume - volumeSMA) / volumeSMA) * 100;
            
            // Calculate momentum
            const startPrice = closes[0];
            const endPrice = closes[closes.length - 1];
            const momentum = ((endPrice - startPrice) / startPrice) * 100;
            
            // Calculate risk score
            const riskScore = this.calculateRiskScore(volatility, volumeTrend, momentum);
            
            return {
                volatility,
                volumeTrend,
                momentum,
                riskScore
            };
        } catch (error) {
            console.error('Risk analysis error:', error);
            throw error;
        }
    },

    calculateSMA(data, period) {
        if (data.length < period) return data.reduce((a, b) => a + b, 0) / data.length;
        return data.slice(-period).reduce((a, b) => a + b, 0) / period;
    },

    calculateStdDev(data) {
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / data.length);
    },

    calculateRiskScore(volatility, volumeTrend, momentum) {
        // Normalize inputs to 0-100 scale
        const volScore = Math.min(100, Math.abs(volatility));
        const volTrendScore = Math.min(100, Math.abs(volumeTrend));
        const momScore = Math.min(100, Math.abs(momentum));
        
        // Weight the components
        const weightedScore = (
            (volScore * 0.5) +      // 50% weight to volatility
            (volTrendScore * 0.3) + // 30% weight to volume trend
            (momScore * 0.2)        // 20% weight to momentum
        );
        
        return Math.min(100, Math.max(0, weightedScore));
    },

    analyzeTrend(data) {
        try {
            const closes = data.map(candle => parseFloat(candle[4]));
            
            // Calculate EMAs for trend direction
            const ema20 = this.calculateEMA(closes, 20);
            const ema50 = this.calculateEMA(closes, 50);
            
            // Calculate momentum
            const momentum = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;
            
            // Calculate trend strength using price action
            const highs = data.map(candle => parseFloat(candle[2]));
            const lows = data.map(candle => parseFloat(candle[3]));
            
            let highersHighs = 0;
            let lowersLows = 0;
            
            for (let i = 5; i < data.length; i++) {
                const prevHigh = Math.max(...highs.slice(i-5, i));
                const prevLow = Math.min(...lows.slice(i-5, i));
                
                if (highs[i] > prevHigh) highersHighs++;
                if (lows[i] < prevLow) lowersLows++;
            }
            
            // Determine trend direction
            const direction = ema20 > ema50 ? 'UP' : 
                            ema20 < ema50 ? 'DOWN' : 'SIDEWAYS';
            
            // Calculate trend strength (0-100)
            const strength = ((highersHighs + lowersLows) / (data.length * 2)) * 100;
            
            return {
                direction,
                strength,
                momentum
            };
        } catch (error) {
            console.error('Trend analysis error:', error);
            throw error;
        }
    },

    analyzeVolume(data) {
        try {
            const volumes = data.map(candle => parseFloat(candle[5]));
            const closes = data.map(candle => parseFloat(candle[4]));
            
            // Calculate volume trend
            const volumeSMA = this.calculateSMA(volumes, 20);
            const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
            const volumeTrend = ((recentVolume - volumeSMA) / volumeSMA) * 100;
            
            // Calculate price-volume correlation
            const correlation = this.calculateCorrelation(closes, volumes);
            
            // Detect abnormal volume
            const volumeStdDev = this.calculateStdDev(volumes);
            const volumeMean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
            const abnormalVolume = recentVolume > (volumeMean + (2 * volumeStdDev));
            
            return {
                volumeTrend,
                priceVolumeCorrelation: correlation,
                abnormalVolume
            };
        } catch (error) {
            console.error('Volume analysis error:', error);
            throw error;
        }
    },

    calculateCorrelation(x, y) {
        const n = x.length;
        const sum_x = x.reduce((a, b) => a + b, 0);
        const sum_y = y.reduce((a, b) => a + b, 0);
        const sum_xy = x.reduce((acc, curr, i) => acc + curr * y[i], 0);
        const sum_x2 = x.reduce((a, b) => a + b * b, 0);
        const sum_y2 = y.reduce((a, b) => a + b * b, 0);
        
        const correlation = (n * sum_xy - sum_x * sum_y) / 
            Math.sqrt((n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y));
        
        return isNaN(correlation) ? 0 : correlation;
    },

    analyzeTraders(data) {
        try {
            const volumes = data.map(candle => parseFloat(candle[5]));
            const prices = data.map(candle => parseFloat(candle[4]));
            const currentPrice = prices[prices.length - 1];
            
            // Identify large transactions (whale moves)
            const volumeMean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
            const volumeStdDev = this.calculateStdDev(volumes);
            const whaleThreshold = volumeMean + (2 * volumeStdDev);
            
            const whaleMoves = volumes.filter(v => v > whaleThreshold).length;
            const whaleVolumes = volumes.filter(v => v > whaleThreshold);
            const avgWhaleVolume = whaleVolumes.length > 0 ? 
                whaleVolumes.reduce((a, b) => a + b, 0) / whaleVolumes.length : 0;
            
            // Find significant price levels within ±10% of current price
            const priceRange = currentPrice * 0.1; // 10% range
            const minPrice = currentPrice - priceRange;
            const maxPrice = currentPrice + priceRange;
            
            const significantLevels = this.findSignificantLevels(prices, currentPrice, minPrice, maxPrice);
            
            return {
                whaleMovements: whaleMoves,
                averageWhaleVolume: avgWhaleVolume,
                significantLevels
            };
        } catch (error) {
            console.error('Traders analysis error:', error);
            throw error;
        }
    },

    findSignificantLevels(prices, currentPrice, minPrice, maxPrice) {
        const levels = [];
        const window = 20;
        
        for (let i = window; i < prices.length - window; i++) {
            const leftPrices = prices.slice(i - window, i);
            const rightPrices = prices.slice(i + 1, i + window + 1);
            const price = prices[i];
            
            // Only consider levels within the valid range
            if (price >= minPrice && price <= maxPrice) {
                if (price > Math.max(...leftPrices) && price > Math.max(...rightPrices)) {
                    levels.push({ price, type: 'resistance' });
                }
                if (price < Math.min(...leftPrices) && price < Math.min(...rightPrices)) {
                    levels.push({ price, type: 'support' });
                }
            }
        }
        
        // Sort levels by price and filter to get closest support and resistance
        const sortedLevels = levels.sort((a, b) => a.price - b.price);
        const support = sortedLevels.filter(l => l.type === 'support' && l.price < currentPrice)
            .slice(-1)[0] || { price: currentPrice * 0.95, type: 'support' };
        const resistance = sortedLevels.filter(l => l.type === 'resistance' && l.price > currentPrice)
            [0] || { price: currentPrice * 1.05, type: 'resistance' };
        
        return [resistance, support];
    },

    analyzeEMACrossover(data) {
        const closes = data.map(candle => parseFloat(candle[4]));
        const ema20 = this.calculateEMA(closes, 20);
        const ema50 = this.calculateEMA(closes, 50);
        
        return {
            ema20,
            ema50,
            crossover: ema20 > ema50 ? 'BULLISH' : 'BEARISH'
        };
    },

    analyze200EMASupport(data) {
        const closes = data.map(candle => parseFloat(candle[4]));
        const ema200 = this.calculateEMA(closes, 200);
        const currentPrice = closes[closes.length - 1];
        
        return {
            ema200,
            position: currentPrice > ema200 ? 'ABOVE' : 'BELOW',
            strength: Math.abs((currentPrice - ema200) / ema200) * 100
        };
    },

    findPattern(data, patternType) {
        if (!Array.isArray(data) || data.length < 30) {
            return { found: false, message: 'Insufficient data points' };
        }

        const highs = data.map(candle => parseFloat(candle[2]));
        const lows = data.map(candle => parseFloat(candle[3]));
        const closes = data.map(candle => parseFloat(candle[4]));
        
        switch (patternType.toLowerCase()) {
            case 'bull-flag':
                return this.findBullFlag(highs, lows, closes);
            case 'bear-flag':
                return this.findBearFlag(highs, lows, closes);
            case 'double-bottom':
                return this.findDoubleBottom(lows, closes);
            case 'double-top':
                return this.findDoubleTop(highs, closes);
            case 'head-shoulders':
                return this.findHeadAndShoulders(highs, lows);
            default:
                return { found: false, message: 'Pattern not supported' };
        }
    },

    findBullFlag(highs, lows, closes) {
        // Look for strong uptrend followed by consolidation
        const uptrend = this.detectUptrend(closes.slice(-20));
        const consolidation = this.detectConsolidation(closes.slice(-10));
        
        if (uptrend && consolidation) {
            // Calculate pattern strength based on trend and consolidation
            const trendStrength = uptrend.strength;
            const priceRange = (Math.max(...highs.slice(-10)) - Math.min(...lows.slice(-10))) / closes[closes.length - 1] * 100;
            const volumeDecline = this.calculateVolumeTrend(closes.slice(-10));
            
            const strength = (
                trendStrength * 0.5 +           // 50% weight to trend strength
                (100 - priceRange) * 0.3 +      // 30% weight to tight consolidation
                (100 - volumeDecline) * 0.2     // 20% weight to declining volume
            );

            if (strength < 70) return { found: false };

            return {
                found: true,
                pattern: 'BULL FLAG',
                strength: strength,
                target: closes[closes.length - 1] * 1.1,
                stop: Math.min(...lows.slice(-5))
            };
        }
        
        return { found: false };
    },

    findBearFlag(highs, lows, closes) {
        // Look for strong downtrend followed by consolidation
        const downtrend = this.detectDowntrend(closes.slice(-20));
        const consolidation = this.detectConsolidation(closes.slice(-10));
        
        if (downtrend && consolidation) {
            // Calculate pattern strength based on trend and consolidation
            const trendStrength = downtrend.strength;
            const priceRange = (Math.max(...highs.slice(-10)) - Math.min(...lows.slice(-10))) / closes[closes.length - 1] * 100;
            const volumeDecline = this.calculateVolumeTrend(closes.slice(-10));
            
            const strength = (
                trendStrength * 0.5 +           // 50% weight to trend strength
                (100 - priceRange) * 0.3 +      // 30% weight to tight consolidation
                (100 - volumeDecline) * 0.2     // 20% weight to declining volume
            );

            if (strength < 70) return { found: false };

            return {
                found: true,
                pattern: 'BEAR FLAG',
                strength: strength,
                target: closes[closes.length - 1] * 0.9,
                stop: Math.max(...highs.slice(-5))
            };
        }
        
        return { found: false };
    },

    findDoubleBottom(lows, closes) {
        const window = 20;
        const bottoms = [];
        
        // Find local bottoms
        for (let i = 1; i < lows.length - 1; i++) {
            if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) {
                bottoms.push({ price: lows[i], index: i });
            }
        }
        
        // Look for two similar bottoms
        for (let i = 0; i < bottoms.length - 1; i++) {
            for (let j = i + 1; j < bottoms.length; j++) {
                const priceDiff = Math.abs(bottoms[i].price - bottoms[j].price);
                const indexDiff = bottoms[j].index - bottoms[i].index;
                
                // Calculate pattern quality metrics
                const priceSymmetry = 1 - (priceDiff / bottoms[i].price);
                const spacing = Math.min(indexDiff / window, 3) / 3;
                const breakout = (closes[closes.length - 1] - bottoms[j].price) / bottoms[j].price;
                const volume = this.calculateVolumeTrend(closes.slice(-10));
                
                if (priceSymmetry > 0.95 && spacing > 0.5 && breakout > 0) {
                    const strength = (
                        priceSymmetry * 40 +    // 40% weight to price symmetry
                        spacing * 30 +           // 30% weight to proper spacing
                        breakout * 20 +          // 20% weight to breakout
                        (1 - volume) * 10        // 10% weight to volume pattern
                    );

                    return {
                        found: true,
                        pattern: 'DOUBLE BOTTOM',
                        strength: Math.max(70, Math.min(strength, 100)),
                        target: closes[closes.length - 1] * 1.1,
                        stop: Math.min(bottoms[i].price, bottoms[j].price) * 0.99
                    };
                }
            }
        }
        
        return { found: false };
    },

    findDoubleTop(highs, closes) {
        const window = 20;
        const tops = [];
        
        // Find local tops
        for (let i = 1; i < highs.length - 1; i++) {
            if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) {
                tops.push({ price: highs[i], index: i });
            }
        }
        
        // Look for two similar tops
        for (let i = 0; i < tops.length - 1; i++) {
            for (let j = i + 1; j < tops.length; j++) {
                const priceDiff = Math.abs(tops[i].price - tops[j].price);
                const indexDiff = tops[j].index - tops[i].index;
                
                // Calculate pattern quality metrics
                const priceSymmetry = 1 - (priceDiff / tops[i].price);
                const spacing = Math.min(indexDiff / window, 3) / 3;
                const breakdown = (tops[j].price - closes[closes.length - 1]) / tops[j].price;
                const volume = this.calculateVolumeTrend(closes.slice(-10));
                
                if (priceSymmetry > 0.95 && spacing > 0.5 && breakdown > 0) {
                    const strength = (
                        priceSymmetry * 40 +    // 40% weight to price symmetry
                        spacing * 30 +           // 30% weight to proper spacing
                        breakdown * 20 +         // 20% weight to breakdown
                        (1 - volume) * 10        // 10% weight to volume pattern
                    );

                    return {
                        found: true,
                        pattern: 'DOUBLE TOP',
                        strength: Math.max(70, Math.min(strength, 100)),
                        target: closes[closes.length - 1] * 0.9,
                        stop: Math.max(tops[i].price, tops[j].price) * 1.01
                    };
                }
            }
        }
        
        return { found: false };
    },

    findHeadAndShoulders(highs, lows) {
        const window = 30;
        const peaks = [];
        
        // Find local peaks
        for (let i = 1; i < highs.length - 1; i++) {
            if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) {
                peaks.push({ price: highs[i], index: i });
            }
        }
        
        // Look for head and shoulders pattern
        for (let i = 0; i < peaks.length - 2; i++) {
            const leftShoulder = peaks[i];
            const head = peaks[i + 1];
            const rightShoulder = peaks[i + 2];
            
            // Calculate pattern quality metrics
            const shoulderSymmetry = 1 - Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price;
            const headHeight = (head.price - Math.max(leftShoulder.price, rightShoulder.price)) / head.price;
            const spacing = Math.min((rightShoulder.index - leftShoulder.index) / window, 1);
            
            if (shoulderSymmetry > 0.9 && headHeight > 0.02 && spacing > 0.5) {
                const strength = (
                    shoulderSymmetry * 40 +     // 40% weight to shoulder symmetry
                    headHeight * 30 +            // 30% weight to head prominence
                    spacing * 30                 // 30% weight to proper spacing
                );

                return {
                    found: true,
                    pattern: 'HEAD AND SHOULDERS',
                    strength: Math.max(70, Math.min(strength, 100)),
                    target: lows[lows.length - 1] * 0.9,
                    stop: head.price * 1.01
                };
            }
        }
        
        return { found: false };
    },

    detectUptrend(prices) {
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
        
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const positiveReturns = returns.filter(r => r > 0).length / returns.length;
        
        if (avgReturn > 0.01 && positiveReturns > 0.6) {
            return {
                trend: true,
                strength: Math.min(positiveReturns * 100, 100)
            };
        }
        
        return null;
    },

    detectDowntrend(prices) {
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
        
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const negativeReturns = returns.filter(r => r < 0).length / returns.length;
        
        if (avgReturn < -0.01 && negativeReturns > 0.6) {
            return {
                trend: true,
                strength: Math.min(negativeReturns * 100, 100)
            };
        }
        
        return null;
    },

    detectConsolidation(prices) {
        const returns = prices.map((p, i) => i > 0 ? Math.abs((p - prices[i - 1]) / prices[i - 1]) : 0);
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const volatility = this.calculateStdDev(returns);
        
        return avgReturn < 0.005 && volatility < 0.01;
    },

    calculateVolumeTrend(prices) {
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push(Math.abs((prices[i] - prices[i - 1]) / prices[i - 1]));
        }
        return returns.reduce((a, b) => a + b, 0) / returns.length;
    }
};

module.exports = { EmperorAnalysis };