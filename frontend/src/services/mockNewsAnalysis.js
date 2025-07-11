// src/services/mockNewsAnalysis.js

// Configuration constants
const FINANCE_TERMS = [
  'finance', 'stock-market', 'trading', 'business', 'money',
  'investing', 'wall-street', 'economy', 'banking', 'currency',
  'stocks', 'bull-market', 'bear-market', 'crypto', 'bitcoin'
];

const COMPANY_SPECIFIC_TERMS = {
  IBM: ['ai', 'server', 'mainframe', 'quantum-computer', 'data-center', 'cloud-computing'],
  AAPL: ['iphone', 'macbook', 'apple-store', 'ipad', 'airpods', 'apple-park'],
  MSFT: ['microsoft', 'windows', 'xbox', 'surface-pro', 'azure-cloud'],
  TSLA: ['tesla', 'elon-musk', 'cybertruck', 'model-3', 'gigafactory', 'electric-car'],
  AMZN: ['amazon', 'jeff-bezos', 'warehouse', 'delivery-drone', 'amazon-go', 'kindle'],
  GOOGL: ['google', 'googleplex', 'pixel-phone', 'android', 'chrome'],
  META: ['facebook', 'mark-zuckerberg', 'vr-headset', 'metaverse', 'instagram'],
  NFLX: ['netflix', 'stranger-things', 'tv-show', 'movie-theater', 'film'],
  NVDA: ['nvidia', 'gpu', 'graphics-card', 'ai-chip', 'deep-learning'],
};

/**
 * Gets random stock-related images from Unsplash
 * @param {string} symbol - Stock ticker symbol
 * @param {number} index - Item index in the array
 * @returns {string|null} Image URL or null
 */
const getRandomImage = (symbol, index) => {
  // 25% chance of no image for realism
  if (Math.random() < 0.25) return null;

  // Get relevant terms for the symbol or default to general finance terms
  const terms = COMPANY_SPECIFIC_TERMS[symbol] || FINANCE_TERMS;
  
  // Randomly select 1-2 terms to combine
  const selectedTerms = [];
  const termCount = Math.random() > 0.7 ? 2 : 1;
  for (let i = 0; i < termCount; i++) {
    const randomTerm = terms[Math.floor(Math.random() * terms.length)];
    if (!selectedTerms.includes(randomTerm)) {
      selectedTerms.push(randomTerm);
    }
  }

  // Add the company name/symbol for relevance (60% chance)
  if (Math.random() > 0.4) {
    selectedTerms.push(symbol.toLowerCase());
  }

  // Generate different aspect ratios
  const aspectRatios = ['16x9', '4x3', '1x1', '3x2'];
  const ratio = aspectRatios[Math.floor(Math.random() * aspectRatios.length)];
  
  // Use index and random seed for variety
  const seed = Math.floor(Math.random() * 1000);

  return `https://source.unsplash.com/random/800x450/?${selectedTerms.join(',')}&sig=${seed + index}`;
};

export const generateMockNewsAnalysis = (symbol = 'IBM') => {
  const sentiments = ['positive', 'neutral', 'negative'];
  const sources = [
    { name: 'Bloomberg', reliability: 90 },
    { name: 'Reuters', reliability: 95 },
    { name: 'CNBC', reliability: 85 },
    { name: 'Wall Street Journal', reliability: 92 },
    { name: 'Financial Times', reliability: 93 },
    { name: 'The Economist', reliability: 94 },
    { name: 'Barron\'s', reliability: 88 },
    { name: 'MarketWatch', reliability: 82 }
  ];

  const mockNews = Array.from({ length: 12 }, (_, i) => {
    const sentiment = sentiments[i % sentiments.length];
    const source = sources[i % sources.length];
    const confidence = (0.7 + Math.random() * 0.3).toFixed(2); // 70-100% confidence
    
    return {
      url: `https://${source.name.toLowerCase().replace(/\s+/g, '')}.com/news/${symbol.toLowerCase()}-${Date.now()}-${i}`,
      title: `${symbol} ${generateHeadline(sentiment)}`,
      summary: generateSummary(symbol, sentiment),
      source: source.name,
      source_reliability: source.reliability,
      published_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      sentiment,
      confidence: parseFloat(confidence),
      key_phrases: generateKeyPhrases(symbol, sentiment),
      banner_image_url: getRandomImage(symbol, i)
    };
  });

  return {
    news: mockNews,
    symbol,
    last_updated: new Date().toISOString(),
    analysis_metadata: {
      total_articles: mockNews.length,
      positive_count: mockNews.filter(n => n.sentiment === 'positive').length,
      neutral_count: mockNews.filter(n => n.sentiment === 'neutral').length,
      negative_count: mockNews.filter(n => n.sentiment === 'negative').length,
      avg_confidence: parseFloat((mockNews.reduce((sum, n) => sum + n.confidence, 0) / mockNews.length).toFixed(2))
    }
  };
};

const generateHeadline = (sentiment) => {
  const headlines = {
    positive: [
      'Reports Strong Earnings Growth',
      'Announces Breakthrough Innovation',
      'Shares Surge on Positive Outlook',
      'Expands Market Share in Key Sector',
      'Launches Game-Changing Product',
      'Receives Industry Recognition'
    ],
    neutral: [
      'Holds Annual Shareholder Meeting',
      'CEO Discusses Company Strategy',
      'Releases Quarterly Financial Report',
      'Announces New Board Member',
      'Hosts Investor Day Conference',
      'Provides Market Update'
    ],
    negative: [
      'Faces Regulatory Challenges',
      'Shares Drop on Weak Guidance',
      'Reports Lower Than Expected Revenue',
      'Under Investigation by Authorities',
      'Cuts Annual Forecast',
      'Experiences Supply Chain Disruptions'
    ]
  };

  return headlines[sentiment][Math.floor(Math.random() * headlines[sentiment].length)];
};

const generateSummary = (symbol, sentiment) => {
  const summaries = {
    positive: [
      `${symbol} continues to demonstrate strong performance in its core markets, with analysts predicting sustained growth through the next fiscal year. The company's innovative approach has been well-received by investors.`,
      `Investors are bullish on ${symbol} following its latest announcement which industry experts say could disrupt the market. Several analysts have raised their price targets in response.`,
      `${symbol}'s strategic initiatives are paying off, with recent metrics showing significant improvement in both market share and profit margins compared to industry peers.`
    ],
    neutral: [
      `${symbol} held its quarterly earnings call today, presenting results that were largely in line with market expectations. Management provided updates on ongoing initiatives but offered few surprises.`,
      `The company announced several organizational changes that analysts say reflect standard business operations. Market reaction was muted as investors digest the implications.`,
      `${symbol}'s latest financial report shows steady performance with no major surprises. The stock traded within its normal range following the announcement.`
    ],
    negative: [
      `${symbol} shares fell sharply today after reporting weaker than expected results, raising concerns among investors about the company's near-term prospects. Several analysts downgraded their ratings.`,
      `The company faces mounting challenges in its key markets, with some analysts suggesting a fundamental reassessment of the business may be needed. Investor confidence appears shaken.`,
      `${symbol}'s latest regulatory filing revealed unexpected headwinds that could impact future performance. Management acknowledged the challenges but provided few concrete solutions.`
    ]
  };

  return summaries[sentiment][Math.floor(Math.random() * summaries[sentiment].length)];
};

const generateKeyPhrases = (symbol, sentiment) => {
  const phrases = {
    positive: [
      'strong earnings',
      'market leadership',
      'innovation',
      'growth potential',
      'competitive advantage',
      'shareholder value',
      'upside potential',
      'sector outperformance'
    ],
    neutral: [
      'quarterly results',
      'market trends',
      'business strategy',
      'industry standards',
      'financial reporting',
      'corporate governance',
      'operational metrics',
      'guidance update'
    ],
    negative: [
      'regulatory challenges',
      'market volatility',
      'earnings miss',
      'cost pressures',
      'competitive threats',
      'management changes',
      'downside risk',
      'margin compression'
    ]
  };

  const basePhrases = [
    symbol,
    'stock market',
    'investment',
    'financial performance',
    'equity research',
    'trading volume'
  ];

  // Combine and shuffle phrases
  return [...basePhrases, ...phrases[sentiment]]
    .sort(() => 0.5 - Math.random())
    .slice(0, 5 + Math.floor(Math.random() * 3));
};

export const fetchMockNewsAnalysis = async (symbol) => {
  return new Promise(resolve => {
    // Simulate network delay (300-800ms)
    const delay = 300 + Math.floor(Math.random() * 500);
    
    setTimeout(() => {
      const result = generateMockNewsAnalysis(symbol);
      
      if (import.meta.env.DEV) {
        console.groupCollapsed(`[Mock API] Generated news analysis for ${symbol}`);
        console.log('Sample news items:', result.news.slice(0, 3));
        console.log('Analysis metadata:', result.analysis_metadata);
        console.groupEnd();
      }
      
      resolve(result);
    }, delay);
  });
};