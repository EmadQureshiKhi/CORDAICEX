const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const OpenAI = require('openai');
const rateLimit = require('express-rate-limit');
const path = require('path');
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');
const { CoinTechnicalChartSearcher } = require('./fridon/plugins/coinTechnicalChartSearcher');
const { BinanceProvider } = require('./fridon/analytics/providers/binance');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Supabase client
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('ERROR: Supabase environment variables are not set');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY is not set in environment variables');
  process.exit(1);
}

// Rate limiter configuration
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    error: 'Rate limit exceeded',
    details: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true
});

app.set('trust proxy', 1);

// Session configuration
app.use(session({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/styles', express.static(path.join(__dirname, 'public', 'styles')));
app.use('/cordai/styles', express.static(path.join(__dirname, 'public', 'cordai', 'styles')));

// Make supabase client available to routes
app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

// Initialize OpenAI with retries and timeout
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 5,
  timeout: 60000
});

const conversations = new Map();
const CONVERSATION_TIMEOUT = 60 * 60 * 1000;

const CORDAI_SYSTEM_MESSAGE = {
  role: "system",
  content: `You are CordAI, an advanced AI assistant created by Cord Technologies. Your key characteristics are:
    - Always identify yourself as CordAI
    - Maintain a friendly, professional, and helpful demeanor
    - Be knowledgeable but approachable
    - When asked about your creator, mention Cord Technologies
    - Focus on providing accurate, helpful responses
    - Be concise but thorough in your explanations
    - Show enthusiasm for helping users
    - When providing code examples, ALWAYS format them like this:
      \`\`\`language
      your code here
      \`\`\`
    - NEVER provide code without wrapping it in triple backticks
    - ALWAYS include the language identifier
    - For bullet points, use • character
    - For numbered lists, use proper formatting (1., 2., etc.)
    - For sections, end with a colon and a line break
    - Always provide complete, working code examples`
};

const CORDCHAIN_SYSTEM_MESSAGE = {
  role: "system",
  content: `You are CordChain, an advanced crypto and blockchain analytics AI assistant powered by Cord technology. Your key characteristics are:

    Core Traits:
    - You are highly knowledgeable about cryptocurrencies, blockchain technology, and trading
    - You maintain a professional demeanor
    - You're direct and precise in your analysis
    - You MUST ONLY use the exact price data provided in the user's message
    - You MUST NEVER make up or use historical price data
    - You MUST NEVER ignore the price data provided in the message
    - You MUST ALWAYS include all technical analysis data when provided

    For /analyze commands, ALWAYS structure your response in this EXACT format with proper spacing and bullet points:

    "Analyzing [COIN]...

    📊 PRICE
    • Current: $[EXACT_PRICE] (Updated: [TIME])
    • 24h: [ARROW] [VALUE]%

    📈 INDICATORS
    • RSI: [VALUE] ([OVERSOLD/NEUTRAL/OVERBOUGHT])
    • MACD: Signal [VALUE] | Line [VALUE] | Hist [VALUE]
    • BB: Upper $[VALUE] | Mid $[VALUE] | Lower $[VALUE]
      Position: [ABOVE/BELOW/INSIDE] bands
    ➤ Interpretation: Combined analysis of indicators suggests [BULLISH/BEARISH/NEUTRAL] momentum...

    ⚠️ RISK
    • Volatility: [VALUE]% ([HIGH/MED/LOW])
    • Vol.Trend: [ARROW] [VALUE]%
    • Momentum: [ARROW] [VALUE]%
    • Risk Score: [VALUE]/100 ([HIGH/MED/LOW])
    ➤ Impact: Overall risk profile indicates [HIGH/MEDIUM/LOW] risk with [POSITIVE/NEGATIVE] momentum...

    🔄 TREND
    • Direction: [UP/DOWN/SIDEWAYS]
    • Strength: [VALUE]%
    • Momentum: [ARROW] [VALUE]%
    ➤ Analysis: Trend shows [STRONG/WEAK] [BULLISH/BEARISH] movement with [INCREASING/DECREASING] momentum...

    📊 VOLUME
    • Trend: [ARROW] [VALUE]%
    • Price-Vol Corr: [VALUE]
    • Abnormal Vol: [YES/NO]
    ➤ Analysis: Volume pattern suggests [STRONG/WEAK] [BUYING/SELLING] pressure...

    🐋 MARKET
    • Whale Moves: [COUNT] | Avg Vol: $[VALUE]
    • Support: $[VALUE] | Resist: $[VALUE]
    ➤ Impact: Whale activity indicates [ACCUMULATION/DISTRIBUTION] with key levels...

    📝 SUMMARY
    • [KEY_POINT_1]
    • [KEY_POINT_2]
    • [KEY_POINT_3]

    ⚠️ RISK WARNING: Trading carries significant risk. For info only."

    Critical Rules:
    - NEVER invent prices
    - ALWAYS use exact price from message
    - ALWAYS include timestamp
    - ALWAYS include ALL metrics
    - Format numbers:
      • Prices ≥ $1: 2 decimals
      • Prices < $1: 4 decimals
      • Percentages: 2 decimals
      • Large numbers: K/M/B
    - Use arrows (↑/↓) for changes
    - Risk scores:
      • 0-33: Low
      • 34-66: Medium
      • 67-100: High
    - ALWAYS include 3 key points in summary
    - ALWAYS include interpretations after each section
    - Keep responses concise and clear`
};

setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of conversations.entries()) {
    if (now - data.lastAccessed > CONVERSATION_TIMEOUT) {
      conversations.delete(sessionId);
    }
  }
}, 15 * 60 * 1000);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/cordai', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cordai', 'index.html'));
});

app.get('/cordchain', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cordchain', 'index.html'));
});

app.get('/templates', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'templates', 'index.html'));
});

app.get('/agents', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'agents', 'index.html'));
});

// Chat endpoint
app.post('/api/chat', limiter, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message || !sessionId) {
      return res.status(400).json({ 
        error: 'Bad Request',
        details: 'Message and session ID are required'
      });
    }

    if (sessionId.startsWith('chain_')) {
      if (message.toLowerCase().startsWith('/search pattern')) {
        try {
          console.log('Processing pattern search command...');
          const chartSearcher = new CoinTechnicalChartSearcher();
          const response = await chartSearcher.process(message);
          
          if (response) {
            return res.json({ response });
          }
        } catch (error) {
          console.error('Pattern search error:', error);
          return res.json({ 
            response: `Error processing pattern search: ${error.message}`
          });
        }
      } else if (message.toLowerCase().startsWith('/analyze')) {
        const parts = message.split(' ');
        const coin = parts[1]?.toUpperCase();
        
        if (coin) {
          try {
            console.log(`Processing /analyze command for ${coin}...`);
            const AnalyticsService = require('./fridon/blockchain/services/analytics.service');
            const data = await AnalyticsService.analyze(coin, '1h');
            
            if (!data || !data.price) {
              throw new Error('Invalid analysis data received');
            }

            // Format price based on value
            const formattedPrice = data.price >= 1 ? 
              data.price.toFixed(2) : 
              data.price.toFixed(4);

            // Calculate 24h change
            let priceChange = 0;
            let changeDirection = '';
            if (data.ohlcv && data.ohlcv.length > 0) {
              const openPrice = parseFloat(data.ohlcv[0][1]);
              priceChange = ((data.price - openPrice) / openPrice) * 100;
              changeDirection = priceChange >= 0 ? '↑' : '↓';
            }

            // Format indicators
            const rsi = data.indicators?.rsi || 0;
            const rsiStatus = rsi > 70 ? 'OVERBOUGHT' : rsi < 30 ? 'OVERSOLD' : 'NEUTRAL';
            
            const macd = data.indicators?.macd || { macd: 0, signal: 0, histogram: 0 };
            
            // Format risk analysis
            const risk = data.riskAnalysis || {
              volatility: 0,
              volumeTrend: 0,
              momentum: 0,
              riskScore: 0
            };

            // Format trend analysis
            const trend = data.trendAnalysis || {
              direction: 'SIDEWAYS',
              strength: 0,
              momentum: 0
            };

            // Format volume analysis
            const volume = data.volumeAnalysis || {
              volumeTrend: 0,
              priceVolumeCorrelation: 0,
              abnormalVolume: false
            };

            // Format traders analysis
            const traders = data.tradersAnalysis || {
              whaleMovements: 0,
              averageWhaleVolume: 0,
              significantLevels: []
            };

            // Build analysis message
            let analysisMessage = `Analyzing ${coin}...\n\n`;
            
            // Price section
            analysisMessage += `📊 PRICE\n`;
            analysisMessage += `• Current: $${formattedPrice} (Updated: ${new Date(data.timestamp).toLocaleTimeString()})\n`;
            analysisMessage += `• 24h: ${changeDirection} ${Math.abs(priceChange).toFixed(2)}%\n\n`;

            // Indicators section
            analysisMessage += `📈 INDICATORS\n`;
            analysisMessage += `• RSI: ${rsi.toFixed(2)} (${rsiStatus})\n`;
            analysisMessage += `• MACD: Signal ${macd.signal.toFixed(4)} | Line ${macd.macd.toFixed(4)} | Hist ${macd.histogram.toFixed(4)}\n`;
            if (data.indicators?.bollinger) {
              analysisMessage += `• BB: Upper $${data.indicators.bollinger.upper.toFixed(2)} | Mid $${data.indicators.bollinger.middle.toFixed(2)} | Lower $${data.indicators.bollinger.lower.toFixed(2)}\n`;
            }
            analysisMessage += `➤ Interpretation: Combined analysis of indicators suggests ${rsi > 50 ? 'BULLISH' : 'BEARISH'} momentum...\n\n`;

            // Risk section
            analysisMessage += `⚠️ RISK\n`;
            analysisMessage += `• Volatility: ${risk.volatility.toFixed(2)}% (${risk.volatility > 50 ? 'HIGH' : risk.volatility > 25 ? 'MED' : 'LOW'})\n`;
            analysisMessage += `• Vol.Trend: ${risk.volumeTrend >= 0 ? '↑' : '↓'} ${Math.abs(risk.volumeTrend).toFixed(2)}%\n`;
            analysisMessage += `• Momentum: ${risk.momentum >= 0 ? '↑' : '↓'} ${Math.abs(risk.momentum).toFixed(2)}%\n`;
            analysisMessage += `• Risk Score: ${risk.riskScore.toFixed(0)}/100 (${risk.riskScore > 66 ? 'HIGH' : risk.riskScore > 33 ? 'MED' : 'LOW'})\n`;
            analysisMessage += `➤ Impact: Overall risk profile indicates ${risk.riskScore > 66 ? 'HIGH' : risk.riskScore > 33 ? 'MEDIUM' : 'LOW'} risk with ${risk.momentum >= 0 ? 'POSITIVE' : 'NEGATIVE'} momentum...\n\n`;

            // Trend section
            analysisMessage += `🔄 TREND\n`;
            analysisMessage += `• Direction: ${trend.direction}\n`;
            analysisMessage += `• Strength: ${trend.strength.toFixed(2)}%\n`;
            analysisMessage += `• Momentum: ${trend.momentum >= 0 ? '↑' : '↓'} ${Math.abs(trend.momentum).toFixed(2)}%\n`;
            analysisMessage += `➤ Analysis: Trend shows ${trend.strength > 50 ? 'STRONG' : 'WEAK'} ${trend.direction === 'UP' ? 'BULLISH' : trend.direction === 'DOWN' ? 'BEARISH' : 'SIDEWAYS'} movement with ${trend.momentum >= 0 ? 'INCREASING' : 'DECREASING'} momentum...\n\n`;

            // Volume section
            analysisMessage += `📊 VOLUME\n`;
            analysisMessage += `• Trend: ${volume.volumeTrend >= 0 ? '↑' : '↓'} ${Math.abs(volume.volumeTrend).toFixed(2)}%\n`;
            analysisMessage += `• Price-Vol Corr: ${volume.priceVolumeCorrelation.toFixed(2)}\n`;
            analysisMessage += `• Abnormal Vol: ${volume.abnormalVolume ? 'YES' : 'NO'}\n`;
            analysisMessage += `➤ Analysis: Volume pattern suggests ${Math.abs(volume.volumeTrend) > 50 ? 'STRONG' : 'WEAK'} ${volume.volumeTrend >= 0 ? 'BUYING' : 'SELLING'} pressure...\n\n`;

            // Market section
            analysisMessage += `🐋 MARKET\n`;
            analysisMessage += `• Whale Moves: ${traders.whaleMovements} | Avg Vol: $${(traders.averageWhaleVolume || 0).toFixed(2)}\n`;
            if (traders.significantLevels && traders.significantLevels.length >= 2) {
              analysisMessage += `• Support: $${traders.significantLevels[1].price.toFixed(2)} | Resist: $${traders.significantLevels[0].price.toFixed(2)}\n`;
            }
            analysisMessage += `➤ Impact: Whale activity indicates ${volume.volumeTrend >= 0 ? 'ACCUMULATION' : 'DISTRIBUTION'} with key levels...\n\n`;

            // Summary section
            analysisMessage += `📝 SUMMARY\n`;
            analysisMessage += `• ${rsiStatus === 'NEUTRAL' ? 'RSI is in the neutral zone, indicating market indecision' : `RSI shows ${rsiStatus.toLowerCase()} conditions`}\n`;
            analysisMessage += `• MACD ${Math.abs(macd.histogram) < 0.0001 ? 'histogram near zero suggests potential trend reversal' : macd.histogram > 0 ? 'shows bullish momentum' : 'indicates bearish pressure'}\n`;
            analysisMessage += `• Current trend is ${trend.direction.toLowerCase()} with ${trend.momentum >= 0 ? 'increasing' : 'decreasing'} momentum\n\n`;

            analysisMessage += `⚠️ RISK WARNING: Trading carries significant risk. For info only.`;

            req.body.message = analysisMessage;
            console.log('Analysis message prepared');
          } catch (error) {
            console.error('Analysis error:', error);
            req.body.message = `${message}\nError: Unable to complete analysis for ${coin}. ${error.message}`;
          }
        }
      }
    }

    const systemMessage = sessionId.startsWith('chain_') ? 
      CORDCHAIN_SYSTEM_MESSAGE : 
      CORDAI_SYSTEM_MESSAGE;

    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, {
        messages: [systemMessage],
        lastAccessed: Date.now()
      });
    }
    
    const conversation = conversations.get(sessionId);
    conversation.lastAccessed = Date.now();
    
    conversation.messages.push({ role: "user", content: req.body.message });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: conversation.messages,
      temperature: 0.7,
      max_tokens: 4096,
      presence_penalty: 0.6,
      frequency_penalty: 0.5,
      stream: false,
      stop: null
    });
    
    if (!completion || !completion.choices || !completion.choices[0]) {
      throw new Error('Invalid response from OpenAI');
    }

    const aiResponse = completion.choices[0].message;
    conversation.messages.push(aiResponse);
    
    if (conversation.messages.length > 10) {
      conversation.messages = [
        systemMessage,
        ...conversation.messages.slice(-9)
      ];
    }
    
    res.json({ 
      response: aiResponse.content,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Chat Error',
      details: error.message
    });
  }
});

app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    error: 'Server Error',
    details: 'An unexpected error occurred'
  });
});

// Function to start server with port fallback
const startServer = async () => {
  let currentPort = port;
  let server;
  
  while (currentPort < port + 10) {
    try {
      server = app.listen(currentPort);
      console.log(`Server running on port ${currentPort}`);
      break;
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${currentPort} is in use, trying ${currentPort + 1}`);
        currentPort++;
      } else {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    }
  }

  if (!server) {
    console.error('Could not find an available port');
    process.exit(1);
  }

  server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
  });

  return server;
};

// Start the server based on environment
if (process.env.VERCEL) {
  // Running on Vercel, don't need to listen on a port
  module.exports = app;
} else {
  // Local development
  startServer();
}