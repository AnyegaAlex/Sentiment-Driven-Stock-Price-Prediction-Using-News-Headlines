// src/services/mockStockAnalysis.js
export const generateMockStockAnalysis = (symbol = 'IBM', riskType = 'medium', holdTime = 'medium-term') => {
  // Base price with some randomness
  const basePrice = 100 + (Math.random() * 50 - 25);
  
  // Generate realistic technical indicators
  const rsi = 40 + Math.random() * 40; // RSI between 40-80
  const sma50 = basePrice * (0.98 + Math.random() * 0.04);
  const sma200 = basePrice * (0.95 + Math.random() * 0.1);
  
  // Determine recommendation based on technicals
  let recommendation;
  if (rsi > 70 && basePrice > sma50 && sma50 > sma200) {
    recommendation = 'SELL';
  } else if (rsi < 30 && basePrice < sma50 && sma50 < sma200) {
    recommendation = 'BUY';
  } else {
    recommendation = 'HOLD';
  }

  // Generate price targets with reasonable ranges
  const bullishTarget = basePrice * (1.1 + Math.random() * 0.1);
  const bearishTarget = basePrice * (0.9 - Math.random() * 0.1);
  
  // Generate sentiment (-1 to 1 scale)
  const sentiment = Math.min(1, Math.max(-1, (Math.random() * 2 - 1)));
  
  // Generate confidence (0.7 to 0.95)
  const confidence = 0.7 + Math.random() * 0.25;
  
  // Key factors based on risk type and hold time
  const keyFactors = generateKeyFactors(symbol, riskType, holdTime);

  return {
    company: `${symbol} Corporation`,
    symbol,
    lastUpdated: new Date().toISOString(),
    recommendation,
    confidence,
    sentiment,
    technicalIndicators: {
      currentPrice: basePrice,
      rsi,
      sma50,
      sma200,
      support: basePrice * 0.95,
      resistance: basePrice * 1.05,
      volume: Math.floor(1000000 + Math.random() * 5000000)
    },
    priceTargets: {
      base: basePrice,
      bullish: bullishTarget,
      bearish: bearishTarget,
      consensus: basePrice * (1 + (Math.random() * 0.1 - 0.05))
    },
    keyFactors,
    riskAssessment: {
      level: riskType,
      description: `This ${riskType}-risk stock is suitable for ${holdTime} investors`
    }
  };
};

const generateKeyFactors = (symbol, riskType, holdTime) => {
  const factors = {
    IBM: [
      {
        title: 'Cloud Revenue Growth',
        description: 'IBM continues to show strong growth in hybrid cloud revenue',
        impact: 'positive'
      },
      {
        title: 'Quantum Computing',
        description: 'Leadership in quantum computing provides long-term advantage',
        impact: 'positive'
      },
      {
        title: 'Legacy Systems',
        description: 'Still carries significant legacy systems business',
        impact: 'negative'
      }
    ],
    AAPL: [
      {
        title: 'iPhone Sales',
        description: 'Strong iPhone 15 sales exceeding expectations',
        impact: 'positive'
      },
      {
        title: 'Services Growth',
        description: 'Services segment continues double-digit growth',
        impact: 'positive'
      },
      {
        title: 'China Exposure',
        description: 'Significant revenue exposure to Chinese market',
        impact: riskType === 'high' ? 'negative' : 'neutral'
      }
    ],
    // Add more symbols as needed
    default: [
      {
        title: 'Market Position',
        description: 'Strong competitive position in core markets',
        impact: 'positive'
      },
      {
        title: 'Valuation',
        description: `Current valuation appears ${Math.random() > 0.5 ? 'attractive' : 'stretched'}`,
        impact: Math.random() > 0.5 ? 'positive' : 'negative'
      },
      {
        title: `${holdTime} Outlook`,
        description: `Analysts are ${Math.random() > 0.5 ? 'bullish' : 'cautious'} on ${holdTime} prospects`,
        impact: 'neutral'
      }
    ]
  };

  return factors[symbol] || factors.default;
};

export const fetchMockStockAnalysis = async (symbol, riskType, holdTime) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(generateMockStockAnalysis(symbol, riskType, holdTime));
    }, 500); // Simulate network delay
  });
};